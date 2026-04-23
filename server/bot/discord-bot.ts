import { Client, GatewayIntentBits, Events, REST, Routes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, GuildMember, TextChannel, ChannelType, PermissionFlagsBits } from 'discord.js';
import { registerCommands } from './commands';
import { storage } from '../storage';
import { getCustomerRank, applyCustomerDiscount, getCustomerDiscount, formatGPAmount, getRankProgress, CUSTOMER_RANKS } from "@shared/ranks";
import { createServicesEmbed, createServicesSelectMenu, createServiceOptionsEmbed, createServiceOptionsSelectMenu, createCalculatorEmbed, createCalculatorComponents, createServiceSelectionEmbed, createServiceSelectionComponents, createCalculationResultEmbed, createSkillCalculatorEmbed, createQuestCalculatorEmbed, createMultiQuestCalculatorEmbed } from './embeds';
import { createSpecialOffersEmbed, createSingleOfferEmbed, createOffersSelectMenu, createOfferActionButtons } from './offers-embeds';

let client: Client;
let botStatus = {
  isOnline: false,
  uptime: 0,
  lastRestart: new Date(),
  commandsRegistered: 0,
  serversCount: 0
};

// Vouch channel configuration - set this to your desired vouch channel ID
const VOUCH_CHANNEL_ID = process.env.VOUCH_CHANNEL_ID || '1414374874809368656'; // Your vouch channel ID

// Withdrawal notification channel - where milestone notifications are sent
const WITHDRAWAL_NOTIFICATION_CHANNEL_ID = process.env.WITHDRAWAL_NOTIFICATION_CHANNEL_ID || '1449760619292131398';

/**
 * Notify worker when they reach balance milestones
 * Sends a message to the withdrawal notification channel when balance reaches 400M, 800M, 1.2B, etc.
 */
async function notifyMilestoneReached(client: Client, userId: string, previousBalance: number, newBalance: number, username: string): Promise<void> {
  try {
    // Define milestone thresholds: 400M, 800M, 1.2B, 1.6B, 2B, 2.4B, 2.8B, etc.
    const milestones = [400_000_000, 800_000_000, 1_200_000_000, 1_600_000_000, 2_000_000_000, 2_400_000_000, 2_800_000_000];
    
    // Find which milestones were crossed
    const milestoneCrossed = milestones.find(milestone => 
      previousBalance < milestone && newBalance >= milestone
    );
    
    if (milestoneCrossed) {
      console.log(`✅ Milestone threshold crossed for ${username}! Balance reached ${formatGPAmount(milestoneCrossed)}`);
      
      // Get the withdrawal notification channel
      console.log(`📢 Looking for channel ${WITHDRAWAL_NOTIFICATION_CHANNEL_ID}...`);
      let notifChannel = client.channels.cache.get(WITHDRAWAL_NOTIFICATION_CHANNEL_ID);
      console.log(`  → Cache result: ${notifChannel ? 'Found in cache' : 'Not in cache, fetching...'}`);
      
      if (!notifChannel) {
        notifChannel = await client.channels.fetch(WITHDRAWAL_NOTIFICATION_CHANNEL_ID).catch((err) => {
          console.error(`  → Failed to fetch channel: ${err}`);
          return null;
        });
      }
      
      console.log(`  → Channel found: ${notifChannel ? 'Yes' : 'No'}`);
      console.log(`  → Is text-based: ${notifChannel && notifChannel.isTextBased() ? 'Yes' : 'No'}`);
      
      if (notifChannel && notifChannel.isTextBased()) {
        console.log(`  → Sending message to channel...`);
        await notifChannel.send({
          content: `<@${userId}>`,
          embeds: [{
            color: 0xFFD700, // Gold color
            title: '🎉 **MILESTONE REACHED!** 🎉',
            description: `@Dragon Services worker **${username}** has reached **${formatGPAmount(milestoneCrossed)}** balance! 🏆`,
            fields: [
              {
                name: '💰 Action Required',
                value: `Please send them their money and don't forget to remove balance\n\n**Current Balance:** ${formatGPAmount(newBalance)} GP in worker wallet! 💎`,
                inline: false
              }
            ],
            footer: {
              text: '🐲 Dragon Services • Keep up the great work!',
              iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
            },
            timestamp: new Date().toISOString()
          }]
        });
        console.log(`✅ Milestone notification sent to ${username} in withdrawal channel for reaching ${formatGPAmount(milestoneCrossed)}`);
      } else {
        console.error(`⚠️  Withdrawal notification channel ${WITHDRAWAL_NOTIFICATION_CHANNEL_ID} not found or not a text channel`);
      }
    } else {
      console.log(`🔍 No milestone crossed for ${username}: prev=${formatGPAmount(previousBalance)}, new=${formatGPAmount(newBalance)}`);
    }
  } catch (error) {
    console.error('⚠️  Failed to send milestone notification:', (error as Error).message, error);
    // Don't fail the wallet operation
  }
}

/**
 * Update Discord roles based on customer rank
 * Automatically assigns the appropriate VIP rank role and removes old ones
 * Gracefully handles errors without failing the calling operation
 */
async function updateCustomerRankRole(member: GuildMember, totalSpentGp: number, manualRank?: string | null): Promise<boolean> {
  try {
    const currentRank = getCustomerRank(totalSpentGp, manualRank);
    
    // Get all rank role IDs
    const allRankRoleIds = CUSTOMER_RANKS.map(r => r.roleId);
    
    // Remove all rank roles first (with error handling for each role)
    for (const roleId of allRankRoleIds) {
      if (member.roles.cache.has(roleId)) {
        try {
          await member.roles.remove(roleId);
          console.log(`  ❌ Removed old rank role ${roleId} from ${member.user.username}`);
        } catch (removeError) {
          console.error(`  ⚠️  Failed to remove role ${roleId}:`, removeError);
          // Continue trying to remove other roles
        }
      }
    }
    
    // Add the appropriate rank role if customer has earned one
    if (currentRank) {
      try {
        await member.roles.add(currentRank.roleId);
        console.log(`  ✅ Assigned ${currentRank.emoji} ${currentRank.name} rank role to ${member.user.username}`);
      } catch (addError) {
        console.error(`  ⚠️  Failed to add role ${currentRank.roleId}:`, addError);
        throw addError; // Throw to be caught by outer catch
      }
    } else {
      console.log(`  ℹ️  ${member.user.username} has no rank yet (${formatGPAmount(totalSpentGp)} spent, needs ${formatGPAmount(100_000_000)})`);
    }
    
    return true; // Success
  } catch (error) {
    console.error('⚠️  Failed to update customer rank role:', error);
    console.error(`  → User: ${member.user.username} (${member.user.id})`);
    console.error(`  → Total Spent: ${formatGPAmount(totalSpentGp)} GP`);
    console.error(`  → Manual Rank: ${manualRank || 'none'}`);
    // Don't throw - log error and return false to indicate failure
    return false;
  }
}

/**
 * Parse GP amount with support for M (millions) and B (billions) notation
 * Examples: "200m" = 200M, "1b" = 1000M, "2.5b" = 2500M, "1.2b" = 1200M
 * @param amountInput - The input string (e.g., "200m", "1b", "2.5b")
 * @returns Object with amountInM (millions) and formatted display string
 */
function parseGpAmount(amountInput: string): { amountInM: number; displayText: string } | null {
  const input = amountInput.toLowerCase().trim();
  
  // Check for B (billions) notation
  if (input.endsWith('b')) {
    const billions = parseFloat(input.replace(/b$/, ''));
    if (isNaN(billions) || billions <= 0) return null;
    
    const millions = billions * 1000; // 1b = 1000m
    return {
      amountInM: millions,
      displayText: `${billions}B GP (${millions.toFixed(0)}M GP)`
    };
  }
  
  // Check for M (millions) notation
  if (input.endsWith('m')) {
    const millions = parseFloat(input.replace(/m$/, ''));
    if (isNaN(millions) || millions <= 0) return null;
    
    return {
      amountInM: millions,
      displayText: `${millions}M GP`
    };
  }
  
  // If no suffix, treat as millions
  const millions = parseFloat(input);
  if (isNaN(millions) || millions <= 0) return null;
  
  return {
    amountInM: millions,
    displayText: `${millions}M GP`
  };
}

export function getBotStatus() {
  if (client) {
    botStatus.uptime = client.uptime || 0;
    botStatus.serversCount = client.guilds.cache.size;
  }
  return botStatus;
}

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  
  if (!token) {
    console.error('DISCORD_BOT_TOKEN environment variable is required');
    return;
  }

  // Skip bot in development mode unless explicitly enabled (BOT_ENABLED=true)
  // On VPS/production: set NODE_ENV=production or BOT_ENABLED=true to run the bot
  if (process.env.NODE_ENV === 'development' && process.env.BOT_ENABLED !== 'true') {
    console.log('Skipping Discord bot in development mode - set BOT_ENABLED=true to enable');
    return;
  }

  try {
    if (client) {
      console.log('Destroying previous Discord client to prevent duplicate handlers...');
      try {
        client.removeAllListeners();
        await client.destroy();
      } catch (e) {
        console.log('Previous client cleanup error (safe to ignore):', e);
      }
    }

    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    // Bot ready event
    client.once(Events.ClientReady, async (readyClient) => {
      console.log(`Discord bot ready! Logged in as ${readyClient.user.tag}`);
      botStatus.isOnline = true;
      botStatus.lastRestart = new Date();
      
      // Load Dink webhook channel from database
      await loadDinkChannelFromDatabase();
      
      // Register slash commands
      await registerSlashCommands(readyClient.user.id);
      

    });

    // Handle interactions
    client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
      } else if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
      }
    });

    // Handle message commands
    client.on(Events.MessageCreate, async (message) => {
      // Check if this is a Dink webhook message that needs forwarding
      if (message.author.bot) {
        await handleDinkWebhookMessage(message);
        return;
      }
      
      if (message.content === '!pricing') {
        await handlePricingCommand(message);
      } else if (message.content === '!calculator') {
        await handleCalculatorCommand(message);
      } else if (message.content.startsWith('!s ')) {
        await handleSkillCalculatorCommand(message);
      } else if (message.content.startsWith('!q ')) {
        await handleQuestCalculatorCommand(message);
      } else if (message.content.startsWith('!wallet') || message.content.startsWith('!balance')) {
    await handleWalletCommand(message);
  } else if (message.content.startsWith('!checkwallet')) {
    await handleCheckWalletCommand(message);
  } else if (message.content.startsWith('!deposit')) {
    await handleDepositCommand(message);
  } else if (message.content.startsWith('!delete')) {
    await handleRemoveCommand(message);
  } else if (message.content.startsWith('!offer')) {
        await handleOfferCommand(message);
      } else if (message.content.startsWith('!editspent')) {
        await handleEditSpentCommand(message);
      } else if (message.content.startsWith('!editdeposit')) {
        await handleEditDepositCommand(message);
      } else if (message.content.startsWith('!editlockdeposit')) {
        await handleEditLockDepositCommand(message);
      } else if (message.content.startsWith('!vouch ')) {
        await handleVouchCommand(message);
      } else if (message.content.startsWith('!vouches')) {
        await handleVouchesCommand(message);
      } else if (message.content.startsWith('!leavevouch ')) {
        await handleLeaveVouchCommand(message);
      } else if (message.content.startsWith('!worker ')) {
        await handleWorkerCommand(message);
      } else if (message.content.startsWith('!removeworker ')) {
        await handleRemoveWorkerCommand(message);
      } else if (message.content.startsWith('!rates')) {
        await handleRatesCommand(message);
      } else if (message.content.startsWith('!payment')) {
        await handlePaymentCommand(message);
      } else if (message.content.startsWith('!sythevouch ')) {
        await handleSytheVouchCommand(message);
      } else if (message.content.startsWith('!buy')) {
        await handleRspsBuyCommand(message);
      } else if (message.content.startsWith('!sell')) {
        await handleRspsSellCommand(message);
      } else if (message.content.startsWith('!send ')) {
        await handleSendCommand(message);
      }
    });

    // Error handling
    client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });

    // Login to Discord
    await client.login(token);

  } catch (error) {
    console.error('Failed to start Discord bot:', error);
    botStatus.isOnline = false;
  }
}

async function registerSlashCommands(clientId: string) {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const rest = new REST({ version: '10' }).setToken(token);

  const commands = await registerCommands();
  botStatus.commandsRegistered = commands.length;

  try {
    console.log(`Registering ${commands.length} application commands globally...`);
    console.log('Commands to register:', commands.map((cmd: any) => cmd.name).join(', '));

    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log(`Successfully registered ${(data as any[]).length} application commands globally`);
    console.log('Registered commands:', (data as any[]).map((cmd: any) => cmd.name).join(', '));
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

async function handleSlashCommand(interaction: any) {
  const { commandName } = interaction;

  if (commandName === 'dragon-services') {
    try {
      // Update command usage
      storage.updateCommandUsage('dragon-services').catch(() => {});
      
      // Get services from storage
      const services = await storage.getServices();
      
      // Create the embed and select menu
      const embed = createServicesEmbed();
      const selectMenu = createServicesSelectMenu(services);

      await interaction.reply({
        embeds: [embed],
        components: [selectMenu],
        ephemeral: false
      });

    } catch (error) {
      console.error('Error handling dragon-services command:', error);
      await interaction.reply({
        content: 'An error occurred while loading the services menu.',
        ephemeral: true
      });
    }
  } else if (commandName === 'calculator') {
    try {
      // Update command usage
      storage.updateCommandUsage('calculator').catch(() => {});
      
      const embed = createCalculatorEmbed();
      const components = createCalculatorComponents();

      await interaction.reply({
        embeds: [embed],
        components: components,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error handling calculator command:', error);
      await interaction.reply({
        content: 'An error occurred while loading the calculator.',
        ephemeral: true
      });
    }
  } else if (commandName === 'deals') {
    await handleDealsCommand(interaction);
  } else if (commandName === 'order') {
    await handleOrderCommand(interaction);
  } else if (commandName === 'my-orders') {
    await handleMyOrdersCommand(interaction);
  } else if (commandName === 'order-status') {
    await handleOrderStatusCommand(interaction);
  } else if (commandName === 'complete-order') {
    await handleCompleteOrderCommand(interaction);
  } else if (commandName === 'cancel-order') {
    await handleCancelOrderCommand(interaction);
  } else if (commandName === 'rsn') {
    await handleRsnCommand(interaction);
  } else if (commandName === 'unrsn') {
    await handleUnrsnCommand(interaction);
  } else if (commandName === 'dink-setup') {
    await handleDinkSetupCommand(interaction);
  } else if (commandName === 'set-dink-channel') {
    await handleSetDinkChannelCommand(interaction);
  }
}

async function handlePricingCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('pricing').catch(() => {});
    
    // Get services from storage
    const services = await storage.getServices();
    
    // Create the embed and select menu
    const embed = createServicesEmbed();
    const selectMenu = createServicesSelectMenu(services);

    await message.reply({
      embeds: [embed],
      components: [selectMenu]
    });

  } catch (error) {
    console.error('Error handling !pricing command:', error);
    await message.reply('An error occurred while loading the services menu.');
  }
}

async function handleDealsCommand(interaction: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('deals').catch(() => {});
    
    // Get active special offers from storage
    const offers = await storage.getActiveOffers();
    
    // Create the deals embed
    const embed = createSpecialOffersEmbed(offers);
    const selectMenu = createOffersSelectMenu(offers);

    const components = selectMenu ? [selectMenu] : [];

    await interaction.reply({
      embeds: [embed],
      components: components,
      ephemeral: false
    });

  } catch (error) {
    console.error('Error handling deals command:', error);
    await interaction.reply({
      content: 'An error occurred while loading the special offers.',
      ephemeral: true
    });
  }
}

async function handleOfferCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('offer').catch(() => {});
    
    // Parse command: !offer [type/ID] or just !offer
    const args = message.content.split(' ');
    const param = args[1];

    if (param && param !== '') {
      // Check if it's an offer type (flash, weekly, seasonal, limited)
      const offerTypes = ['flash', 'weekly', 'seasonal', 'limited'];
      const isOfferType = offerTypes.includes(param.toLowerCase());

      if (isOfferType) {
        // Show offers of specific type
        const allOffers = await storage.getActiveOffers();
        const filteredOffers = allOffers.filter(offer => offer.offerType.toLowerCase() === param.toLowerCase());
        
        if (filteredOffers.length === 0) {
          const typeEmojis = {
            'flash': '⚡',
            'weekly': '📅', 
            'seasonal': '🎄',
            'limited': '🔥'
          };
          const emoji = typeEmojis[param.toLowerCase() as keyof typeof typeEmojis] || '💎';
          await message.reply(`${emoji} No active **${param.toUpperCase()}** offers available right now! Check back soon for amazing ${param} deals!`);
          return;
        }

        // Create embed for specific offer type
        const embed = createSpecialOffersEmbed(filteredOffers);
        embed.setTitle(`${getOfferTypeEmoji(param)} ${param.toUpperCase()} OFFERS - Dragon Services`);
        const selectMenu = createOffersSelectMenu(filteredOffers);

        const components = selectMenu ? [selectMenu] : [];

        await message.reply({
          content: '@everyone',
          embeds: [embed],
          components: components
        });

      } else {
        // Try to find offer by ID
        const offer = await storage.getSpecialOffer(param);
        if (!offer) {
          await message.reply('❌ Offer not found! Use `!offer` to see all offers, or try:\n' +
                             '• `!offer flash` - Flash sales\n' +
                             '• `!offer weekly` - Weekly deals\n' +
                             '• `!offer seasonal` - Seasonal offers\n' +
                             '• `!offer limited` - Limited time offers');
          return;
        }

        if (!offer.isActive) {
          await message.reply('❌ This offer is no longer active! Use `!offer` to see current offers.');
          return;
        }

        // Create single offer embed with countdown
        const embed = createSingleOfferEmbed(offer);
        const buttons = createOfferActionButtons(offer);

        await message.reply({
          content: '@everyone',
          embeds: [embed],
          components: [buttons]
        });
      }

    } else {
      // Show all active offers
      const offers = await storage.getActiveOffers();
      
      if (offers.length === 0) {
        await message.reply('📢 No special offers available right now! Check back soon for amazing deals!');
        return;
      }

      // Create the deals embed with countdown timers
      const embed = createSpecialOffersEmbed(offers);
      const selectMenu = createOffersSelectMenu(offers);

      const components = selectMenu ? [selectMenu] : [];

      await message.reply({
        content: '@everyone',
        embeds: [embed],
        components: components
      });
    }

  } catch (error) {
    console.error('Error handling !offer command:', error);
    await message.reply('❌ An error occurred while loading offers. Please try again later.');
  }
}

// Handle !rates command - Display OSRS GP buying and selling rates
async function handleRatesCommand(message: any) {
  try {
    const buyingMethods = await storage.getBuyingMethods();
    const sellingMethods = await storage.getSellingMethods();

    // Separate crypto and non-crypto for buying
    const cryptoBuying = buyingMethods.filter(m => m.methodType === 'crypto');
    const nonCryptoBuying = buyingMethods.filter(m => m.methodType === 'non_crypto');

    // Build the buying methods text with Dragon styling
    let buyingText = '';

    if (cryptoBuying.length > 0) {
      buyingText += '**• Cryptocurrencies:**\n';
      cryptoBuying.forEach(method => {
        buyingText += `${method.icon || '🔸'} **${method.methodName}** : **$${method.buyingRate}/M**\n`;
      });
    }

    if (nonCryptoBuying.length > 0) {
      buyingText += '\n**• Non Cryptocurrencies:**\n';
      nonCryptoBuying.forEach(method => {
        buyingText += `${method.icon || '💵'} **${method.methodName}** : **$${method.buyingRate}/M**\n`;
      });
    }

    // Build the selling methods text (only crypto/USDT available)
    let sellingText = '';
    if (sellingMethods.length > 0) {
      const sellingRate = sellingMethods[0].sellingRate;
      sellingText = `🐉 **All Methods** : **$${sellingRate}/M**`;
    }

    // Show current time when command is used
    const lastUpdated = new Date();

    const embed = new EmbedBuilder()
      .setTitle('💰 OSRS GP Rates')
      .setDescription('Current buying & selling rates')
      .setColor(0xFF6B35)
      .addFields([
        {
          name: '📥 Buying',
          value: buyingText || 'None available',
          inline: false
        },
        {
          name: '📤 Selling',
          value: sellingText || 'None available',
          inline: false
        }
      ])
      .setFooter({ 
        text: '🐲 Dragon Services • Updated just now',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();

    await message.reply({
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error handling !rates command:', error);
    await message.reply('❌ An error occurred while loading GP rates. Please try again later.');
  }
}

// Handle !buy <amount> - Customer is buying GP from us → show our SELL rates
async function handleGpBuyRates(message: any, amountM: number, displayAmount: string) {
  try {
    const sellingMethods = await storage.getSellingMethods();

    if (!sellingMethods || sellingMethods.length === 0) {
      await message.reply('❌ No sell rates configured. Please contact staff.');
      return;
    }

    let ratesText = '';
    sellingMethods.forEach(method => {
      if (method.sellingRate) {
        const rate = parseFloat(method.sellingRate.toString());
        const total = (amountM * rate).toFixed(2);
        ratesText += `${method.icon || '💱'} **${method.methodName}** — $${rate}/M → **$${total}**\n`;
      }
    });

    const embed = new EmbedBuilder()
      .setTitle(`📥 Buying ${displayAmount} OSRS GP`)
      .setDescription(`Here's what you'll pay for **${displayAmount}**:\n\n${ratesText || 'No rates available'}`)
      .setColor(0x57F287)
      .setFooter({
        text: '🐲 Dragon Services | Create a ticket to order',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error handling !buy GP rates:', error);
    await message.reply('❌ An error occurred. Please try again.');
  }
}

// Handle !sell <amount> - Customer is selling GP to us → show our BUY rates
async function handleGpSellRates(message: any, amountM: number, displayAmount: string) {
  try {
    const buyingMethods = await storage.getBuyingMethods();

    if (!buyingMethods || buyingMethods.length === 0) {
      await message.reply('❌ No buy rates configured. Please contact staff.');
      return;
    }

    const cryptoMethods = buyingMethods.filter(m => m.methodType === 'crypto');
    const nonCryptoMethods = buyingMethods.filter(m => m.methodType === 'non_crypto');

    let ratesText = '';
    if (cryptoMethods.length > 0) {
      ratesText += '**🪙 Crypto:**\n';
      cryptoMethods.forEach(method => {
        if (method.buyingRate) {
          const rate = parseFloat(method.buyingRate.toString());
          const total = (amountM * rate).toFixed(2);
          ratesText += `${method.icon || '💱'} **${method.methodName}** — $${rate}/M → **$${total}**\n`;
        }
      });
    }
    if (nonCryptoMethods.length > 0) {
      ratesText += '\n**💳 Other Methods:**\n';
      nonCryptoMethods.forEach(method => {
        if (method.buyingRate) {
          const rate = parseFloat(method.buyingRate.toString());
          const total = (amountM * rate).toFixed(2);
          ratesText += `${method.icon || '💱'} **${method.methodName}** — $${rate}/M → **$${total}**\n`;
        }
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📤 Selling ${displayAmount} OSRS GP`)
      .setDescription(`Here's what you'll receive for **${displayAmount}**:\n\n${ratesText || 'No rates available'}`)
      .setColor(0xED4245)
      .setFooter({
        text: '🐲 Dragon Services | Create a ticket to sell',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error handling !sell GP rates:', error);
    await message.reply('❌ An error occurred. Please try again.');
  }
}

// Handle !payment command - Display payment methods with dropdown
async function handlePaymentCommand(message: any) {
  try {
    storage.updateCommandUsage('payment').catch(() => {});
    
    const paymentMethods = await storage.getActivePaymentMethods();
    
    if (paymentMethods.length === 0) {
      await message.reply('❌ No payment methods are currently available. Please contact staff.');
      return;
    }

    // Group payment methods by type
    const cryptoMethods = paymentMethods.filter(m => m.type === 'crypto');
    const fiatMethods = paymentMethods.filter(m => m.type === 'fiat');
    const otherMethods = paymentMethods.filter(m => m.type !== 'crypto' && m.type !== 'fiat');

    // Create options for select menu
    const selectOptions = paymentMethods.map(method => {
      const emoji = method.type === 'crypto' ? '🪙' : method.type === 'fiat' ? '💳' : '💰';
      return new StringSelectMenuOptionBuilder()
        .setLabel(method.displayName)
        .setDescription(method.description || `Pay via ${method.displayName}`)
        .setValue(method.id)
        .setEmoji(emoji);
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('payment_method_select')
      .setPlaceholder('🔽 Select a payment method')
      .addOptions(selectOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    // Create initial embed
    const embed = new EmbedBuilder()
      .setTitle('💳 Payment Methods')
      .setDescription('**Select a payment method below** to view the address/email/ID.\n\nChoose from our available options:')
      .setColor(0xFF6B35)
      .setFooter({ 
        text: '🐲 Dragon Services • Tap to copy address',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();

    // Add summary fields
    if (cryptoMethods.length > 0) {
      embed.addFields({
        name: '🪙 Cryptocurrency',
        value: cryptoMethods.map(m => `• ${m.displayName}`).join('\n'),
        inline: true
      });
    }
    if (fiatMethods.length > 0) {
      embed.addFields({
        name: '💳 Traditional',
        value: fiatMethods.map(m => `• ${m.displayName}`).join('\n'),
        inline: true
      });
    }
    if (otherMethods.length > 0) {
      embed.addFields({
        name: '💰 Other',
        value: otherMethods.map(m => `• ${m.displayName}`).join('\n'),
        inline: true
      });
    }

    await message.reply({
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    console.error('Error handling !payment command:', error);
    await message.reply('❌ An error occurred while loading payment methods. Please try again later.');
  }
}

const SYTHE_VOUCH_CHANNEL_ID = '1414374807734190102';

// RSPS ticket system - notification channel for buy/sell requests
const RSPS_NOTIFICATION_CHANNEL_ID = '1476608268112760894';

const STAFF_ROLE_IDS = [
  '1414767189600370798', // IRON rank (staff tier)
  '1414767429904633856', // STEEL rank
  '1414767561748516966', // BLACK rank
  '1414767663225245718', // ADAMANT rank
  '1414767795945865237', // RUNE rank
];

async function handleRspsBuyCommand(message: any) {
  try {
    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    const args = message.content.slice('!buy'.length).trim().split(/\s+/);
    const firstArg = args[0] || '';

    // If first arg is a GP amount (e.g. 100M, 1B), show our sell rates (customer buying GP)
    const gpParsed = args.length === 1 ? parseGpAmount(firstArg) : null;
    if (gpParsed !== null) {
      await handleGpBuyRates(message, gpParsed.amountInM, gpParsed.displayText);
      return;
    }

    // Otherwise treat as RSPS ticket
    if (args.length >= 3 && firstArg) {
      const rspsName = firstArg;
      const amount = args[1];
      const paymentMethod = args.slice(2).join(' ');
      await processRspsTicket(message, 'BUYING', rspsName, amount, paymentMethod);
    } else {
      await message.reply({
        content: '📥 **Buy OSRS GP**\n`!buy 100M` or `!buy 1B` — see our rates & total price\n\n🟢 **RSPS Buy Ticket**\n`!buy <RSPS Name> <Amount> <Payment Method>`\nExample: `!buy SpawnPK 500M PayPal`'
      });
    }
  } catch (error) {
    console.error('Error handling !buy command:', error);
    await message.reply('❌ An error occurred. Usage: `!buy 100M` or `!buy <RSPS Name> <Amount> <Method>`');
  }
}

async function handleRspsSellCommand(message: any) {
  try {
    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    const args = message.content.slice('!sell'.length).trim().split(/\s+/);
    const firstArg = args[0] || '';

    // If first arg is a GP amount (e.g. 100M, 1B), show our buy rates (customer selling GP)
    const gpParsed = args.length === 1 ? parseGpAmount(firstArg) : null;
    if (gpParsed !== null) {
      await handleGpSellRates(message, gpParsed.amountInM, gpParsed.displayText);
      return;
    }

    // Otherwise treat as RSPS ticket
    if (args.length >= 3) {
      const rspsName = firstArg;
      const amount = args[1];
      const paymentMethod = args.slice(2).join(' ');
      await processRspsTicket(message, 'SELLING', rspsName, amount, paymentMethod);
    } else {
      await message.reply({
        content: '📤 **Sell OSRS GP**\n`!sell 100M` or `!sell 1B` — see our rates & total price\n\n💰 **RSPS Sell Ticket**\n`!sell <RSPS Name> <Amount> <Payment Method>`\nExample: `!sell SpawnPK 500M PayPal`'
      });
    }
  } catch (error) {
    console.error('Error handling !sell command:', error);
    await message.reply('❌ An error occurred. Usage: `!sell 100M` or `!sell <RSPS Name> <Amount> <Method>`');
  }
}

async function processRspsTicket(message: any, tradeType: 'BUYING' | 'SELLING', rspsName: string, amount: string, paymentMethod: string) {
  try {
    const guild = message.guild;
    const user = message.author;
    const username = user.username;

    const color = tradeType === 'BUYING' ? 0x57F287 : 0xED4245;
    const emoji = tradeType === 'BUYING' ? '🟢' : '🔴';

    // 1. Create a private ticket channel for this trade
    let ticketChannel: TextChannel | null = null;
    try {
      const channelName = `${tradeType.toLowerCase()}-${rspsName.toLowerCase().replace(/\s+/g, '-')}-${username.toLowerCase()}`;
      ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
        ],
      }) as TextChannel;

      // Send welcome message in ticket channel
      const ticketEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} ${tradeType} ${rspsName} GP - Ticket`)
        .setDescription(`Hello <@${user.id}>! Your RSPS trade ticket has been created.\n\nA staff member will assist you shortly.`)
        .addFields(
          { name: '🎮 RSPS', value: rspsName, inline: true },
          { name: '💰 Amount', value: amount.toUpperCase(), inline: true },
          { name: '💳 Payment', value: paymentMethod, inline: true },
          { name: '📋 Type', value: tradeType, inline: true },
        )
        .setFooter({ text: '🐲 Dragon Services • RSPS Trading' })
        .setTimestamp();

      await ticketChannel.send({
        content: `<@${user.id}>`,
        embeds: [ticketEmbed]
      });

    } catch (channelError) {
      console.error('Could not create RSPS ticket channel:', channelError);
    }

    // 2. Post notification to the RSPS notification channel
    try {
      const notifChannel = await message.client.channels.fetch(RSPS_NOTIFICATION_CHANNEL_ID);
      if (notifChannel && notifChannel.isTextBased()) {
        const notifEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`${emoji} ${tradeType} ${rspsName.toUpperCase()} GP`)
          .setDescription(`**${username}** is looking to ${tradeType.toLowerCase()} RSPS gold!`)
          .addFields(
            { name: '🎮 RSPS', value: rspsName, inline: true },
            { name: '💰 Amount', value: amount.toUpperCase(), inline: true },
            { name: '💳 Payment Method', value: paymentMethod, inline: true },
            { name: '👤 Customer', value: `<@${user.id}>`, inline: true },
            { name: '🎫 Ticket', value: ticketChannel ? `<#${ticketChannel.id}>` : 'DM the customer', inline: true },
          )
          .setFooter({ text: '🐲 Dragon Services • RSPS Trading' })
          .setTimestamp();

        await (notifChannel as TextChannel).send({ embeds: [notifEmbed] });
      }
    } catch (notifError) {
      console.error('Could not send RSPS notification:', notifError);
    }

    // 3. Confirm to the user
    const confirmEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`✅ ${tradeType} Ticket Created!`)
      .setDescription(`Your ticket has been created and our team has been notified.`)
      .addFields(
        { name: '🎮 RSPS', value: rspsName, inline: true },
        { name: '💰 Amount', value: amount.toUpperCase(), inline: true },
        { name: '💳 Payment', value: paymentMethod, inline: true },
        { name: '🎫 Your Ticket', value: ticketChannel ? `<#${ticketChannel.id}>` : 'Check your DMs', inline: false },
      )
      .setFooter({ text: '🐲 Dragon Services • Staff will contact you soon!' })
      .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });

  } catch (error) {
    console.error('Error processing RSPS ticket:', error);
    await message.reply('❌ Failed to create ticket. Please try again or contact staff directly.');
  }
}

async function handleSytheVouchCommand(message: any) {
  try {
    // Check if user has admin/staff permissions
    const member = message.member;
    if (!member) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    const isAdmin = member.permissions?.has('Administrator');
    
    // Check for exact staff role names (case-insensitive exact match)
    const hasStaffRole = member.roles?.cache?.some((role: any) => {
      const roleName = role.name.toLowerCase().trim();
      return roleName === 'staff' || 
             roleName === 'admin' || 
             roleName === 'worker' ||
             roleName === 'moderator' ||
             STAFF_ROLE_IDS.includes(role.id);
    });

    if (!isAdmin && !hasStaffRole) {
      await message.reply('❌ You need staff permissions to use this command.');
      return;
    }

    // Parse command: !sythevouch <username> <content>
    const args = message.content.slice('!sythevouch '.length).trim();
    const firstSpaceIndex = args.indexOf(' ');
    
    if (firstSpaceIndex === -1) {
      await message.reply('❌ Usage: `!sythevouch <username> <vouch content>`\nExample: `!sythevouch JohnDoe Great service, fast and reliable!`');
      return;
    }

    const username = args.substring(0, firstSpaceIndex).trim();
    const vouchContent = args.substring(firstSpaceIndex + 1).trim();

    if (!username || !vouchContent) {
      await message.reply('❌ Usage: `!sythevouch <username> <vouch content>`\nExample: `!sythevouch JohnDoe Great service, fast and reliable!`');
      return;
    }

    if (vouchContent.length < 10) {
      await message.reply('❌ Vouch content must be at least 10 characters long.');
      return;
    }

    // Sanitize vouch content - strip @everyone, @here, and mass mentions
    let sanitizedContent = vouchContent
      .replace(/@everyone/gi, '[everyone]')
      .replace(/@here/gi, '[here]')
      .replace(/<@&\d+>/g, '[role]')  // Role mentions
      .replace(/<@!?\d+>/g, '[user]') // User mentions
      .substring(0, 2000);

    // Generate a unique post ID for manual vouches
    const postId = `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create vouch in database
    const newVouch = await storage.createSytheVouch({
      postId,
      authorUsername: username,
      authorProfileUrl: null,
      vouchContent: sanitizedContent,
      postUrl: 'https://www.sythe.org/threads/4326552/osrs-services-vouchers/',
      postedAt: new Date(),
      isPosted: false
    });

    // Get the Sythe vouch channel
    const vouchChannel = await client.channels.fetch(SYTHE_VOUCH_CHANNEL_ID) as TextChannel | null;

    if (!vouchChannel) {
      await message.reply(`❌ Could not find Sythe vouch channel (ID: ${SYTHE_VOUCH_CHANNEL_ID}). Please check the channel configuration.`);
      return;
    }

    // Create and send the embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2) // Discord blurple
      .setTitle('🌟 New Sythe Vouch')
      .setDescription(sanitizedContent.length > 1024 
        ? sanitizedContent.substring(0, 1021) + '...' 
        : sanitizedContent)
      .addFields({
        name: '👤 From',
        value: username,
        inline: true
      })
      .setTimestamp()
      .setFooter({ 
        text: 'Sythe Forum Vouch',
        iconURL: 'https://www.sythe.org/favicon.ico'
      });

    const sentMessage = await vouchChannel.send({ embeds: [embed] });

    // Mark as posted
    await storage.markSytheVouchPosted(newVouch.id, sentMessage.id);

    await message.reply(`✅ Sythe vouch from **${username}** has been posted to <#${SYTHE_VOUCH_CHANNEL_ID}>`);

  } catch (error) {
    console.error('Error handling !sythevouch command:', error);
    await message.reply('❌ An error occurred while posting the Sythe vouch. Please try again.');
  }
}

// !send <service option name> — posts a service price embed publicly in the channel
async function handleSendCommand(message: any) {
  try {
    // Staff only
    const member = message.member;
    const isStaff = member?.permissions?.has('Administrator') ||
      member?.roles?.cache?.some((r: any) => ['staff', 'admin', 'worker', 'moderator', 'mod'].includes(r.name.toLowerCase()));
    if (!isStaff) {
      await message.reply({ content: '❌ You need staff permissions to use this command.', ephemeral: true });
      return;
    }

    const query = message.content.slice('!send '.length).trim().toLowerCase();
    if (!query) {
      await message.reply('❌ Usage: `!send <service name>`\nExample: `!send pest control` or `!send falador diary`');
      return;
    }

    // Load all services
    const services = await storage.getServices();

    // Normalize helper — removes spaces, hyphens, apostrophes for comparison
    const normalize = (s: string) => s.toLowerCase().replace(/[-'\s]+/g, '');

    const normalizedQuery = normalize(query);
    const queryWords = query.split(/\s+/);

    let matchedService: any = null;
    let matchedOption: any = null;
    let bestScore = -1;

    for (const service of services) {
      if (!service.options || !Array.isArray(service.options)) continue;
      for (const option of service.options as any[]) {
        const optionNorm = normalize(option.name);
        const serviceNorm = normalize(service.name);
        // Combined: "servicename optionname"
        const combined = normalize(`${service.name} ${option.name}`);
        const combinedRev = normalize(`${option.name} ${service.name}`);

        let score = 0;

        if (optionNorm === normalizedQuery) score = 100;                          // exact option match
        else if (combined === normalizedQuery) score = 99;                         // exact combined match
        else if (combinedRev === normalizedQuery) score = 99;
        else if (optionNorm.includes(normalizedQuery)) score = 80;                 // option contains query
        else if (combined.includes(normalizedQuery)) score = 75;
        else if (normalizedQuery.includes(optionNorm)) score = 70;                 // query contains option
        else {
          // All query words appear in combined service+option name
          const allMatch = queryWords.every(w => combined.includes(normalize(w)));
          if (allMatch) score = 60;
          else {
            // Most words match
            const matchCount = queryWords.filter(w => combined.includes(normalize(w))).length;
            if (matchCount > 0) score = matchCount * 10;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          matchedService = service;
          matchedOption = option;
        }
      }
    }

    // Require a minimum score to avoid garbage matches
    if (!matchedOption || bestScore < 10) {
      // Show all available options
      const allOptions: string[] = [];
      for (const service of services) {
        if (!service.options || !Array.isArray(service.options)) continue;
        for (const option of service.options as any[]) {
          allOptions.push(`• **${service.name}** → ${option.name}`);
        }
      }
      const optionList = allOptions.slice(0, 30).join('\n');
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF6B35)
            .setTitle('❌ Service not found')
            .setDescription(`No match found for **"${query}"**\n\n**Available services:**\n${optionList}`)
            .setFooter({ text: 'Usage: !send <service name> — e.g. !send pest control' })
        ]
      });
      return;
    }

    // Build the same embed the dropdown shows
    let priceText = '';
    if (matchedOption.priceItems && matchedOption.priceItems.length > 0) {
      priceText = matchedOption.priceItems
        .map((item: any) => `**${item.name}** - ${item.price}`)
        .join('\n');
    } else if (matchedOption.price) {
      priceText = `**Price:** ${matchedOption.price}`;
    } else {
      priceText = 'Contact for quote';
    }

    if (matchedOption.note && matchedOption.note.trim()) {
      priceText += `\n\n📝 *${matchedOption.note.trim()}*`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${matchedService.icon || '🐲'} ${matchedOption.name}`)
      .setDescription(priceText)
      .setColor(0xFF6B35)
      .setFooter({
        text: '🐲 Dragon Services | Conquer the Game',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      });

    const createTicketButton = new ButtonBuilder()
      .setLabel('🎫 Create Ticket')
      .setStyle(ButtonStyle.Success)
      .setCustomId(`create_ticket_${matchedService.id}_${matchedOption.id}`);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(createTicketButton);

    await message.channel.send({ embeds: [embed], components: [row] });

    // Delete the command message so the channel stays clean
    await message.delete().catch(() => {});

  } catch (error) {
    console.error('Error handling !send command:', error);
    await message.reply('❌ An error occurred. Please try again.');
  }
}

// Handle payment method selection from dropdown
async function handlePaymentMethodSelection(interaction: any, methodId: string) {
  try {
    const method = await storage.getPaymentMethod(methodId);
    
    if (!method) {
      await interaction.reply({
        content: '❌ Payment method not found.',
        ephemeral: true
      });
      return;
    }

    // Get emoji based on type
    const emoji = method.type === 'crypto' ? '🪙' : method.type === 'fiat' ? '💳' : '💰';
    const typeLabel = method.type === 'crypto' ? 'Cryptocurrency' : method.type === 'fiat' ? 'Traditional' : 'Other';

    // Create mobile-friendly embed with copyable address
    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${method.displayName}`)
      .setDescription(`**Payment Type:** ${typeLabel}\n\n${method.description || ''}`)
      .setColor(0xFF6B35)
      .setFooter({ 
        text: '🐲 Dragon Services • Long press to copy',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();

    // Add address field if available - formatted for easy mobile copy
    if (method.address) {
      embed.addFields({
        name: '📋 Address / Email / ID',
        value: `\`\`\`\n${method.address}\n\`\`\``,
        inline: false
      });
      
      // Add a plain text version for even easier copying on mobile
      embed.addFields({
        name: '📱 Copy-Friendly Format',
        value: `\`${method.address}\``,
        inline: false
      });
    } else {
      embed.addFields({
        name: '⚠️ Notice',
        value: 'Address not configured. Please contact staff.',
        inline: false
      });
    }

    // Add fee info if applicable
    const feePercent = parseFloat(method.feePercentage || '0');
    const feeFixed = parseFloat(method.feeFixed || '0');
    if (feePercent > 0 || feeFixed > 0) {
      let feeText = '';
      if (feePercent > 0) feeText += `${feePercent}%`;
      if (feePercent > 0 && feeFixed > 0) feeText += ' + ';
      if (feeFixed > 0) feeText += `$${feeFixed.toFixed(2)} fixed`;
      
      embed.addFields({
        name: '💵 Processing Fee',
        value: feeText,
        inline: true
      });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling payment method selection:', error);
    await interaction.reply({
      content: '❌ An error occurred while loading payment details.',
      ephemeral: true
    });
  }
}

async function handleSelectMenu(interaction: any) {
  const { customId, values } = interaction;

  if (customId === 'payment_method_select') {
    await handlePaymentMethodSelection(interaction, values[0]);
  } else if (customId === 'order_service') {
    await handleOrderServiceSelection(interaction, values[0]);
  } else if (customId === 'dragon_services_select') {
    try {
      const serviceId = values[0];
      const service = await storage.getService(serviceId);
      
      if (!service) {
        await interaction.reply({
          content: 'Service not found.',
          ephemeral: true
        });
        return;
      }

      // Log user interaction
      await storage.createUserInteraction({
        userId: interaction.user.id,
        username: interaction.user.username,
        serviceId: serviceId,
        status: 'viewed'
      });

      // Show ONLY the sub-services dropdown — no big embed
      const selectMenu = createServiceOptionsSelectMenu(service);

      if (!selectMenu) {
        await interaction.reply({
          content: `**${service.icon} ${service.name}**\nNo options configured yet.`,
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `**${service.icon} ${service.name} — Choose a service:**`,
        components: [selectMenu],
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling service selection:', error);
      await interaction.reply({
        content: 'An error occurred while processing your selection.',
        ephemeral: true
      });
    }
  } else if (customId.startsWith('dragon_service_options_')) {
    try {
      const serviceId = customId.replace('dragon_service_options_', '');
      const optionId = values[0];
      
      const service = await storage.getService(serviceId);
      if (!service) {
        await interaction.reply({
          content: 'Service not found.',
          ephemeral: true
        });
        return;
      }

      const selectedOption = service.options?.find(opt => opt.id === optionId);
      if (!selectedOption) {
        await interaction.reply({
          content: 'Option not found.',
          ephemeral: true
        });
        return;
      }

      // Log user interaction with selected option
      await storage.createUserInteraction({
        userId: interaction.user.id,
        username: interaction.user.username,
        serviceId: serviceId,
        selectedOption: selectedOption.name,
        status: 'selected'
      });

      // Build price list from priceItems (new) or fall back to single price (legacy)
      let priceText = '';
      if (selectedOption.priceItems && selectedOption.priceItems.length > 0) {
        priceText = selectedOption.priceItems
          .map(item => `**${item.name}** - ${item.price}`)
          .join('\n');
      } else if (selectedOption.price) {
        priceText = `**Price:** ${selectedOption.price}`;
      } else {
        priceText = 'Contact for quote';
      }

      // Append note below prices if set
      if (selectedOption.note && selectedOption.note.trim()) {
        priceText += `\n\n📝 *${selectedOption.note.trim()}*`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${service.icon} ${selectedOption.name}`)
        .setDescription(priceText)
        .setColor(0xFF6B35)
        .setFooter({
          text: '🐲 Dragon Services | Conquer the Game',
          iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        });

      const createTicketButton = new ButtonBuilder()
        .setLabel('🎫 Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`contact_support_${serviceId}_${selectedOption.id}`);

      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(createTicketButton);

      await interaction.reply({
        embeds: [embed],
        components: [actionRow],
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling option selection:', error);
      await interaction.reply({
        content: 'An error occurred while processing your selection.',
        ephemeral: true
      });
    }
  } else if (customId.startsWith('order_option_')) {
    await handleOrderOptionSelection(interaction, customId, values[0]);
  } else if (customId === 'special_offers_select') {
    const selectedOfferId = values[0];
    try {
      // Get the offer details
      const offer = await storage.getSpecialOffer(selectedOfferId);
      if (!offer) {
        await interaction.reply({
          content: 'Offer not found.',
          ephemeral: true
        });
        return;
      }

      // Create single offer embed with countdown
      const embed = createSingleOfferEmbed(offer);
      const buttons = createOfferActionButtons(offer);

      await interaction.reply({
        embeds: [embed],
        components: [buttons],
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling offer selection:', error);
      await interaction.reply({
        content: 'An error occurred while loading offer details.',
        ephemeral: true
      });
    }
  }
}

// Calculator command handler
async function handleCalculatorCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('calculator').catch(() => {});
    
    const embed = createCalculatorEmbed();
    const components = createCalculatorComponents();

    await message.reply({
      embeds: [embed],
      components: components
    });

  } catch (error) {
    console.error('Error handling calculator command:', error);
    await message.reply('An error occurred while loading the calculator.');
  }
}

// Button interaction handler for calculator
async function handleModalSubmit(interaction: any) {
  try {
    if (interaction.customId.startsWith('vouch_modal_')) {
      // Handle vouch modal submission
      const orderNumber = interaction.customId.replace('vouch_modal_', '');
      const vouchContent = interaction.fields.getTextInputValue('vouch_content');
      const username = interaction.user.displayName || interaction.user.username;

      console.log(`📝 VOUCH: ${username} attempting to vouch for order ${orderNumber}`);

      // Check if order exists and is completed
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        await interaction.reply({
          content: '❌ **Order not found!** This order may have been deleted.',
          ephemeral: true
        });
        return;
      }

      if (order.status !== 'completed') {
        await interaction.reply({
          content: '❌ **Order not completed yet!** You can only leave vouches for completed orders.',
          ephemeral: true
        });
        return;
      }

      // Get the worker info for vouching (same logic as !leavevouch command)
      let vouchedUserId = order.workerId || 'dragon-services';
      let vouchedUsername = 'Dragon Services Team';
      
      if (order.workerId) {
        try {
          const worker = await storage.getUser(order.workerId);
          if (worker) {
            vouchedUsername = worker.username || 'Dragon Services Worker';
          }
        } catch (err) {
          console.log('Could not fetch worker info:', err);
        }
      }

      // Create the vouch in database (matching !leavevouch command structure)
      try {
        await storage.createVouch({
          voucherUserId: interaction.user.id,
          voucherUsername: username,
          vouchedUserId: vouchedUserId,
          vouchedUsername: vouchedUsername,
          vouchType: 'quality', // Default to quality for order vouches
          reason: vouchContent,
          isPositive: true, // Order completion vouches are always positive
          orderNumber: orderNumber // Link to specific order
        });
      } catch (error: any) {
        console.error('Error creating vouch:', error);
        await interaction.reply({
          content: `❌ **Failed to submit vouch!**\n\n` +
                  `**Error:** ${error.message || 'Database error'}\n\n` +
                  `Please contact an administrator for assistance.`,
          ephemeral: true
        });
        return;
      }

      // Send confirmation reply
      const confirmationEmbed = new EmbedBuilder()
        .setColor(0xFF6B35)
        .setTitle('✅ Vouch Submitted Successfully!')
        .setDescription(`🙏 **Thank you, ${username}!** Your vouch has been recorded and posted to our community channel.`)
        .addFields(
          {
            name: '📝 Your Review',
            value: `*"${vouchContent}"*`,
            inline: false
          },
          {
            name: '🆔 Order Number',
            value: `\`${orderNumber}\``,
            inline: true
          },
          {
            name: '⭐ Status',
            value: 'Posted to Community',
            inline: true
          }
        )
        .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
        .setFooter({ 
          text: '🐲 Dragon Services • Your feedback helps us serve the OSRS community better!',
          iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [confirmationEmbed],
        ephemeral: true
      });

      // Post to vouch channel
      try {
        const guild = interaction.guild;
        const vouchChannel = guild.channels.cache.get(VOUCH_CHANNEL_ID);
        
        if (vouchChannel) {
          const channelEmbed = new EmbedBuilder()
            .setColor(0xFF6B35)
            .setTitle('🌟 New Customer Vouch - Dragon Services')
            .addFields(
              {
                name: `👤 Customer Review by ${username}`,
                value: `💬 *"${vouchContent}"*\n\n⭐ **Service Quality:** Exceptional\n✅ **Status:** Verified Order Completion\n🧑‍💼 **Customer:** ${username}`,
                inline: false
              },
              {
                name: '📋 Service Details',
                value: `🆔 **Order:** ${orderNumber}\n🎯 **Service:** Dragon Services\n👨‍💼 **Handled by:** Dragon Services Team`,
                inline: false
              }
            )
            .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
            .setFooter({ 
              text: '🐲 Dragon Services',
              iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
            })
            .setTimestamp();

          await vouchChannel.send({ embeds: [channelEmbed] });
          console.log(`Posted order vouch to channel: ${orderNumber} by ${username}`);
        }
      } catch (error) {
        console.error('Error posting vouch to channel:', error);
      }
    } else if (interaction.customId === 'create_order_modal') {
      // Defer reply immediately to prevent Discord timeout (3 second limit)
      await interaction.deferReply({ ephemeral: false });
      
      // Get form field values
      const orderTitle = interaction.fields.getTextInputValue('order_title');
      const orderValue = interaction.fields.getTextInputValue('order_value');
      const customerIdInput = interaction.fields.getTextInputValue('customer_id');
      const depositRequired = interaction.fields.getTextInputValue('deposit_required') || null;
      const orderDescription = interaction.fields.getTextInputValue('order_description');
      const orderPriority = 'Normal'; // Default priority since modal field limit reached
      
      // Hardcoded claim channel ID
      const claimChannelId = '1414389767453544650';

      // Validate order value (convert millions to GP)
      const orderAmountM = parseInt(orderValue.replace(/[^0-9]/g, ''));
      if (isNaN(orderAmountM) || orderAmountM <= 0) {
        await interaction.editReply({
          content: '❌ Invalid order amount. Please enter a valid number in millions.'
        });
        return;
      }
      const orderAmount = orderAmountM * 1000000; // Convert millions to GP

      // Validate and convert deposit requirement
      let depositAmountGP = 0;
      if (depositRequired && depositRequired.trim() !== '') {
        const depositAmountM = parseInt(depositRequired.replace(/[^0-9]/g, ''));
        if (!isNaN(depositAmountM) && depositAmountM > 0) {
          depositAmountGP = depositAmountM * 1000000; // Convert millions to GP
        }
      }

      // Parse customer ID - accept mention format or direct ID
      let customerId = customerIdInput.trim();
      
      // If it's a mention format, extract the ID
      const mentionMatch = customerId.match(/<@!?(\d+)>/);
      if (mentionMatch) {
        customerId = mentionMatch[1];
      } else {
        // Remove any non-digit characters
        customerId = customerId.replace(/\D/g, '');
      }
      
      // Validate customer ID
      if (!customerId || customerId.length < 17 || customerId.length > 19) {
        await interaction.editReply({
          content: '❌ Invalid customer ID! Please enter a valid Discord user ID (17-19 digits).\n\n**How to get User ID:**\n1. Enable Developer Mode in Discord Settings\n2. Right-click the user\n3. Click "Copy ID"'
        });
        return;
      }
      
      // Fixed worker is now always null (removed from form to make room for customer field)
      const fixedWorker = null;
      
      // CRITICAL: Validate claim channel FIRST before any wallet operations
      // This prevents payment deduction when the claim channel is inaccessible
      let claimChannel: TextChannel | null = null;
      try {
        const fetchedChannel = await interaction.client.channels.fetch(claimChannelId);
        if (!fetchedChannel || !fetchedChannel.isTextBased()) {
          await interaction.editReply({
            content: `❌ **Order Creation Failed!**\n\nCannot access claim channel (ID: ${claimChannelId}).\nPlease contact an administrator to fix the channel configuration.`
          });
          return;
        }
        claimChannel = fetchedChannel as TextChannel;
        console.log(`✅ Claim channel validated: ${claimChannelId}`);
      } catch (channelError) {
        console.error('❌ Failed to fetch claim channel:', channelError);
        await interaction.editReply({
          content: `❌ **Order Creation Failed!**\n\nCannot access claim channel. Error: ${String(channelError).substring(0, 100)}\n\nPlease contact an administrator.`
        });
        return;
      }
      
      let customerUsername = 'Customer';
      
      // Try to fetch customer info from Discord
      try {
        const customer = await client.users.fetch(customerId);
        customerUsername = customer.username;
      } catch (err) {
        console.log('Could not fetch customer info:', err);
      }

      // Store the ticket channel ID where the order was created
      const ticketChannelId = interaction.channelId;
      const staffId = interaction.user.id;
      const staffUsername = interaction.user.username;
      
      // Get or create customer's wallet
      let customerWallet = await storage.getUserWallet(customerId);
      if (!customerWallet) {
        customerWallet = await storage.createUserWallet({
          userId: customerId,
          username: customerUsername,
          userType: 'customer',
          balanceGp: 0,
          totalDepositedGp: 0,
          totalSpentGp: 0,
          totalEarningsGp: 0,
          totalOrders: 0,
          isActive: true
        });
      }

      // Generate proper sequential order number
      const orderNumber = await storage.generateOrderNumber();
      
      // Deduct order amount from customer's wallet for security
      try {
        const deductionResult = await storage.deductOrderAmount(
          customerId,
          orderAmount,
          orderNumber,
          `Order payment for ${orderTitle} (${orderNumber})`
        );
        
        // Update customerWallet reference with latest data
        customerWallet = deductionResult.wallet;
        
        // Update Discord role based on new spending total
        if (interaction.guild) {
          try {
            const customerMember = await interaction.guild.members.fetch(customerId);
            if (customerMember) {
              const roleUpdated = await updateCustomerRankRole(customerMember, customerWallet.totalSpentGp, customerWallet.manualRank);
              if (roleUpdated) {
                console.log(`✅ Customer rank role updated for ${customerUsername} after order payment (${formatGPAmount(customerWallet.totalSpentGp)} total spent)`);
              }
            }
          } catch (roleError) {
            console.error('⚠️ Error updating customer rank role after order:', roleError);
            // Don't fail order creation for role update error
          }
        }
      } catch (error: any) {
        // If insufficient balance or other error, show error message
        await interaction.editReply({
          content: `❌ **Order Creation Failed!**\n\n` +
                  `**Reason:** ${error.message || 'Wallet deduction error'}\n\n` +
                  `💡 **Solution:**\n` +
                  `• Customer needs to deposit at least **${formatGPAmount(orderAmount)} GP** to their wallet\n` +
                  `• Current balance: **${formatGPAmount(customerWallet?.balanceGp || 0)} GP**\n` +
                  `• Required: **${formatGPAmount(orderAmount)} GP**\n\n` +
                  `🏦 Customer can deposit using the \`/deposit\` command or contact staff.`
        });
        return;
      }
      
      // Create the order linked to customer's wallet
      const order = await storage.createOrder({
        orderNumber: orderNumber,
        walletId: customerWallet.id,
        userId: customerId,
        username: customerUsername,
        totalAmountGp: orderAmount,
        originalAmountGp: orderAmount,
        status: 'pending',
        lockedDepositGp: depositAmountGP, // Store the required deposit amount
        notes: `Order created by staff: ${staffUsername}\nCustomer: ${customerUsername} (${customerId})\nTicket Channel: ${ticketChannelId}\nService: ${orderTitle}\nDescription: ${orderDescription}\nDeposit Required: ${depositAmountGP > 0 ? formatGPAmount(depositAmountGP) : '0 GP'}`
      });
      
      // Increment customer's order count
      await storage.updateUserWallet(customerWallet.id, {
        totalOrders: (customerWallet.totalOrders || 0) + 1
      });

      // Create success embed
      // Extract account image URL from description if present (support Discord CDN and common image hosts)
      const imageUrlMatch = orderDescription.match(/https?:\/\/(?:cdn\.discordapp\.com\/attachments\/|i\.imgur\.com\/|.*\.(png|jpg|jpeg|gif|webp))/i);
      const accountImageUrl = imageUrlMatch ? imageUrlMatch[0] : null;
      
      const orderEmbed = new EmbedBuilder()
        .setTitle('🎉 Order Created!')
        .setDescription(`Order posted to worker claim channel\n\n**Status:** Ready for workers to claim`)
        .addFields([
          {
            name: '🆔 Order Information',
            value: `📋 **Order #:** ${order.orderNumber}\n` +
                  `🎯 **Service:** ${orderTitle}\n` +
                  `💰 **Total Value:** ${formatGPAmount(orderAmount)} GP\n` +
                  `⚡ **Current Status:** 🟢 **AVAILABLE FOR CLAIM**`,
            inline: true
          },
          {
            name: '👥 Customer & Security',
            value: `👑 **Customer:** ${customerUsername} (<@${customerId}>)\n` +
                  `📋 **Created by:** **${interaction.user.username}**\n` +
                  `💰 **Payment:** ✅ ${formatGPAmount(orderAmount)} GP deducted from wallet\n` +
                  `💳 **Remaining Balance:** ${formatGPAmount(customerWallet.balanceGp)} GP\n` +
                  `🏦 **Security Deposit:** ${order.lockedDepositGp ? '🔒 ' + formatGPAmount(order.lockedDepositGp) + ' GP required' : '✅ No deposit required'}`,
            inline: true
          },
          {
            name: '📋 Service Description & Details',
            value: `🔥 ${orderDescription.length > 400 ? 
                  orderDescription.substring(0, 397) + '...' : 
                  orderDescription}`,
            inline: false
          },
          {
            name: '🚀 Next Steps - What Happens Now',
            value: `🎯 **Worker Selection:** Elite workers can now claim this order\n` +
                  `⚡ **Auto-Processing:** Deposits will be locked automatically upon claim\n` +
                  `📞 **Coordination:** Worker will contact customer directly once claimed\n` +
                  `🛡️ **Quality Assurance:** Dragon Services monitors all order progress`,
            inline: false
          },
          {
            name: '⏰ Timeline & Status',
            value: `✅ **Created:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
                  `📈 **Expected Claim Time:** Usually within minutes\n` +
                  `🔔 **Notifications:** Customer will be notified when claimed`,
            inline: true
          }
        ])
        .setColor(0xFF6B35) // Dragon fire orange
        .setFooter({ 
          text: `🐲 Dragon Services • Order posted`,
          iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        })
        .setTimestamp();
      
      // Add account image thumbnail if found, otherwise use dragon logo
      if (accountImageUrl) {
        orderEmbed.setThumbnail(accountImageUrl);
      } else {
        orderEmbed.setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png');
      }

      await interaction.editReply({
        embeds: [orderEmbed]
      });

      // Send order to claim channel (using pre-validated channel)
      try {
        // Calculate worker cut (70% of total value as per updated payment structure)
        const workerCut = Math.floor(orderAmount * 0.7);
        
        // Extract account image URL from description if present (support Discord CDN and common image hosts)
        const claimImageUrlMatch = orderDescription.match(/https?:\/\/(?:cdn\.discordapp\.com\/attachments\/|i\.imgur\.com\/|.*\.(png|jpg|jpeg|gif|webp))/i);
        const claimAccountImageUrl = claimImageUrlMatch ? claimImageUrlMatch[0] : null;
        
        const claimEmbed = new EmbedBuilder()
          .setTitle('🔥 New Order Available')
          .setDescription(`**${orderTitle}**\n${fixedWorker ? `🎯 Fixed: ${fixedWorker}` : '🌟 Open to all workers'}`)
          .addFields([
            {
              name: '📋 Order #',
              value: `**${order.orderNumber}**`,
              inline: false
            },
            {
              name: '💰 Payment',
              value: `Total: **${formatGPAmount(orderAmount)} GP**\nYou get: **${formatGPAmount(Math.floor(orderAmount * 0.7))} GP** (70%)`,
              inline: false
            },
            {
              name: '🏦 Deposit',
              value: depositAmountGP > 0 ? `🔒 **${formatGPAmount(depositAmountGP)} GP** required` : `✅ No deposit needed`,
              inline: false
            },
            {
              name: '📝 Details',
              value: orderDescription.length > 200 ? 
                    orderDescription.substring(0, 197) + '...' : 
                    orderDescription,
              inline: false
            },
            {
              name: '⚡ Priority',
              value: orderPriority ? (orderPriority.toLowerCase().includes('urgent') ? '🔴 URGENT' : 
                     orderPriority.toLowerCase().includes('high') ? '🟠 HIGH' :
                     orderPriority.toLowerCase().includes('low') ? '🟢 LOW' : '🟡 NORMAL') : '🟡 NORMAL',
              inline: false
            }
          ])
          .setColor(0xFF6B35)
          .setFooter({ 
            text: `🐲 Dragon Services • By ${interaction.user.username}`,
            iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
          })
          .setTimestamp();
          
        // Add account image thumbnail if found, otherwise use dragon logo
        if (claimAccountImageUrl) {
          claimEmbed.setThumbnail(claimAccountImageUrl);
        } else {
          claimEmbed.setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png');
        }

        const claimButton = new ButtonBuilder()
          .setCustomId(`claim_order_${order.id}_${fixedWorker ? 'fixed' : 'open'}_${depositAmountGP}`)
          .setLabel('🎯 Claim This Order!')
          .setStyle(ButtonStyle.Success);

        const claimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

        // Use pre-validated claim channel
        console.log(`📢 Posting order #${order.orderNumber} to claim channel ${claimChannelId}...`);
        
        await claimChannel!.send({
          embeds: [claimEmbed],
          components: [claimRow]
        });
        
        console.log(`✅ Successfully posted order #${order.orderNumber} to claim channel`);

      } catch (error) {
        console.error('❌ Could not send to claim channel:', error);
        try {
          await interaction.followUp({
            content: `⚠️ Order #${order.orderNumber} created but failed to post to claim channel. Error: ${String(error).substring(0, 200)}`,
            ephemeral: true
          });
        } catch (followUpError) {
          console.error('Could not send follow-up error message:', followUpError);
        }
      }

      // Move ticket channel to Active Orders category
      try {
        const activeOrdersCategoryId = '1432077778219438340';
        const ticketChannel = await interaction.client.channels.fetch(ticketChannelId);
        
        if (ticketChannel && 'setParent' in ticketChannel) {
          await ticketChannel.setParent(activeOrdersCategoryId, {
            lockPermissions: false // Keep existing permissions
          });
          console.log(`✅ Moved ticket channel ${ticketChannelId} to Active Orders category`);
        }
      } catch (error) {
        console.log('Could not move ticket channel to Active Orders category:', String(error));
      }
    }
  } catch (error) {
    console.error('Error handling modal submission:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the order.',
      ephemeral: false
    });
  }
}

// Handle worker claiming orders
async function handleOrderClaim(interaction: any) {
  try {
    const customIdParts = interaction.customId.split('_');
    const orderId = customIdParts[2]; // claim_order_{id}_{type}_{deposit}
    const orderType = customIdParts[3]; // 'fixed' or 'open'
    const workerId = interaction.user.id;
    const workerUsername = interaction.user.username;
    
    // Get the order details
    const order = await storage.getOrder(orderId);
    if (!order) {
      await interaction.reply({
        content: '❌ This order could not be found.',
        ephemeral: true
      });
      return;
    }
    
    // Get deposit requirement from order record
    const requiredDeposit = order.lockedDepositGp || 0;
    
    // Check if order is still available
    if (order.status !== 'pending') {
      await interaction.reply({
        content: '❌ This order has already been claimed or completed.',
        ephemeral: true
      });
      return;
    }

    // Check if this is a fixed worker assignment
    if (orderType === 'fixed') {
      const fixedWorker = order.notes?.match(/Fixed Worker: (.+)/)?.[1];
      if (fixedWorker && fixedWorker !== 'Any worker') {
        // Clean the worker name (remove @ if present)
        const cleanFixedWorker = fixedWorker.replace('@', '').toLowerCase();
        const cleanCurrentWorker = workerUsername.toLowerCase();
        
        if (cleanFixedWorker !== cleanCurrentWorker) {
          await interaction.reply({
            content: `❌ This order is assigned to **${fixedWorker}** only. You cannot claim this order.`,
            ephemeral: true
          });
          return;
        }
      }
    }

    // Get or create worker wallet
    let workerWallet = await storage.getUserWallet(workerId);
    if (!workerWallet) {
      workerWallet = await storage.createUserWallet({
        userId: workerId,
        username: workerUsername,
        userType: 'worker',
        balanceGp: 0,
        totalDepositedGp: 0,
        totalSpentGp: 0,
        totalEarningsGp: 0,
        totalOrders: 0,
        manualRank: 'IRON',
        customerRank: '0.00',
        isActive: true
      });
    }

    // Check deposit requirement  
    if (requiredDeposit > 0) {
      const totalDeposit = workerWallet.totalDepositedGp || 0;
      const workingDeposit = workerWallet.workingDepositGp || 0;
      const availableDeposit = totalDeposit - workingDeposit;
      
      if (availableDeposit < requiredDeposit) {
        await interaction.reply({
          content: `❌ **Insufficient Available Deposit**\n\n` +
                  `This order requires a deposit of **${formatGPAmount(requiredDeposit)}**\n` +
                  `Your total deposit: **${formatGPAmount(totalDeposit)}**\n` +
                  `Currently locked: **${formatGPAmount(workingDeposit)}**\n` +
                  `Available deposit: **${formatGPAmount(availableDeposit)}**\n` +
                  `You need **${formatGPAmount(requiredDeposit - availableDeposit)}** more available deposit to claim this order.`,
          ephemeral: true
        });
        return;
      }
    }
    
    // Lock the deposit if required
    if (requiredDeposit > 0) {
      try {
        console.log(`🔒 Locking deposit: ${requiredDeposit} GP for worker ${workerUsername} (Wallet ID: ${workerWallet.id})`);
        await storage.lockDeposit(workerWallet.id, requiredDeposit);
        console.log(`✅ Successfully locked ${requiredDeposit} GP deposit`);
      } catch (error) {
        console.error('❌ Failed to lock deposit:', error);
        await interaction.reply({
          content: `❌ **Error locking deposit**: ${(error as Error).message}\nOrder claim failed.`,
          ephemeral: true
        });
        return;
      }
    }
    
    // Update order status to claimed and store worker info
    await storage.updateOrder(orderId, {
      status: 'claimed',
      workerId: workerId,
      workerUsername: workerUsername,
      notes: order.notes + `\nClaimed by ${workerUsername} (${workerId}) at ${new Date().toISOString()}\nDeposit locked: ${formatGPAmount(requiredDeposit)}`
    });
    
    // Get original embed and preserve the beautiful format, just update status
    const originalEmbed = interaction.message.embeds[0];
    const claimedEmbed = new EmbedBuilder()
      .setTitle('✅🔒 **ORDER CLAIMED** - ' + originalEmbed.title?.replace('🔥✨ **NEW ORDER AVAILABLE FOR CLAIM!**', ''))
      .setDescription(`**Claimed by ${workerUsername}**\n\n🎯 Order in progress`)
      .addFields(originalEmbed.fields || [])
      .setColor(0x00FF00) // Green for claimed
      .setFooter({ 
        text: `🐲 Dragon Services • Claimed by ${workerUsername}`,
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp()
      .setThumbnail(originalEmbed.thumbnail?.url || 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png');

    // Add "Remove Worker" button to allow unclaiming if claimed by mistake
    const unclaimButton = new ButtonBuilder()
      .setCustomId(`unclaim_order_${orderId}_${requiredDeposit}`)
      .setLabel('❌ Remove Worker & Repost')
      .setStyle(ButtonStyle.Danger);

    const unclaimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(unclaimButton);

    await interaction.update({
      embeds: [claimedEmbed],
      components: [unclaimRow] // Add unclaim button
    });
    
    // Extract ticket channel ID from order notes
    const ticketMatch = order.notes?.match(/Ticket Channel: (\d+)/);
    if (ticketMatch) {
      const ticketChannelId = ticketMatch[1];
      
      try {
        const ticketChannel = await interaction.client.channels.fetch(ticketChannelId);
        
        // Add worker to ticket channel with view and send message permissions
        if (ticketChannel.isTextBased() && 'permissionOverwrites' in ticketChannel) {
          try {
            await ticketChannel.permissionOverwrites.create(workerId, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
              AttachFiles: true,
              EmbedLinks: true
            });
            console.log(`✅ Added worker ${workerUsername} to ticket channel ${ticketChannelId}`);
          } catch (permError) {
            console.error('Error adding worker to ticket channel:', permError);
          }
        }
        
        const workerMention = `<@${workerId}>`;
        
        // Extract full job description from order notes
        const descriptionMatch = order.notes?.match(/Description: ([\s\S]*?)(?=\nDeposit Required:|$)/);
        const fullJobDescription = descriptionMatch ? descriptionMatch[1].trim() : 'Premium OSRS service - details will be coordinated directly with you';
        
        const ticketNotificationEmbed = new EmbedBuilder()
          .setTitle('🎉 Order Accepted!')
          .setDescription(`Worker assigned: **${workerUsername}**`)
          .addFields([
            {
              name: '📋 Order',
              value: `#${order.orderNumber}\nValue: **${formatGPAmount(order.totalAmountGp || 0)} GP**`,
              inline: false
            },
            {
              name: '📝 Job Details', 
              value: fullJobDescription.length > 500 ? fullJobDescription.substring(0, 497) + '...' : fullJobDescription,
              inline: false
            },
            {
              name: '🚀 Next Steps',
              value: `${workerMention} will coordinate with you\nAccepted: <t:${Math.floor(Date.now() / 1000)}:R>`,
              inline: false
            }
          ])
          .setColor(0xFF6B35)
          .setFooter({ 
            text: '🐲 Dragon Services',
            iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
          })
          .setTimestamp();

        await ticketChannel.send({
          content: `${workerMention} Your order is ready! Please coordinate with the customer.`,
          embeds: [ticketNotificationEmbed]
        });
        
      } catch (error) {
        console.log('Could not send notification to ticket channel:', String(error));
      }
    }
    
  } catch (error) {
    console.error('Error handling order claim:', error);
    await interaction.reply({
      content: '❌ An error occurred while claiming the order.',
      ephemeral: true
    });
  }
}

// Handle worker being removed from order (unclaim)
async function handleOrderUnclaim(interaction: any) {
  try {
    // Check if user is admin/staff - only admins can remove workers
    const isAdmin = await isUserAdmin(interaction.user, interaction.guild);
    if (!isAdmin) {
      await interaction.reply({
        content: '❌ **Access Denied:** Only server owners and administrators can remove workers from orders.\n\n**Required Permissions:**\n• Server Owner\n• Administrator role',
        ephemeral: true
      });
      return;
    }
    
    const customIdParts = interaction.customId.split('_');
    const orderId = customIdParts[2]; // unclaim_order_{id}_{deposit}
    const depositAmount = parseInt(customIdParts[3]);
    
    // Get the order details
    const order = await storage.getOrder(orderId);
    if (!order) {
      await interaction.reply({
        content: '❌ Order not found.',
        ephemeral: true
      });
      return;
    }

    // Prevent removing worker from completed orders
    if (order.status === 'completed') {
      await interaction.reply({
        content: '❌ **Cannot Remove Worker**\n\nThis order has already been **completed**. Workers cannot be removed from completed orders.\n\n✅ The order was successfully delivered and the worker has been paid.',
        ephemeral: true
      });
      return;
    }

    // Prevent removing worker from cancelled orders
    if (order.status === 'cancelled') {
      await interaction.reply({
        content: '❌ **Cannot Remove Worker**\n\nThis order has been **cancelled**. Workers cannot be removed from cancelled orders.\n\n🚫 Cancelled orders cannot be reposted.',
        ephemeral: true
      });
      return;
    }

    // Get worker info from order
    const workerId = order.workerId;
    const workerUsername = order.workerUsername || 'Unknown';

    // Unlock deposit if it was locked
    if (depositAmount > 0 && workerId) {
      try {
        const workerWallet = await storage.getUserWallet(workerId);
        if (workerWallet) {
          await storage.unlockDeposit(workerWallet.id, depositAmount);
          console.log(`✅ Unlocked ${depositAmount} GP deposit for worker ${workerUsername}`);
        }
      } catch (error) {
        console.error('Error unlocking deposit:', error);
      }
    }

    // Reset order status and remove worker assignment
    await storage.updateOrder(orderId, {
      status: 'pending',
      workerId: null,
      workerUsername: null,
      notes: (order.notes || '') + `\n\n⚠️ Worker ${workerUsername} removed by admin - Order reposted at ${new Date().toISOString()}`
    });

    // Update the message to show order is available again
    const originalEmbed = interaction.message.embeds[0];
    const repostedEmbed = new EmbedBuilder()
      .setTitle('🔥✨ **ORDER REPOSTED - AVAILABLE FOR CLAIM!**')
      .setDescription(`Worker removed - order available again\n\n🌟 Any worker can claim`)
      .addFields(originalEmbed.fields || [])
      .setColor(0xFFD700) // Gold for available
      .setFooter({ 
        text: '🐲 Dragon Services • Order Reposted • Available to Claim',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp()
      .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png');

    // Re-add claim button
    const claimButton = new ButtonBuilder()
      .setCustomId(`claim_order_${order.id}_open_${depositAmount}`)
      .setLabel('🎯 Claim This Order!')
      .setStyle(ButtonStyle.Success);

    const claimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

    await interaction.update({
      embeds: [repostedEmbed],
      components: [claimRow]
    });

    // Send notification to ticket channel and remove worker permissions
    const ticketMatch = order.notes?.match(/Ticket Channel: (\d+)/);
    if (ticketMatch && workerId) {
      const ticketChannelId = ticketMatch[1];
      
      try {
        const ticketChannel = await interaction.client.channels.fetch(ticketChannelId);
        
        // Remove worker from ticket channel - CRITICAL for security
        if (ticketChannel && ticketChannel.isTextBased()) {
          try {
            // Remove all permissions for the worker
            await ticketChannel.permissionOverwrites.delete(workerId);
            console.log(`✅ Removed worker ${workerUsername} (ID: ${workerId}) from ticket channel ${ticketChannelId}`);
            
            // Verify the permission was removed
            const remainingPerms = ticketChannel.permissionOverwrites.cache.get(workerId);
            if (remainingPerms) {
              console.error(`⚠️ WARNING: Worker ${workerUsername} still has permissions in ticket channel!`);
              // Try again with force
              await remainingPerms.delete();
            } else {
              console.log(`✅ Confirmed: Worker ${workerUsername} no longer has ticket access`);
            }
          } catch (permError) {
            console.error(`❌ Error removing worker from ticket channel:`, permError);
          }
        }
        
        // Send notification to ticket
        await ticketChannel.send(`⚠️ **Worker Removed:** ${workerUsername} has been removed from order **${order.orderNumber}** by an admin.\n\n✅ The order has been automatically reposted to the claim channel and is now available for other workers to claim.\n\n🔒 **Access Revoked:** The worker can no longer see this ticket.`);
      } catch (error) {
        console.log('Could not send notification to ticket channel:', String(error));
      }
    }

  } catch (error) {
    console.error('Error handling order unclaim:', error);
    await interaction.reply({
      content: '❌ An error occurred while removing the worker.',
      ephemeral: true
    });
  }
}

async function handleButtonInteraction(interaction: any) {
  try {
    const customId = interaction.customId;
    
    if (customId.startsWith('claim_order_')) {
      await handleOrderClaim(interaction);
      return;
    }
    
    if (customId.startsWith('unclaim_order_')) {
      await handleOrderUnclaim(interaction);
      return;
    }
    
    if (customId === 'calculator_start') {
      await handleCalculatorStart(interaction);
    } else if (customId === 'calculator_calculate') {
      await handleCalculatorCalculate(interaction);
    } else if (customId === 'calculator_reset') {
      await handleCalculatorReset(interaction);
    } else if (customId.startsWith('calc_add_')) {
      await handleCalculatorAddService(interaction);
    } else if (customId.startsWith('calc_remove_')) {
      await handleCalculatorRemoveService(interaction);
    } else if (customId.startsWith('contact_support_')) {
      await handleContactSupport(interaction);
    } else if (customId === 'back_to_services') {
      await handleBackToServices(interaction);
    } else if (customId.startsWith('claim_offer_')) {
      await handleClaimOffer(interaction);
    } else if (customId === 'back_to_offers') {
      await handleBackToOffers(interaction);
    } else if (customId.startsWith('contact_offer_')) {
      await handleContactOffer(interaction);
    } else if (customId.startsWith('leave_vouch_')) {
      // Handle Leave Vouch button
      const orderNumber = customId.replace('leave_vouch_', '');
      
      // Check if order exists and is completed
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        await interaction.reply({
          content: '❌ **Order not found!** This order may have been deleted.',
          ephemeral: true
        });
        return;
      }
      
      if (order.status !== 'completed') {
        await interaction.reply({
          content: '❌ **Order not completed yet!** You can only leave vouches for completed orders.',
          ephemeral: true
        });
        return;
      }

      // Create vouch modal
      const modal = new ModalBuilder()
        .setCustomId(`vouch_modal_${orderNumber}`)
        .setTitle('🐲 Leave a Vouch - Dragon Services');

      // Add text input for vouch content
      const vouchInput = new TextInputBuilder()
        .setCustomId('vouch_content')
        .setLabel('Share your experience with Dragon Services!')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Example: Amazing service! Fast completion and professional staff. Highly recommend Dragon Services!')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(500);

      const firstActionRow = new ActionRowBuilder().addComponents(vouchInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    }
  } catch (error) {
    console.error('Error handling button interaction:', error);
    await interaction.reply({
      content: 'An error occurred while processing your request.',
      ephemeral: true
    });
  }
}

// Handle Complete Order Command
async function handleCompleteOrderCommand(interaction: any) {
  try {
    // Defer reply immediately to prevent timeout (command does heavy operations)
    await interaction.deferReply({ ephemeral: false });
    
    // Update command usage
    storage.updateCommandUsage('complete-order').catch(() => {});
    
    const orderNumber = interaction.options.getString('order_number');
    
    // Find the order by order number
    const orders = await storage.getOrders();
    const order = orders.find(o => o.orderNumber === orderNumber);
    
    if (!order) {
      await interaction.editReply({
        content: `❌ **Order Not Found**\n\nNo order found with number: **${orderNumber}**\n\nPlease check the order number and try again.`
      });
      return;
    }
    
    if (order.status === 'completed') {
      await interaction.editReply({
        content: `⚠️ **Order Already Completed**\n\nOrder **${orderNumber}** is already marked as completed.`
      });
      return;
    }
    
    // Update order status to completed (this will trigger automatic deposit unlock)
    const updatedOrder = await storage.updateOrderStatus(
      order.id,
      'completed',
      interaction.user.id,
      interaction.user.username,
      `Order completed by ${interaction.user.username}`
    );
    
    if (updatedOrder) {
      // Note: Worker payment is handled automatically in storage.updateOrderStatus()
      // when status changes to 'completed' - no need to add it here again
      
      // Keep order in database as "completed" for admin panel history
      // Only delete the Discord claim message, not the database record
      console.log(`✅ Order ${orderNumber} marked as completed (retained in admin panel)`);
      
      // Auto-unregister any RSN linked to this order or this channel
      try {
        // First, try to find RSN registration linked to this order
        const rsnByOrder = await storage.getRsnRegistrationsByOrder(order.id);
        if (rsnByOrder && rsnByOrder.length > 0) {
          for (const rsn of rsnByOrder) {
            await storage.deactivateRsnRegistration(rsn.id);
            console.log(`🔓 Auto-unregistered RSN "${rsn.rsn}" after order ${orderNumber} completion`);
          }
        } else {
          // Also check if this channel has an RSN registered
          const rsnByChannel = await storage.getRsnRegistrationByChannel(interaction.channelId);
          if (rsnByChannel) {
            await storage.deactivateRsnRegistration(rsnByChannel.id);
            console.log(`🔓 Auto-unregistered RSN "${rsnByChannel.rsn}" for channel after order ${orderNumber} completion`);
          }
        }
      } catch (rsnError) {
        console.error('Error auto-unregistering RSN:', rsnError);
        // Don't fail order completion for RSN cleanup error
      }
      
      // Create mobile-friendly completion embed
      const completionEmbed = new EmbedBuilder()
        .setTitle('🎉 Order Completed!')
        .setDescription(`Order **${orderNumber}** has been completed by **${interaction.user.username}**\n\n✅ Service delivered successfully!\n\n**Thank you for choosing Dragon Services!** 🐲`)
        .addFields([
          {
            name: '⭐ Leave a Vouch',
            value: `Use: \`!leavevouch ${orderNumber} [feedback]\`\n\nExample: \`!leavevouch ${orderNumber} Great service!\``,
            inline: false
          },
          {
            name: '💰 Bonus Reward',
            value: `Leave a vouch on **both Discord and Sythe** and let us know - we'll add **20M GP** to your wallet (for services only)!`,
            inline: false
          },
          {
            name: '🚀 Next Steps',
            value: `Use \`/dragon-services\` for more orders\nCompleted: <t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: false
          }
        ])
        .setColor(0xFF6B35)
        .setFooter({ 
          text: '🐲 Dragon Services • Thank you!',
          iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        })
        .setTimestamp();

      // Create Leave Vouch button
      const vouchButton = new ButtonBuilder()
        .setCustomId(`leave_vouch_${orderNumber}`)
        .setLabel('⭐ Leave a Vouch')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🐲');

      // Create Sythe Vouch button (link to Sythe thread)
      const sytheVouchButton = new ButtonBuilder()
        .setLabel('📝 Vouch on Sythe')
        .setStyle(ButtonStyle.Link)
        .setURL('https://www.sythe.org/threads/4326552/osrs-services-vouchers/')
        .setEmoji('🌟');

      const row = new ActionRowBuilder()
        .addComponents(vouchButton, sytheVouchButton);

      await interaction.editReply({
        embeds: [completionEmbed],
        components: [row]
      });
    } else {
      await interaction.editReply({
        content: `❌ **Failed to Complete Order**\n\nAn error occurred while updating order **${orderNumber}**.`
      });
    }
    
  } catch (error) {
    console.error('Error handling complete order command:', error);
    try {
      await interaction.editReply({
        content: '❌ An error occurred while completing the order.'
      });
    } catch (replyError) {
      // If editReply fails, try regular reply (in case deferReply wasn't called)
      await interaction.reply({
        content: '❌ An error occurred while completing the order.',
        ephemeral: false
      }).catch(() => {});
    }
  }
}

// Handle Cancel Order Command - Refunds customer wallet
async function handleCancelOrderCommand(interaction: any) {
  try {
    // Defer reply immediately to prevent timeout
    await interaction.deferReply({ ephemeral: false });
    
    // Update command usage
    storage.updateCommandUsage('cancel-order').catch(() => {});
    
    const orderNumber = interaction.options.getString('order_number');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Find the order by order number
    const orders = await storage.getOrders();
    const order = orders.find(o => o.orderNumber === orderNumber);
    
    if (!order) {
      await interaction.editReply({
        content: `❌ **Order Not Found**\n\nNo order found with number: **${orderNumber}**\n\nPlease check the order number and try again.`
      });
      return;
    }
    
    if (order.status === 'cancelled') {
      await interaction.editReply({
        content: `⚠️ **Order Already Cancelled**\n\nOrder **${orderNumber}** is already cancelled.`
      });
      return;
    }
    
    if (order.status === 'completed') {
      await interaction.editReply({
        content: `❌ **Cannot Cancel Completed Order**\n\nOrder **${orderNumber}** has already been completed. Completed orders cannot be cancelled.`
      });
      return;
    }
    
    const refundAmount = order.totalAmountGp || 0;
    let workerDepositUnlocked = false;
    let workerUsername = 'Unknown';
    
    // If order was claimed by a worker, unlock their deposit
    if (order.workerId && order.lockedDepositGp && order.lockedDepositGp > 0) {
      try {
        const workerWallet = await storage.getUserWalletByUserIdAndType(order.workerId, 'worker');
        if (workerWallet) {
          await storage.unlockDeposit(workerWallet.id, order.lockedDepositGp);
          workerDepositUnlocked = true;
          workerUsername = workerWallet.username || 'Unknown Worker';
          console.log(`🔓 Unlocked ${order.lockedDepositGp} GP deposit for worker ${workerUsername} on cancelled order ${orderNumber}`);
        }
      } catch (depositError) {
        console.error('Error unlocking worker deposit on cancel:', depositError);
      }
    }
    
    // Refund customer wallet
    let customerRefunded = false;
    if (order.userId && refundAmount > 0) {
      try {
        // Find ANY wallet for this user (customer might be a worker with worker wallet)
        const allWallets = await storage.getUserWalletsByUserId(order.userId);
        let customerWallet = allWallets.find(w => w.userType === 'customer') || allWallets[0]; // Prefer customer wallet, fallback to any wallet
        
        console.log(`🔍 Looking for wallet for user ${order.userId}, found ${allWallets.length} wallets`);
        
        if (customerWallet) {
          console.log(`📝 Refunding to wallet ID: ${customerWallet.id}, type: ${customerWallet.userType}, current balance: ${customerWallet.balanceGp}`);
          
          // Add refund to customer wallet
          const result = await storage.adminAdjustGPCredits(
            customerWallet.id,
            refundAmount,
            'add',
            `Order cancellation refund for ${orderNumber}`
          );
          
          console.log(`✅ Refund processed: new balance = ${result.wallet.balanceGp} GP`);
          
          customerRefunded = true;
          console.log(`💰 Refunded ${refundAmount} GP to customer for cancelled order ${orderNumber}`);
          
          // Send DM to customer about refund
          try {
            const customerUser = await interaction.client.users.fetch(order.userId).catch(() => null);
            if (customerUser) {
              const refundEmbed = new EmbedBuilder()
                .setTitle('🐲 Order Cancelled - Wallet Refund')
                .setDescription(`Your order has been cancelled and your wallet has been refunded.`)
                .addFields([
                  {
                    name: '📋 Order Details',
                    value: `**Order:** ${orderNumber}\n**Status:** Cancelled`,
                    inline: true
                  },
                  {
                    name: '💰 Refund Amount',
                    value: `**+${formatGPAmount(refundAmount)}**`,
                    inline: true
                  },
                  {
                    name: '📝 Reason',
                    value: reason,
                    inline: false
                  }
                ])
                .setColor(0xFF6B35) // Dragon fire orange
                .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
                .setFooter({ 
                  text: '🐲 Dragon Services • Wallet Updated',
                  iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
                })
                .setTimestamp();
              
              await customerUser.send({ embeds: [refundEmbed] }).catch(() => {
                console.log('Could not send DM to customer about refund');
              });
            }
          } catch (dmError) {
            console.error('Error sending refund DM:', dmError);
          }
        }
      } catch (refundError) {
        console.error('Error refunding customer wallet:', refundError);
      }
    }
    
    // Update order status to cancelled
    const updatedOrder = await storage.updateOrderStatus(
      order.id,
      'cancelled',
      interaction.user.id,
      interaction.user.username,
      `Order cancelled by ${interaction.user.username}: ${reason}`
    );
    
    if (updatedOrder) {
      // Create cancellation embed
      const cancelEmbed = new EmbedBuilder()
        .setTitle('🐲 Order Cancelled')
        .setDescription(`Order **${orderNumber}** has been cancelled by **${interaction.user.username}**`)
        .addFields([
          {
            name: '📝 Cancellation Reason',
            value: reason,
            inline: false
          },
          {
            name: '💰 Customer Refund',
            value: customerRefunded 
              ? `✅ **${formatGPAmount(refundAmount)}** refunded to wallet`
              : '❌ No refund processed',
            inline: true
          },
          {
            name: '🔓 Worker Deposit',
            value: workerDepositUnlocked 
              ? `✅ ${formatGPAmount(order.lockedDepositGp || 0)} unlocked for ${workerUsername}`
              : '➖ No worker deposit to unlock',
            inline: true
          }
        ])
        .setColor(0xFF4444) // Red for cancellation
        .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
        .setFooter({ 
          text: '🐲 Dragon Services • Order Cancelled',
          iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [cancelEmbed]
      });
      
      console.log(`🚫 Order ${orderNumber} cancelled by ${interaction.user.username}. Refund: ${customerRefunded ? formatGPAmount(refundAmount) : 'None'}`);
    } else {
      await interaction.editReply({
        content: `❌ **Failed to Cancel Order**\n\nAn error occurred while cancelling order **${orderNumber}**.`
      });
    }
    
  } catch (error) {
    console.error('Error handling cancel order command:', error);
    try {
      await interaction.editReply({
        content: '❌ An error occurred while cancelling the order.'
      });
    } catch (replyError) {
      await interaction.reply({
        content: '❌ An error occurred while cancelling the order.',
        ephemeral: false
      }).catch(() => {});
    }
  }
}

// Handle /rsn command - Register RSN to receive Dink updates
async function handleRsnCommand(interaction: any) {
  try {
    // Defer reply to prevent Discord timeout
    await interaction.deferReply({ ephemeral: false });
    
    storage.updateCommandUsage('rsn').catch(() => {});
    
    // Check if user has permission (admin/staff only)
    const hasPermission = interaction.member?.permissions?.has('Administrator') || 
                         interaction.member?.roles?.cache?.some((role: any) => 
                           role.name.toLowerCase().includes('staff') || 
                           role.name.toLowerCase().includes('admin') ||
                           role.name.toLowerCase().includes('worker')
                         );
    
    if (!hasPermission) {
      await interaction.editReply({
        content: '❌ **Permission Denied**\n\nOnly staff members can register RSNs for Dink updates.'
      });
      return;
    }
    
    const rawRsn = interaction.options.getString('username');
    const orderNumber = interaction.options.getString('order_number');
    const channelId = interaction.channelId;
    const guildId = interaction.guildId;
    
    if (!rawRsn) {
      await interaction.editReply({
        content: '❌ **Invalid RSN**\n\nPlease provide a RuneScape username.'
      });
      return;
    }
    
    // Normalize RSN: trim whitespace
    const rsn = rawRsn.trim();
    
    // Check if RSN is already registered
    const existingRegistration = await storage.getRsnRegistration(rsn);
    if (existingRegistration) {
      await interaction.editReply({
        content: `⚠️ **RSN Already Registered**\n\nThe username **${rsn}** is already registered to channel <#${existingRegistration.channelId}>.\n\nUse \`/unrsn\` to unregister it first if you want to move it to this channel.`
      });
      return;
    }
    
    // Check if this channel already has an RSN registered
    const channelRegistration = await storage.getRsnRegistrationByChannel(channelId);
    if (channelRegistration) {
      // Deactivate the old registration
      await storage.deactivateRsnRegistration(channelRegistration.id);
    }
    
    // Find order if provided
    let orderId: string | undefined = undefined;
    if (orderNumber) {
      const orders = await storage.getOrders();
      const order = orders.find(o => o.orderNumber === orderNumber);
      if (order) {
        orderId = order.id;
      }
    }
    
    // Create the RSN registration
    await storage.createRsnRegistration({
      rsn: rsn,
      rsnLower: rsn.toLowerCase(),
      channelId: channelId,
      guildId: guildId,
      orderId: orderId,
      orderNumber: orderNumber || undefined,
      registeredBy: interaction.user.id,
      registeredByUsername: interaction.user.username,
      isActive: true
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🎮 RSN Registered for Dink Updates')
      .setDescription(`The RuneScape name **${rsn}** has been registered to receive Dink updates in this channel.`)
      .addFields([
        {
          name: '👤 RSN',
          value: `**${rsn}**`,
          inline: true
        },
        {
          name: '📺 Channel',
          value: `<#${channelId}>`,
          inline: true
        },
        {
          name: '📋 Order',
          value: orderNumber ? `**${orderNumber}**` : 'Not linked',
          inline: true
        }
      ])
      .setColor(0x00FF00) // Green for success
      .setFooter({ 
        text: '🐲 Dragon Services • Dink Integration',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();
    
    await interaction.editReply({
      embeds: [embed]
    });
    
    console.log(`✅ RSN "${rsn}" registered to channel ${channelId} by ${interaction.user.username}`);
    
  } catch (error) {
    console.error('Error handling RSN command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while registering the RSN.'
    }).catch(() => {});
  }
}

// Handle /unrsn command - Unregister RSN from Dink updates
async function handleUnrsnCommand(interaction: any) {
  try {
    // Defer reply to prevent Discord timeout
    await interaction.deferReply({ ephemeral: false });
    
    storage.updateCommandUsage('unrsn').catch(() => {});
    
    // Check if user has permission (admin/staff only)
    const hasPermission = interaction.member?.permissions?.has('Administrator') || 
                         interaction.member?.roles?.cache?.some((role: any) => 
                           role.name.toLowerCase().includes('staff') || 
                           role.name.toLowerCase().includes('admin') ||
                           role.name.toLowerCase().includes('worker')
                         );
    
    if (!hasPermission) {
      await interaction.editReply({
        content: '❌ **Permission Denied**\n\nOnly staff members can unregister RSNs from Dink updates.'
      });
      return;
    }
    
    const rawRsn = interaction.options.getString('username');
    const channelId = interaction.channelId;
    
    // Normalize RSN if provided: trim whitespace
    const rsn = rawRsn?.trim() || null;
    
    let registration;
    
    if (rsn) {
      // Find by RSN
      registration = await storage.getRsnRegistration(rsn);
      if (!registration) {
        await interaction.editReply({
          content: `❌ **RSN Not Found**\n\nThe username **${rsn}** is not registered for Dink updates.`
        });
        return;
      }
    } else {
      // Find by channel
      registration = await storage.getRsnRegistrationByChannel(channelId);
      if (!registration) {
        await interaction.editReply({
          content: '❌ **No RSN Registered**\n\nThis channel does not have an RSN registered for Dink updates.'
        });
        return;
      }
    }
    
    // Deactivate the registration
    await storage.deactivateRsnRegistration(registration.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🔓 RSN Unregistered')
      .setDescription(`The RuneScape name **${registration.rsn}** has been unregistered from Dink updates.`)
      .addFields([
        {
          name: '👤 RSN',
          value: `**${registration.rsn}**`,
          inline: true
        },
        {
          name: '🔕 Status',
          value: 'No longer receiving updates',
          inline: true
        }
      ])
      .setColor(0xFF6B35) // Orange
      .setFooter({ 
        text: '🐲 Dragon Services • Dink Integration',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();
    
    await interaction.editReply({
      embeds: [embed]
    });
    
    console.log(`🔓 RSN "${registration.rsn}" unregistered by ${interaction.user.username}`);
    
  } catch (error) {
    console.error('Error handling UNRSN command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while unregistering the RSN.'
    }).catch(() => {});
  }
}

// Dink webhook channel ID - loaded from database on startup
let dinkWebhookChannelId: string | null = null;

// Load Dink channel from database on startup
async function loadDinkChannelFromDatabase() {
  try {
    const savedChannelId = await storage.getBotSetting('dink_webhook_channel_id');
    if (savedChannelId) {
      dinkWebhookChannelId = savedChannelId;
      console.log(`📡 Loaded Dink webhook channel from database: ${savedChannelId}`);
    }
  } catch (error) {
    console.error('Error loading Dink channel from database:', error);
  }
}

// Handle Dink webhook messages - forward to registered ticket channels
async function handleDinkWebhookMessage(message: any) {
  try {
    // Log all bot messages for debugging
    console.log(`📡 Bot message received in channel ${message.channel.id} from ${message.author.username} (webhook: ${message.webhookId ? 'yes' : 'no'})`);
    console.log(`📡 Current dinkWebhookChannelId: ${dinkWebhookChannelId}`);
    
    // Only process messages from the configured Dink webhook channel
    if (!dinkWebhookChannelId || message.channel.id !== dinkWebhookChannelId) {
      console.log(`📡 Skipping - not from Dink channel (got ${message.channel.id}, want ${dinkWebhookChannelId})`);
      return;
    }
    
    // Check if message has embeds (Dink sends embeds)
    if (!message.embeds || message.embeds.length === 0) {
      console.log(`📡 Skipping - no embeds in message`);
      return;
    }
    
    console.log(`📡 Processing Dink webhook message in channel ${message.channel.id}`);
    
    // Try to extract RSN from the embed
    const embed = message.embeds[0];
    let rsn: string | null = null;
    
    // Dink typically includes the player name in various places
    // Check author name first (most common for Dink)
    if (embed.author?.name) {
      rsn = embed.author.name;
    }
    // Check title if author not found
    else if (embed.title) {
      // Try to extract player name from title patterns like "PlayerName achieved..."
      const titleMatch = embed.title.match(/^([A-Za-z0-9_\- ]{1,12})/);
      if (titleMatch) {
        rsn = titleMatch[1].trim();
      }
    }
    // Check footer
    else if (embed.footer?.text) {
      const footerMatch = embed.footer.text.match(/^([A-Za-z0-9_\- ]{1,12})/);
      if (footerMatch) {
        rsn = footerMatch[1].trim();
      }
    }
    
    if (!rsn) {
      console.log('📡 Could not extract RSN from Dink embed');
      return;
    }
    
    console.log(`📡 Extracted RSN: "${rsn}" from Dink embed`);
    
    // Look up the registered channel for this RSN (case-insensitive)
    const registration = await storage.getRsnRegistration(rsn);
    
    if (!registration) {
      console.log(`📡 No channel registered for RSN: ${rsn}`);
      return;
    }
    
    // Get the target ticket channel
    const targetChannel = await client?.channels.fetch(registration.channelId).catch(() => null);
    if (!targetChannel || !targetChannel.isTextBased()) {
      console.log(`📡 Could not find ticket channel ${registration.channelId} for RSN: ${rsn}`);
      return;
    }
    
    // Create a new embed to forward (copy the original with added context)
    const forwardEmbed = new EmbedBuilder()
      .setColor(embed.color || 0x5865F2);
    
    if (embed.title) forwardEmbed.setTitle(embed.title);
    if (embed.description) forwardEmbed.setDescription(embed.description);
    if (embed.author) forwardEmbed.setAuthor(embed.author);
    if (embed.thumbnail) forwardEmbed.setThumbnail(embed.thumbnail.url);
    if (embed.image) forwardEmbed.setImage(embed.image.url);
    if (embed.fields && embed.fields.length > 0) forwardEmbed.addFields(embed.fields);
    
    // Add footer indicating this was forwarded
    forwardEmbed.setFooter({ 
      text: `🐲 Dragon Services • RSN: ${rsn}`,
      iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
    });
    forwardEmbed.setTimestamp();
    
    // Send to the ticket channel
    await (targetChannel as any).send({ embeds: [forwardEmbed] });
    
    console.log(`📡 Forwarded Dink update for RSN "${rsn}" to channel ${registration.channelId}`);
    
  } catch (error) {
    console.error('Error handling Dink webhook message:', error);
  }
}

// Function to set the Dink webhook channel ID (also saves to database)
async function setDinkWebhookChannel(channelId: string) {
  dinkWebhookChannelId = channelId;
  try {
    await storage.setBotSetting('dink_webhook_channel_id', channelId);
    console.log(`📡 Dink webhook channel set and saved to database: ${channelId}`);
  } catch (error) {
    console.error('Error saving Dink channel to database:', error);
    console.log(`📡 Dink webhook channel set in memory: ${channelId}`);
  }
}

// Export for use in commands
export { setDinkWebhookChannel, dinkWebhookChannelId };

// Handle /set-dink-channel command - Set the webhook channel for Dink updates
async function handleSetDinkChannelCommand(interaction: any) {
  try {
    storage.updateCommandUsage('set-dink-channel').catch(() => {});
    
    // Check if user has admin permission
    const hasPermission = interaction.member?.permissions?.has('Administrator');
    
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ **Permission Denied**\n\nOnly administrators can set the Dink webhook channel.',
        ephemeral: true
      });
      return;
    }
    
    const channel = interaction.options.getChannel('channel');
    
    if (!channel) {
      await interaction.reply({
        content: '❌ Please specify a valid channel.',
        ephemeral: true
      });
      return;
    }
    
    // Set the Dink webhook channel (async - saves to database)
    await setDinkWebhookChannel(channel.id);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Dink Webhook Channel Set')
      .setDescription(`Dink updates from <#${channel.id}> will now be forwarded to registered ticket channels.`)
      .addFields([
        {
          name: '📋 How It Works',
          value: '1. Configure Dink in RuneLite to send to your Discord webhook\n2. Updates appear in this channel first\n3. Bot reads the RSN and forwards to the matching ticket channel\n4. Use `/rsn` in ticket channels to register RSNs',
          inline: false
        },
        {
          name: '📡 Webhook Channel',
          value: `<#${channel.id}>`,
          inline: true
        }
      ])
      .setColor(0x00D166)
      .setFooter({ 
        text: '🐲 Dragon Services • Dink Integration',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();
    
    await interaction.reply({
      embeds: [embed],
      ephemeral: false
    });
    
    console.log(`📡 Dink webhook channel set to ${channel.id} by ${interaction.user.username}`);
    
  } catch (error) {
    console.error('Error handling set-dink-channel command:', error);
    await interaction.reply({
      content: '❌ An error occurred while setting the Dink channel.',
      ephemeral: true
    }).catch(() => {});
  }
}

// Handle /dink-setup command - Show webhook URL for Dink configuration
async function handleDinkSetupCommand(interaction: any) {
  try {
    storage.updateCommandUsage('dink-setup').catch(() => {});
    
    // Check if user has permission (admin/staff only)
    const hasPermission = interaction.member?.permissions?.has('Administrator') || 
                         interaction.member?.roles?.cache?.some((role: any) => 
                           role.name.toLowerCase().includes('staff') || 
                           role.name.toLowerCase().includes('admin') ||
                           role.name.toLowerCase().includes('worker')
                         );
    
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ **Permission Denied**\n\nOnly staff members can view Dink setup information.',
        ephemeral: true
      });
      return;
    }
    
    const channelInfo = dinkWebhookChannelId 
      ? `<#${dinkWebhookChannelId}>`
      : '⚠️ Not configured - Use `/set-dink-channel` first!';
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 Dink Webhook Setup')
      .setDescription('Configure RuneLite\'s Dink plugin to send game updates through Discord.')
      .addFields([
        {
          name: '📡 Current Webhook Channel',
          value: channelInfo,
          inline: false
        },
        {
          name: '📋 Setup Instructions',
          value: '1. Create a webhook in your Discord channel\n2. Copy the webhook URL\n3. Open RuneLite → Plugin Hub → Install "Dink"\n4. Paste the webhook URL in Dink settings\n5. Use `/set-dink-channel` to tell the bot which channel to monitor\n6. Use `/rsn` in ticket channels to register RSNs',
          inline: false
        },
        {
          name: '🎮 How It Works',
          value: 'Dink → Discord Webhook Channel → Bot reads RSN → Forwards to matching ticket channel',
          inline: false
        }
      ])
      .setColor(0x5865F2)
      .setFooter({ 
        text: '🐲 Dragon Services • Dink Integration',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();
    
    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
    
    console.log(`📡 Dink setup info requested by ${interaction.user.username}`);
    
  } catch (error) {
    console.error('Error handling dink-setup command:', error);
    await interaction.reply({
      content: '❌ An error occurred while getting Dink setup information.',
      ephemeral: true
    }).catch(() => {});
  }
}

// Handle calculator start
async function handleCalculatorStart(interaction: any) {
  const services = await storage.getServices();
  
  const embed = createServiceSelectionEmbed();
  const components = createServiceSelectionComponents(services);

  await interaction.reply({
    embeds: [embed],
    components: components,
    ephemeral: true
  });
}

// Handle calculator calculation
async function handleCalculatorCalculate(interaction: any) {
  // Get user's selected services from their session (you'd store this in memory or database)
  // For now, let's create a simple example
  
  // This would be retrieved from user session data
  const selectedServices = [
    { name: "Recipe for Disaster", price: "50M", service: "Questing" },
    { name: "Elite Diaries", price: "100M", service: "Dairy" }
  ];
  
  const embed = createCalculationResultEmbed(selectedServices);
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

// Handle calculator reset
async function handleCalculatorReset(interaction: any) {
  await handleCalculatorStart(interaction);
}

// Handle adding service to calculator
async function handleCalculatorAddService(interaction: any) {
  const serviceId = interaction.customId.replace('calc_add_', '');
  const service = await storage.getService(serviceId);
  
  if (!service) {
    await interaction.reply({
      content: 'Service not found.',
      ephemeral: true
    });
    return;
  }

  // Show service options for selection
  const embed = createServiceOptionsEmbed(service);
  const selectMenu = createServiceOptionsSelectMenu(service);

  await interaction.reply({
    embeds: [embed],
    components: selectMenu ? [selectMenu] : [],
    ephemeral: true
  });
}

// Handle removing service from calculator  
async function handleCalculatorRemoveService(interaction: any) {
  await interaction.reply({
    content: 'Service removed from calculator.',
    ephemeral: true
  });
}

// Handle contact support button
async function handleContactSupport(interaction: any) {
  const embed = new EmbedBuilder()
    .setTitle('🐲 Dragon Services Support')
    .setDescription('**Ready to get started?** Our expert team is here to help!\n\n' +
                   '**📞 Contact Methods:**\n' +
                   '• **Discord:** Create a support ticket in our server\n' +
                   '• **Email:** support@dragonservices.gg\n' +
                   '• **Live Chat:** Available 24/7 in our Discord\n\n' +
                   '**⚡ What to include:**\n' +
                   '• Your OSRS username\n' +
                   '• Service you selected\n' +
                   '• Any special requirements\n' +
                   '• Preferred timeline')
    .setColor(0xFF6B35)
    .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
    .setFooter({
      text: '🐲 Dragon Services • Professional OSRS Services • Est. 2024',
      iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

// Handle back to services button
async function handleBackToServices(interaction: any) {
  try {
    const services = await storage.getServices();
    const embed = createServicesEmbed();
    const selectMenu = createServicesSelectMenu(services);

    await interaction.reply({
      embeds: [embed],
      components: [selectMenu],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error showing services:', error);
    await interaction.reply({
      content: 'Error loading services. Please try again.',
      ephemeral: true
    });
  }
}

// Skill calculator command handler
async function handleSkillCalculatorCommand(message: any) {
  try {
    // Parse command: !s skillname startlevel endlevel
    const args = message.content.slice(3).trim().split(' ');
    
    if (args.length < 3) {
      await message.reply('❌ **Invalid format!** Use: `!s skillname startlevel endlevel`\n\n' +
                         '**Examples:**\n' +
                         '• `!s slayer 1 99` - Calculate Slayer 1-99\n' +
                         '• `!s cooking 50 80` - Calculate Cooking 50-80\n' +
                         '• `!s magic 1 70` - Calculate Magic 1-70');
      return;
    }

    const skillName = args[0].toLowerCase();
    const startLevel = parseInt(args[1]);
    const endLevel = parseInt(args[2]);

    // Validate levels
    if (isNaN(startLevel) || isNaN(endLevel) || startLevel < 1 || endLevel > 126 || startLevel >= endLevel) {
      await message.reply('❌ **Invalid levels!** Start and end levels must be numbers between 1-126, and start level must be less than end level.');
      return;
    }

    // Find skill (case insensitive, exact match first, then partial match)
    const skills = await storage.getSkills();
    console.log(`🔍 Looking for skill: "${skillName}"`);
    console.log(`📋 Available skills: ${skills.map(s => s.name).join(', ')}`);
    
    // First try exact match
    let skill = skills.find(s => s.name.toLowerCase() === skillName);
    console.log(`🎯 Exact match result: ${skill ? skill.name : 'Not found'}`);
    
    // If no exact match, try partial match but prioritize longer matches
    if (!skill) {
      // Sort by name length (longer names first) to prioritize "runecrafting" over "crafting"
      const sortedSkills = skills.sort((a, b) => b.name.length - a.name.length);
      skill = sortedSkills.find(s => s.name.toLowerCase().includes(skillName) || skillName.includes(s.name.toLowerCase()));
      console.log(`🔄 Partial match result: ${skill ? skill.name : 'Not found'}`);
    }
    
    if (!skill) {
      const availableSkills = skills.map(s => s.name).join(', ');
      await message.reply(`❌ **Skill not found!** Available skills: ${availableSkills}`);
      return;
    }

    // Get training methods for this skill
    const trainingMethods = await storage.getTrainingMethodsBySkill(skill.id);
    
    if (trainingMethods.length === 0) {
      await message.reply(`❌ **No training methods found for ${skill.name}!** Please contact an admin to add training methods.`);
      return;
    }

    // Calculate experience needed
    const startExp = await storage.getExperienceByLevel(startLevel);
    const endExp = await storage.getExperienceByLevel(endLevel);
    
    if (startExp === null || startExp === undefined || endExp === null || endExp === undefined) {
      await message.reply('❌ **Error:** Could not find experience data for those levels.');
      return;
    }

    const expNeeded = endExp - startExp;
    
    // Debug logging
    console.log(`📊 Skill Calculator Debug:`);
    console.log(`  Skill: ${skill.name}`);
    console.log(`  Range: ${startLevel} → ${endLevel}`);
    console.log(`  Start XP: ${startExp.toLocaleString()}`);
    console.log(`  End XP: ${endExp.toLocaleString()}`);
    console.log(`  XP Needed: ${expNeeded.toLocaleString()}`);

    // Get user's wallet data for rank-based discount
    const userId = message.author.id;
    let userWallet = null;
    let discountInfo = null;
    
    try {
      userWallet = await storage.getUserWallet(userId);
    } catch (error) {
      // User doesn't have wallet yet, no discount applied
    }

    // Calculate pricing using method-based level ranges
    // Each method shows separately with its applicable level range
    const methodBreakdown: any[] = [];
    let totalOriginalCost = 0;
    let totalExpCovered = 0;
    
    // Use the methods in their configured sort order (already sorted by database query)
    console.log(`  🔍 Processing methods for level range ${startLevel}-${endLevel}:`);
    
    for (const method of trainingMethods) {
      const methodMinLevel = method.minLevel || 1;
      const methodMaxLevel = method.maxLevel || 99;
      
      // Determine the overlapping range between requested levels and method's level range
      const rangeStart = Math.max(startLevel, methodMinLevel);
      const rangeEnd = Math.min(endLevel, methodMaxLevel);
      
      // Skip if there's no overlap OR if start and end are the same (0 XP range)
      if (rangeStart >= rangeEnd) {
        console.log(`  ⏭️  Skipping ${method.name}: no overlap (method: ${methodMinLevel}-${methodMaxLevel}, requested: ${startLevel}-${endLevel})`);
        continue;
      }
      
      // Calculate XP for this specific range
      const rangeStartExp = await storage.getExperienceByLevel(rangeStart);
      const rangeEndExp = await storage.getExperienceByLevel(rangeEnd);
      
      if (rangeStartExp === null || rangeStartExp === undefined || rangeEndExp === null || rangeEndExp === undefined) {
        console.log(`  ⚠️  Could not get XP for range ${rangeStart}-${rangeEnd}`);
        continue;
      }
      
      const rangeExpNeeded = rangeEndExp - rangeStartExp;
      
      // Skip if there's no XP to gain (shouldn't happen, but double-check)
      if (rangeExpNeeded <= 0) {
        console.log(`  ⏭️  Skipping ${method.name}: 0 XP (Levels ${rangeStart}-${rangeEnd})`);
        continue;
      }
      
      const gpPerXp = parseFloat(method.gpPerXp);
      const rangeCost = rangeExpNeeded * gpPerXp;
      const rangeHours = rangeExpNeeded / (method.xpPerHour || 50000);
      
      totalOriginalCost += rangeCost;
      totalExpCovered += rangeExpNeeded;
      
      console.log(`  📈 ${method.name}: Levels ${rangeStart}-${rangeEnd}`);
      console.log(`    XP Needed: ${rangeExpNeeded.toLocaleString()}`);
      console.log(`    GP/XP: ${gpPerXp}`);
      console.log(`    Cost: ${rangeCost.toLocaleString()} GP`);
      
      methodBreakdown.push({
        method,
        levelRange: `${rangeStart}-${rangeEnd}`,
        rangeStart,
        rangeEnd,
        expNeeded: rangeExpNeeded,
        gpPerXp,
        originalCost: rangeCost,
        estimatedHours: rangeHours
      });
    }
    
    // Check if no methods were found
    if (methodBreakdown.length === 0) {
      await message.reply(`❌ **No applicable training methods found!**\n\n` +
        `No training methods are configured for ${skill.name} that cover levels ${startLevel}-${endLevel}.\n` +
        `Please contact an admin to add training methods for this skill.`);
      return;
    }
    
    // Apply customer rank discount to total cost
    let finalTotalCost = totalOriginalCost;
    let discountAmount = 0;
    let discountPercentage = 0;
    
    if (userWallet && userWallet.totalSpentGp > 0) {
      const discount = applyCustomerDiscount(totalOriginalCost, userWallet.totalSpentGp, userWallet.manualRank);
      discountInfo = discount;
      finalTotalCost = discount.finalPrice;
      discountAmount = discount.discountAmount;
      discountPercentage = discount.discountPercentage;
      
      console.log(`  💰 Total Cost Before Discount: ${totalOriginalCost.toLocaleString()} GP`);
      console.log(`  🎁 Discount Applied: ${discountPercentage}% (${discountAmount.toLocaleString()} GP)`);
      console.log(`  ✅ Final Cost: ${finalTotalCost.toLocaleString()} GP`);
    } else {
      console.log(`  💰 Total Cost: ${totalOriginalCost.toLocaleString()} GP (no discount)`);
    }
    
    // Apply discount proportionally to each method's cost
    // Use Math.floor to avoid rounding issues, and apply remaining to last method
    let remainingDiscount = discountAmount;
    const methodCalculations = methodBreakdown.map((breakdown, index) => {
      const isLast = index === methodBreakdown.length - 1;
      const proportion = breakdown.originalCost / totalOriginalCost;
      const methodDiscount = isLast ? remainingDiscount : Math.floor(discountAmount * proportion);
      remainingDiscount -= methodDiscount;
      const methodFinalCost = breakdown.originalCost - methodDiscount;
      
      return {
        method: breakdown.method,
        levelRange: breakdown.levelRange,
        rangeStart: breakdown.rangeStart,
        rangeEnd: breakdown.rangeEnd,
        expNeeded: breakdown.expNeeded,
        gpPerXp: breakdown.gpPerXp,
        originalCost: breakdown.originalCost,
        totalCost: methodFinalCost,
        discountAmount: methodDiscount,
        discountPercentage,
        estimatedHours: breakdown.estimatedHours
      };
    });

    // Update command usage
    storage.updateCommandUsage('skill-calculator').catch(() => {});
    
    // Create and send result embed
    const embed = createSkillCalculatorEmbed({
      skill,
      startLevel,
      endLevel,
      expNeeded,
      methods: methodCalculations,
      userRank: userWallet ? getCustomerRank(userWallet.totalSpentGp, userWallet.manualRank) : null,
      totalSpent: userWallet ? userWallet.totalSpentGp : 0,
      discountApplied: discountInfo !== null
    });

    console.log(`Skill calculator: ${skill.name} with icon: ${skill.icon}`);
    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in skill calculator:', error);
    await message.reply('❌ An error occurred while calculating. Please try again.');
  }
}

// Quest abbreviation mapping for easier access
function getQuestAbbreviations(): { [key: string]: string } {
  return {
    // Popular quest abbreviations
    'rfd': 'recipe for disaster',
    'ds': 'dragon slayer i',
    'ds1': 'dragon slayer i', 
    'ds2': 'dragon slayer ii',
    'mm1': 'monkey madness i',
    'mm2': 'monkey madness ii',
    'dt': 'desert treasure',
    'sote': 'song of the elves',
    'akd': 'a kingdom divided',
    'sof': 'sins of the father',
    'ld': 'lunar diplomacy',
    'am': 'animal magnetism',
    'wq': 'waterfall quest',
    'fc': 'fire cape service',
    'ic': 'infernal cape service',
    'qpc': 'quest point cape',
    'ca': 'cooking assistant',
    'vs': 'vampyre slayer',
    'dm': 'demon slayer',
    'wh': 'witch house',
    'up': 'underground pass',
    'reg': 'regicide',
    'me1': 'mourning end part i',
    'me2': 'mourning end part ii',
    'mep1': 'mourning end part i',
    'mep2': 'mourning end part ii',
    'wtl': 'within the light',
    'bg': 'barrows gloves quest line',
    'hq': 'heroes quest',
    'lq': 'legends quest',
    'lc': 'lost city',
    'tgv': 'tree gnome village',
    'tgt': 'the grand tree',
    'pp': 'priest in peril',
    'rg': 'restless ghost',
    'rj': 'romeo juliet',
    'shearer': 'sheep shearer',
    'soa': 'shield of arrav',
    'etc': 'ernest the chicken',
    'ks': 'knights sword',
    'dq': 'doric quest',
    'rm': 'rune mysteries',
    'bio': 'biohazard',
    'pc': 'plague city',
    'dc': 'dwarf cannon',
    'gc': 'gertrudes cat',
    'hc': 'hazeel cult',
    'jp': 'jungle potion',
    'mc': 'merlin crystal',
    'oq': 'observatory quest',
    'sh': 'sheep herder',
    'dr': 'druidic ritual',
    'ft': 'fremennik trials',
    'fi': 'fremennik isles',
    'ts': 'troll stronghold',
    'tr': 'troll romance',
    'tom': 'throne of miscellania',
    'rt': 'royal trouble',
    'swansong': 'swan song',
    'tog': 'tears of guthix',
    'ma': 'mage arena',
    'ma2': 'mage arena ii',
    'eta': 'enter the abyss',
    'famcrest': 'family crest',
    'bkf': 'black knights fortress',
    'dp': 'death plateau',
    'par': 'prince ali rescue',
    'pt': 'pirates treasure',
    'imp': 'imp catcher',
    'gd': 'goblin diplomacy',
    'ep': 'eagles peak'
  };
}

// Quest calculator command handler
async function handleQuestCalculatorCommand(message: any) {
  try {
    // Parse command: !q questname or !q quest1, quest2, quest3
    const fullInput = message.content.slice(3).trim();
    
    if (!fullInput) {
      await message.reply('❌ **Invalid format!** Use: `!q questname` or `!q quest1, quest2, quest3`\n\n' +
                         '**Single Quest Examples:**\n' +
                         '• `!q rfd` - Recipe for Disaster pricing\n' +
                         '• `!q ds2` - Dragon Slayer II pricing\n' +
                         '• `!q cooking assistant` - Full name also works\n\n' +
                         '**Multiple Quest Examples:**\n' +
                         '• `!q rfd, ds2, sote` - Short forms for multiple quests\n' +
                         '• `!q cooking assistant, dragon slayer` - Mix short and full names\n\n' +
                         '**Popular Short Forms:**\n' +
                         '• RFD, DS/DS2, MM1/MM2, DT, SOTE, AKD, SOF, LD, AM, WQ, FC, IC, QPC');
      return;
    }

    // Split by commas for multiple quests, fallback to single quest
    const questInputs = fullInput.includes(',') 
      ? fullInput.split(',').map((q: string) => q.trim().toLowerCase())
      : [fullInput.toLowerCase()];

    // Get quest abbreviations
    const abbreviations = getQuestAbbreviations();

    // Get all available quests
    const allQuests = await storage.getQuests();
    
    // Find matching quests
    const foundQuests = [];
    const notFoundQuests = [];

    for (let questInput of questInputs) {
      // First check if it's an abbreviation
      if (abbreviations[questInput]) {
        questInput = abbreviations[questInput];
      }

      // First try exact match
      let quest = allQuests.find(q => q.name.toLowerCase() === questInput);
      
      // If no exact match, try partial match but prioritize longer matches
      if (!quest) {
        const sortedQuests = allQuests.sort((a, b) => b.name.length - a.name.length);
        quest = sortedQuests.find(q => q.name.toLowerCase().includes(questInput) || questInput.includes(q.name.toLowerCase()));
      }
      
      if (quest) {
        foundQuests.push(quest);
      } else {
        notFoundQuests.push(questInput);
      }
    }

    // Report not found quests
    if (notFoundQuests.length > 0) {
      const availableQuests = allQuests.slice(0, 10).map(q => q.name).join(', ');
      await message.reply(`❌ **Quest(s) not found:** ${notFoundQuests.join(', ')}\n\n**Available quests:** ${availableQuests}... (and more)`);
      return;
    }

    if (foundQuests.length === 0) {
      await message.reply('❌ **No quests found!** Please check your spelling.');
      return;
    }

    // Get pricing from quest pricing table
    const questsWithPricing = [];

    for (const quest of foundQuests) {
      const questPricingRows = await storage.getQuestPricingByQuest(quest.id);
      const activePricing = questPricingRows.filter(p => p.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      if (activePricing.length > 0) {
        const formatGp = (val: string | number) => {
          const n = typeof val === 'string' ? parseFloat(val) : val;
          if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
          if (n >= 1000000)    return `${(n / 1000000).toFixed(1)}M`;
          if (n >= 1000)       return `${(n / 1000).toFixed(1)}K`;
          return `${n}`;
        };
        const priceItems = activePricing.map(p => ({ name: p.serviceType || 'Standard', price: formatGp(p.price) }));
        questsWithPricing.push({ quest, priceItems, note: null });
      }
    }

    if (questsWithPricing.length === 0) {
      await message.reply(`❌ **No pricing found for any of the selected quests!**\nAdd prices in the Quest Management dashboard first.`);
      return;
    }

    // Get user's wallet data for rank-based discount
    const userId = message.author.id;
    let userWallet = null;
    
    try {
      userWallet = await storage.getUserWallet(userId);
    } catch (error) {
      // User doesn't have wallet yet, no discount applied
    }

    // Apply rank-based discounts to priceItems
    const questsWithDiscounts = questsWithPricing.map(questData => {
      const discountedItems = questData.priceItems.map((item: any) => {
        // Parse price string like "50M", "1.5B", "500K"
        const parsePrice = (p: string): number => {
          const s = p.toString().toLowerCase().replace(/\s+/g, '');
          if (s.includes('b')) return parseFloat(s) * 1000000000;
          if (s.includes('m')) return parseFloat(s) * 1000000;
          if (s.includes('k')) return parseFloat(s) * 1000;
          return parseFloat(s);
        };

        const originalPrice = parsePrice(item.price);
        if (userWallet && userWallet.totalSpentGp > 0) {
          const discount = applyCustomerDiscount(originalPrice, userWallet.totalSpentGp, userWallet.manualRank);
          return { ...item, originalPrice, finalPrice: discount.finalPrice, discountAmount: discount.discountAmount, discountPercentage: discount.discountPercentage };
        } else {
          return { ...item, originalPrice, finalPrice: originalPrice, discountAmount: 0, discountPercentage: 0 };
        }
      });

      return { ...questData, priceItems: discountedItems };
    });

    // Update command usage
    storage.updateCommandUsage('quest-calculator').catch(() => {});
    
    // Create and send result embed
    if (questsWithDiscounts.length === 1) {
      // Single quest - use existing embed
      const questData = {
        ...questsWithDiscounts[0],
        userRank: userWallet ? getCustomerRank(userWallet.totalSpentGp, userWallet.manualRank) : null,
        totalSpent: userWallet ? userWallet.totalSpentGp : 0,
        discountApplied: userWallet && userWallet.totalSpentGp > 0
      };
      const embed = createQuestCalculatorEmbed(questData);
      console.log(`Quest calculator: ${questsWithDiscounts[0].quest.name} with icon: ${questsWithDiscounts[0].quest.icon}`);
      await message.reply({ embeds: [embed] });
    } else {
      // Multiple quests - use new multi-quest embed
      const questsDataWithRank = {
        questsData: questsWithDiscounts,
        userRank: userWallet ? getCustomerRank(userWallet.totalSpentGp, userWallet.manualRank) : null,
        totalSpent: userWallet ? userWallet.totalSpentGp : 0,
        discountApplied: userWallet && userWallet.totalSpentGp > 0
      };
      const embed = createMultiQuestCalculatorEmbed(questsWithDiscounts);
      console.log(`Multi-quest calculator: ${questsWithDiscounts.length} quests calculated`);
      await message.reply({ embeds: [embed] });
    }

  } catch (error) {
    console.error('Error in quest calculator:', error);
    await message.reply('❌ An error occurred while getting quest pricing. Please try again.');
  }
}

async function handleClaimOffer(interaction: any) {
  try {
    const offerId = interaction.customId.replace('claim_offer_', '');
    const offer = await storage.getSpecialOffer(offerId);
    
    if (!offer) {
      await interaction.reply({
        content: '❌ Offer not found!',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔥 Claim Your Special Offer!')
      .setDescription(`**${offer.title}**\n\n` +
                     '🎉 **Great choice!** To claim this exclusive offer:\n\n' +
                     '1. 📞 Contact our support team\n' +
                     '2. 🆔 Mention offer ID: `' + offer.id + '`\n' +
                     '3. 💬 Let them know you want to claim this deal\n' +
                     '4. 🚀 We\'ll get you started immediately!\n\n' +
                     '**📋 Offer Details:**\n' +
                     `💰 ${offer.salePrice}\n` +
                     `🔥 ${offer.discountPercentage}% OFF\n` +
                     `⏰ Valid until: <t:${Math.floor(new Date(offer.expiresAt!).getTime() / 1000)}:F>`)
      .setColor(0x00FF00)
      .setThumbnail('https://oldschool.runescape.wiki/images/thumb/1/10/Coins_detail.png/130px-Coins_detail.png')
      .setFooter({
        text: '🐲 Dragon Services',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling claim offer:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing your request.',
      ephemeral: true
    });
  }
}

async function handleBackToOffers(interaction: any) {
  try {
    // Get active special offers from storage
    const offers = await storage.getActiveOffers();
    
    // Create the deals embed
    const embed = createSpecialOffersEmbed(offers);
    const selectMenu = createOffersSelectMenu(offers);

    const components = selectMenu ? [selectMenu] : [];

    await interaction.reply({
      embeds: [embed],
      components: components,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling back to offers:', error);
    await interaction.reply({
      content: '❌ An error occurred while loading offers.',
      ephemeral: true
    });
  }
}

async function handleContactOffer(interaction: any) {
  try {
    const offerId = interaction.customId.replace('contact_offer_', '');
    const offer = await storage.getSpecialOffer(offerId);
    
    if (!offer) {
      await interaction.reply({
        content: '❌ Offer not found!',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('💬 Contact Support for Special Offer')
      .setDescription(`**${offer.title}**\n\n` +
                     '📞 **Ready to get started?** Here\'s how to contact us:\n\n' +
                     '**🎯 Discord Support:**\n' +
                     '• Open a support ticket\n' +
                     '• Mention offer ID: `' + offer.id + '`\n' +
                     '• Our team will respond within minutes!\n\n' +
                     '**💬 Live Chat:**\n' +
                     '• Available 24/7 for immediate assistance\n' +
                     '• Fast response times\n' +
                     '• Professional service team\n\n' +
                     '**📋 Offer Details:**\n' +
                     `💰 Price: ${offer.salePrice}\n` +
                     `🔥 Discount: ${offer.discountPercentage}% OFF\n` +
                     `⏰ Expires: <t:${Math.floor(new Date(offer.expiresAt!).getTime() / 1000)}:R>`)
      .setColor(0x0099FF)
      .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
      .setFooter({
        text: '🐲 Dragon Services • We\'re here to help!',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling contact offer:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing your request.',
      ephemeral: true
    });
  }
}

// Wallet Commands
async function handleWalletCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('wallet').catch(() => {});
    
    const userId = message.author.id;
    const username = message.author.username;
    
    // Get or create user wallet
    let wallet = await storage.getUserWallet(userId);
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await storage.createUserWallet({
        userId: userId,
        username: username,
        balanceGp: 0,
        totalDepositedGp: 0,
        totalSpentGp: 0,
        totalEarningsGp: 0
      });
    }

    // Format GP amount for better readability
    const formatGPAmount = (amount: number) => {
      if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(2)}M`;
      } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K`;
      }
      return amount.toString();
    };

    // Check if user is worker or customer
    const isWorker = wallet.userType === 'worker';
    
    // Create different embeds based on user type
    let embed;
    
    if (isWorker) {
      // Worker Wallet Design - Mobile-Friendly
      const totalDeposited = wallet.totalDepositedGp || 0;
      const lockedDeposit = wallet.workingDepositGp || 0;
      const availableSecurity = totalDeposited - lockedDeposit;
      
      embed = {
        color: 0xFF6B35,
        title: '🐲⚒️ Worker Wallet',
        description: `**${username}**\n⚡ Worker`,
        fields: [
          {
            name: '💰 Balance',
            value: `**${formatGPAmount(wallet.balanceGp)} GP**`,
            inline: false
          },
          {
            name: '📊 Stats',
            value: `Jobs: **${wallet.completedJobs || 0}**\nEarned: **${formatGPAmount(wallet.totalEarningsGp || 0)} GP**`,
            inline: false
          },
          {
            name: '🏦 Deposits',
            value: `Total: **${formatGPAmount(totalDeposited)} GP**\nLocked: **${formatGPAmount(lockedDeposit)} GP**\nAvailable: **${formatGPAmount(availableSecurity)} GP**`,
            inline: false
          }
        ],
        footer: {
          text: '🐲 70% commission • Use !deposit for security',
          icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        },
        timestamp: new Date().toISOString()
      };
    } else {
      // Customer Wallet Design - Mobile-Friendly
      const rankInfo = getCustomerRank(wallet.totalSpentGp || 0, wallet.manualRank);
      const discountPercent = getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank);
      
      embed = {
        color: 0xFF6B35,
        title: '🐲👑 Customer Wallet',
        description: `**${username}**\n✨ Premium Customer | Dragon Services`,
        fields: [
          {
            name: '💰 Balance',
            value: `**${formatGPAmount(wallet.balanceGp)} GP**`,
            inline: false
          },
          {
            name: '🏆 VIP Status',
            value: rankInfo 
              ? `${rankInfo.emoji} **${rankInfo.name}**\n💸 ${discountPercent}% Discount${wallet.manualRank ? ' (Override)' : ''}`
              : `🌟 New Customer\n🎯 Spend 100M+ GP for VIP rank`,
            inline: false
          },
          {
            name: '📊 Stats',
            value: `Orders: **${wallet.totalOrders || 0}**\nSpent: **${formatGPAmount(wallet.totalSpentGp || 0)} GP**\nDeposited: **${formatGPAmount(wallet.totalDepositedGp || 0)} GP**`,
            inline: false
          }
        ],
        footer: {
          text: '🐲 Dragon Services • Use !deposit to add GP',
          icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        },
        timestamp: new Date().toISOString()
      };
    }

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error handling !wallet command:', error);
    await message.reply('❌ An error occurred while loading your wallet. Please try again later.');
  }
}

// Admin-only command to check any user's wallet
async function handleCheckWalletCommand(message: any) {
  try {
    // Check if user is admin/staff (adjust role names as needed)
    const member = message.member;
    const hasAdminRole = member?.roles.cache.some((role: any) => 
      role.name.toLowerCase().includes('admin') || 
      role.name.toLowerCase().includes('staff') ||
      role.name.toLowerCase().includes('owner') ||
      role.name.toLowerCase().includes('manager')
    );
    
    if (!hasAdminRole && !member?.permissions.has('Administrator')) {
      await message.reply('❌ **Permission Denied!**\n\nThis command is restricted to staff members only. Use `!wallet` to check your own wallet.');
      return;
    }
    
    // Parse command: !checkwallet @user
    const args = message.content.split(' ');
    if (args.length < 2 || !args[1].startsWith('<@')) {
      await message.reply('❌ **Invalid Format!**\n\nUsage: `!checkwallet @user`\n\nExample: `!checkwallet @JohnDoe`');
      return;
    }
    
    // Extract user ID from mention
    const targetUserId = args[1].replace(/[<@!>]/g, '');
    
    // Try to fetch the user from Discord
    let targetUser;
    let targetUsername = 'Unknown User';
    try {
      targetUser = await client.users.fetch(targetUserId);
      targetUsername = targetUser.username;
    } catch (err) {
      await message.reply('❌ **User Not Found!**\n\nCould not find the mentioned user. Make sure you mention a valid Discord user.');
      return;
    }
    
    // Get user wallet
    const wallet = await storage.getUserWallet(targetUserId);
    
    if (!wallet) {
      await message.reply({
        embeds: [{
          color: 0xFF6B35,
          title: '🔍 Staff Wallet Check - Dragon Services',
          description: `📋 **Checking wallet for:** ${targetUsername}\n\n❌ **No Wallet Found**\n\nThis user does not have a wallet yet. They need to use \`!wallet\` first to create one.`,
          footer: {
            text: `🐲 Dragon Services • Staff Command • Requested by ${message.author.username}`,
            icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
          },
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }
    
    // Check if user is worker or customer
    const isWorker = wallet.userType === 'worker';

    let embed;

    if (isWorker) {
      const totalDeposited = wallet.totalDepositedGp || 0;
      const lockedDeposit = wallet.workingDepositGp || 0;
      const availableSecurity = totalDeposited - lockedDeposit;

      embed = {
        color: 0xFF6B35,
        title: '🐲⚒️ Worker Wallet',
        description: `**${targetUsername}**\n⚡ Worker`,
        fields: [
          {
            name: '💰 Balance',
            value: `**${formatGPAmount(wallet.balanceGp)} GP**`,
            inline: false
          },
          {
            name: '📊 Stats',
            value: `Jobs: **${wallet.completedJobs || 0}**\nEarned: **${formatGPAmount(wallet.totalEarningsGp || 0)} GP**`,
            inline: false
          },
          {
            name: '🏦 Deposits',
            value: `Total: **${formatGPAmount(totalDeposited)} GP**\nLocked: **${formatGPAmount(lockedDeposit)} GP**\nAvailable: **${formatGPAmount(availableSecurity)} GP**`,
            inline: false
          }
        ],
        footer: {
          text: `🐲 Staff Check • Requested by ${message.author.username}`,
          icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        },
        timestamp: new Date().toISOString()
      };
    } else {
      const rankInfo = getCustomerRank(wallet.totalSpentGp || 0, wallet.manualRank);
      const discountPercent = getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank);

      embed = {
        color: 0xFF6B35,
        title: '🐲👑 Customer Wallet',
        description: `**${targetUsername}**\n✨ Premium Customer | Dragon Services`,
        fields: [
          {
            name: '💰 Balance',
            value: `**${formatGPAmount(wallet.balanceGp)} GP**`,
            inline: false
          },
          {
            name: '🏆 VIP Status',
            value: rankInfo
              ? `${rankInfo.emoji} **${rankInfo.name}**\n💸 ${discountPercent}% Discount${wallet.manualRank ? ' (Override)' : ''}`
              : `🌟 New Customer\n🎯 Spend 100M+ GP for VIP rank`,
            inline: false
          },
          {
            name: '📊 Stats',
            value: `Orders: **${wallet.totalOrders || 0}**\nSpent: **${formatGPAmount(wallet.totalSpentGp || 0)} GP**\nDeposited: **${formatGPAmount(wallet.totalDepositedGp || 0)} GP**`,
            inline: false
          }
        ],
        footer: {
          text: `🐲 Staff Check • Requested by ${message.author.username}`,
          icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        },
        timestamp: new Date().toISOString()
      };
    }

    await message.reply({ embeds: [embed] });
    
    // Log the staff check
    console.log(`🔍 Staff wallet check: ${message.author.username} checked ${targetUsername}'s wallet`);
    
  } catch (error) {
    console.error('Error handling !checkwallet command:', error);
    await message.reply('❌ An error occurred while checking the wallet. Please try again later.');
  }
}

async function handleDepositCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('deposit').catch(() => {});
    
    const userId = message.author.id;
    const username = message.author.username;
    
    // Check if this is an admin deposit command: !deposit @user 200M
    const args = message.content.split(' ');
    if (args.length >= 3 && args[1].startsWith('<@') && args[1].endsWith('>')) {
      // This is an admin deposit command
      await handleAdminDeposit(message, args);
      return;
    }
    
    // Regular deposit info command
    const paymentMethods = await storage.getActivePaymentMethods();
    
    // Create deposit info embed
    const embed = {
      color: 0x22C55E,
      title: '💳 Deposit Funds',
      description: 'Add GP to your wallet',
      fields: [
        {
          name: '💰 Payment Methods',
          value: paymentMethods.length > 0 
            ? paymentMethods.map(method => `${method.icon || '💳'} ${method.displayName}`).join('\n')
            : 'None available',
          inline: false
        },
        {
          name: '👑 Admin Commands',
          value: '`!deposit @user 200M`\n`!deposit @user 1B worker`\n\nFormats: M, B\nExample: 2.5B = 2500M',
          inline: false
        }
      ],
      footer: {
        text: 'Use !wallet to check balance',
        icon_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=32&h=32&fit=crop&crop=center'
      },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error handling !deposit command:', error);
    await message.reply('❌ An error occurred while loading deposit information. Please try again later.');
  }
}

async function handleRemoveCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('delete').catch(() => {});
    
    const userId = message.author.id;
    const username = message.author.username;
    
    // Check if this is an admin delete command: !delete @user 200M
    const args = message.content.split(' ');
    if (args.length >= 3 && args[1].startsWith('<@') && args[1].endsWith('>')) {
      // This is an admin remove command
      await handleAdminRemove(message, args);
      return;
    }
    
    // Regular remove info command
    const embed = {
      color: 0xDC2626,
      title: '💸 Remove Funds (Admin)',
      description: 'Admin command to remove GP from wallets',
      fields: [
        {
          name: '👑 Usage',
          value: '`!delete @user 200M`\n`!delete @user 1B worker`\n\nFormats: M, B\nExample: 2.5B = 2500M',
          inline: false
        }
      ],
      footer: {
        text: 'Admin only • User notified automatically',
        icon_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=32&h=32&fit=crop&crop=center'
      },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error handling !delete command:', error);
    await message.reply('❌ An error occurred while loading remove information. Please try again later.');
  }
}

async function handleAdminRemove(message: any, args: string[]) {
  try {
    const adminUserId = message.author.id;
    const adminUsername = message.author.username;
    
    // Strict admin check - only server owners and administrators
    const isAdmin = await isUserAdmin(message.author, message.guild);
    if (!isAdmin) {
      await message.reply('❌ **Access Denied:** This command is only available to server owners and administrators.\n\n**Required Permissions:**\n• Server Owner\n• Administrator role');
      return;
    }

    if (args.length < 3) {
      await message.reply('❌ **Invalid format!** Use: `!delete @user amount [customer|worker]`\n\n' +
                         '**Examples:**\n' +
                         '• `!delete @john 200M` - Remove 200M GP from wallet with most balance\n' +
                         '• `!delete @jane 1B worker` - Remove 1B GP (1000M) from worker wallet\n' +
                         '• `!delete @bob 2.5B customer` - Remove 2.5B GP (2500M) from customer wallet\n' +
                         '• `!delete @alice 500M` - Remove 500M GP\n\n' +
                         '**💡 Tips:**\n' +
                         '• Use "M" for millions (200M = 200M GP)\n' +
                         '• Use "B" for billions (1B = 1000M GP, 2.5B = 2500M GP)\n' +
                         '• Defaults to wallet with most balance if type not specified\n' +
                         '• Specify "customer" or "worker" to target specific wallet type');
      return;
    }

    // Parse target user mention
    const targetUserMention = args[1];
    const targetUserId = targetUserMention.slice(2, -1).replace('!', ''); // Remove <@ and >
    const targetUser = await message.client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
      await message.reply('❌ **User not found!** Please mention a valid Discord user.');
      return;
    }

    // Parse amount using new GP parser (supports M and B notation)
    const amountInput = args[2];
    const parsedAmount = parseGpAmount(amountInput);
    
    if (!parsedAmount) {
      await message.reply('❌ **Invalid amount!** Please enter a positive number with M or B.\n\n' +
                         '**Examples:** `200M`, `1B`, `2.5B`, `500M`');
      return;
    }

    const { amountInM, displayText } = parsedAmount;
    const amountGp = amountInM * 1000000; // Convert millions to GP

    // Check for wallet type parameter (optional: customer/worker)
    const walletType = args[3] && ['customer', 'worker'].includes(args[3].toLowerCase()) 
      ? args[3].toLowerCase() as 'customer' | 'worker'
      : null; // null means auto-select wallet with most balance

    try {
      let result;
      let wallet;

      if (walletType) {
        // Target specific wallet type (use Discord ID for reliable lookup)
        wallet = await storage.getUserWalletByUserIdAndType(targetUserId, walletType);
        if (!wallet) {
          await message.reply(`❌ **${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet not found!** User ${targetUser.username} does not have a ${walletType} wallet.`);
          return;
        }
      } else {
        // Use smart wallet selection (wallet with most balance, use Discord ID for reliable lookup)
        const allWallets = await storage.getAllUserWalletsById(targetUserId);
        if (allWallets.length === 0) {
          await message.reply(`❌ **User not found!** No wallets found for user ${targetUser.username}.`);
          return;
        }
        wallet = allWallets.reduce((maxWallet, currentWallet) => 
          currentWallet.balanceGp > maxWallet.balanceGp ? currentWallet : maxWallet
        );
      }

      // Check if wallet has enough balance
      if (wallet.balanceGp < amountGp) {
        const availableGP = wallet.balanceGp;
        const availableM = Math.floor(availableGP / 1000000);
        
        await message.reply({
          embeds: [{
            color: 0xF59E0B, // Yellow
            title: '⚠️ Insufficient Balance',
            description: `Cannot remove requested amount from ${targetUser.username}'s ${wallet.userType} wallet`,
            fields: [
              {
                name: '💰 Requested Amount',
                value: displayText,
                inline: true
              },
              {
                name: '💳 Available Balance',
                value: `${availableM}M GP`,
                inline: true
              },
              {
                name: '📋 Options',
                value: `• Remove available balance: \`!delete @${targetUser.username} ${availableM}M ${wallet.userType}\`\n• Check other wallet types if user has multiple wallets`,
                inline: false
              }
            ],
            timestamp: new Date().toISOString()
          }]
        });
        return;
      }

      // Store previous balance for milestone tracking
      const previousBalance = wallet.balanceGp;
      
      // Perform the removal from the specific wallet
      // For customer wallets: track removed GP as "spent" for rank calculation
      const updateData: any = {
        balanceGp: wallet.balanceGp - amountGp,
        updatedAt: new Date()
      };
      
      if (wallet.userType === 'customer') {
        updateData.totalSpentGp = wallet.totalSpentGp + amountGp;
      }
      
      const updatedWallet = await storage.updateUserWallet(wallet.id, updateData);
      
      // Verify the update actually succeeded
      if (!updatedWallet) {
        await message.reply('❌ **Database Error!** Failed to update wallet. Please try again later.');
        return;
      }
      
      // Notify worker if they reached 250M milestone
      if (wallet.userType === 'worker') {
        await notifyMilestoneReached(message.client, targetUserId, previousBalance, updatedWallet.balanceGp, targetUser.username);
      }
      
      // Update Discord role if this is a customer wallet (removal counts as spending)
      if (wallet.userType === 'customer' && message.guild) {
        try {
          const member = await message.guild.members.fetch(targetUser.id);
          const newTotalSpent = updatedWallet.totalSpentGp;
          const roleUpdated = await updateCustomerRankRole(member, newTotalSpent, wallet.manualRank);
          
          if (roleUpdated) {
            console.log(`✅ Discord role updated for ${targetUser.username} after GP removal (${formatGPAmount(newTotalSpent)} total spent)`);
          } else {
            console.log(`⚠️  Discord role update failed for ${targetUser.username} but removal succeeded`);
          }
        } catch (roleError) {
          console.error('⚠️  Error updating Discord role after removal:', roleError);
          // Don't fail the removal operation
        }
      }

      // Add transaction record (no USD conversion, just GP)
      await storage.createWalletTransaction({
        userId: wallet.userId,
        walletId: wallet.id,
        type: 'withdrawal',
        amount: amountInM.toString(), // Store as millions
        amountGp: amountGp,
        currency: 'GP',
        description: `Admin GP removal by ${adminUsername} (${displayText})`,
        status: 'completed'
      });

      result = {
        wallet: updatedWallet,
        actualAmountRemoved: amountGp
      };

      // Create success embed
      const finalWallet = result.wallet;
      const remainingBalanceM = Math.floor(finalWallet.balanceGp / 1000000);
      const embed = {
        color: 0xDC2626, // Red
        title: '✅ Admin Removal Successful',
        description: `Funds have been removed from ${targetUser.username}'s ${finalWallet.userType} wallet`,
        fields: [
          {
            name: '👤 Target User',
            value: `${targetUser.username} (${targetUser.id})`,
            inline: true
          },
          {
            name: '💸 Amount Removed',
            value: displayText,
            inline: true
          },
          {
            name: '👑 Admin',
            value: adminUsername,
            inline: true
          },
          {
            name: '💳 Wallet Type',
            value: finalWallet.userType.charAt(0).toUpperCase() + finalWallet.userType.slice(1),
            inline: true
          },
          {
            name: '💰 Remaining Balance',
            value: `${remainingBalanceM}M GP`,
            inline: true
          }
        ],
        footer: {
          text: 'Dragon Services • Admin Withdrawal System',
          icon_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=32&h=32&fit=crop&crop=center'
        },
        timestamp: new Date().toISOString()
      };

      await message.reply({ embeds: [embed] });
      
      // Notify target user (optional)
      try {
        const dmEmbed = {
          color: 0xDC2626,
          title: '💸 Funds Removed from Your Wallet',
          description: `An administrator has removed funds from your ${finalWallet.userType} wallet.`,
          fields: [
            {
              name: '💵 Amount Removed',
              value: displayText,
              inline: false
            },
            {
              name: '💰 Remaining Balance',
              value: `${remainingBalanceM}M GP`,
              inline: false
            }
          ],
          footer: {
            text: 'Use !wallet to check your updated balance',
            icon_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=32&h=32&fit=crop&crop=center'
          },
          timestamp: new Date().toISOString()
        };
        
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log('Could not send DM to user:', dmError);
        // Don't fail the whole operation if DM fails
      }

    } catch (withdrawError: any) {
      console.error('Error performing withdrawal:', withdrawError);
      
      if (withdrawError.message === 'User wallet not found') {
        await message.reply('❌ **Wallet not found!** The user does not have a wallet yet.');
      } else if (withdrawError.message === 'Insufficient funds') {
        await message.reply('❌ **Insufficient funds!** The user does not have enough balance for this withdrawal.');
      } else if (withdrawError.message === 'User has no GP balance to remove') {
        await message.reply(`⚠️ **No Balance to Remove!**\n\n**${targetUser.username}** has **0 GP** in their wallet. There's nothing to remove.\n\nUse \`!wallet @${targetUser.username}\` to check their current balance.`);
      } else {
        await message.reply('❌ **Withdrawal failed!** An error occurred while processing the removal.');
      }
    }

  } catch (error) {
    console.error('Error handling admin removal:', error);
    await message.reply('❌ An error occurred while processing the admin removal. Please try again later.');
  }
}

async function handleAdminDeposit(message: any, args: string[]) {
  try {
    const adminUserId = message.author.id;
    const adminUsername = message.author.username;
    
    // Strict admin check - only server owners and administrators
    const isAdmin = await isUserAdmin(message.author, message.guild);
    if (!isAdmin) {
      await message.reply('❌ **Access Denied:** This command is only available to server owners and administrators.\n\n**Required Permissions:**\n• Server Owner\n• Administrator role');
      return;
    }

    if (args.length < 3) {
      await message.reply('❌ **Invalid format!** Use: `!deposit @user amount [customer|worker]`\n\n' +
                         '**Examples:**\n' +
                         '• `!deposit @john 200M` - Deposit 200M GP to customer wallet\n' +
                         '• `!deposit @jane 1b worker` - Deposit 1B GP (1000M) to worker wallet\n' +
                         '• `!deposit @bob 2.5b customer` - Deposit 2.5B GP (2500M) to customer wallet\n' +
                         '• `!deposit @alice 500m` - Deposit 500M GP to customer wallet\n\n' +
                         '**💡 Tips:**\n' +
                         '• Use "M" for millions (200M = 200M GP)\n' +
                         '• Use "B" for billions (1B = 1000M GP, 2.5B = 2500M GP)\n' +
                         '• Defaults to customer wallet if type not specified\n' +
                         '• Use "worker" for worker deposit management');
      return;
    }

    // Parse target user mention
    const targetUserMention = args[1];
    const targetUserId = targetUserMention.slice(2, -1).replace('!', ''); // Remove <@ and >
    const targetUser = await message.client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
      await message.reply('❌ **User not found!** Please mention a valid Discord user.');
      return;
    }

    // Parse amount using new GP parser (supports M and B notation)
    const amountInput = args[2];
    const parsedAmount = parseGpAmount(amountInput);
    
    if (!parsedAmount) {
      await message.reply('❌ **Invalid amount!** Please enter a positive number with M or B.\n\n' +
                         '**Examples:** `200M`, `1B`, `2.5B`, `500M`');
      return;
    }

    const { amountInM, displayText } = parsedAmount;
    const amountGp = amountInM * 1000000; // Convert millions to GP

    // Check for wallet type parameter (optional: customer/worker)
    const walletType = args[3] && ['customer', 'worker'].includes(args[3].toLowerCase()) 
      ? args[3].toLowerCase() as 'customer' | 'worker'
      : 'customer'; // Default to customer wallet

    // Get or create target user's wallet of specified type (use Discord ID for reliable lookup)
    let wallet = await storage.getUserWalletByUserIdAndType(targetUserId, walletType);
    if (!wallet) {
      wallet = await storage.createUserWallet({
        userId: targetUserId,
        username: targetUser.username,
        balanceGp: 0,
        totalDepositedGp: 0,
        totalSpentGp: 0,
        userType: walletType // Create wallet with specific type
      });
    }

    // Store previous balance for milestone tracking
    const previousBalance = wallet.balanceGp;
    
    // Perform deposit using the specific wallet
    const updateData: any = {
      balanceGp: wallet.balanceGp + amountGp,
      updatedAt: new Date()
    };
    
    // For worker wallets, ALWAYS preserve BOTH deposits - NEVER change them during deposits
    // Only update balance, keep security deposit and total deposited amount locked
    if (walletType === 'worker') {
      updateData.workingDepositGp = wallet.workingDepositGp; // Preserve locked security deposit - NEVER CHANGE
      updateData.totalDepositedGp = wallet.totalDepositedGp; // Preserve total deposited amount - NEVER CHANGE
    } else {
      // For customer wallets, track total deposited
      updateData.totalDepositedGp = wallet.totalDepositedGp + amountGp;
    }
    
    const updatedWallet = await storage.updateUserWallet(wallet.id, updateData);
    
    // Verify the update actually succeeded
    if (!updatedWallet) {
      await message.reply('❌ **Database Error!** Failed to deposit funds. Please try again later.');
      return;
    }

    // Add transaction record (no USD conversion, just GP)
    await storage.createWalletTransaction({
      userId: wallet.userId,
      walletId: wallet.id,
      type: 'deposit',
      amount: amountInM.toString(), // Store as millions
      amountGp: amountGp,
      currency: 'GP',
      description: `Admin deposit by ${adminUsername} (${displayText})`,
      status: 'completed'
    });
    
    // Notify worker if they reached 250M milestone
    if (walletType === 'worker') {
      await notifyMilestoneReached(message.client, targetUserId, previousBalance, updatedWallet.balanceGp, targetUser.username);
    }
    
    // Auto-assign customer rank role if this is a customer wallet
    if (walletType === 'customer' && updatedWallet) {
      const member = await message.guild.members.fetch(targetUserId).catch(() => null);
      if (member) {
        const roleUpdated = await updateCustomerRankRole(member, updatedWallet.totalSpentGp, updatedWallet.manualRank);
        if (roleUpdated) {
          console.log(`✅ Customer rank role updated successfully for ${targetUser.username}`);
        } else {
          console.log(`⚠️  Customer rank role update failed for ${targetUser.username} (deposit still successful)`);
        }
      } else {
        console.log(`ℹ️  Could not fetch guild member ${targetUser.username} for role assignment`);
      }
    }

    // Use the updated wallet balance from database (not calculated from old wallet)
    const newBalanceGp = updatedWallet.balanceGp;
    const newBalanceM = Math.floor(newBalanceGp / 1000000);

    // Get rank info for customer wallets
    let rankInfo = null;
    if (walletType === 'customer' && updatedWallet) {
      rankInfo = getCustomerRank(updatedWallet.totalSpentGp, updatedWallet.manualRank);
    }

    // Create success embed
    const embedFields: any[] = [
      {
        name: '👤 Target User',
        value: `${targetUser.username} (${targetUser.id})`,
        inline: true
      },
      {
        name: '💰 Amount Added',
        value: displayText,
        inline: true
      },
      {
        name: '👑 Admin',
        value: adminUsername,
        inline: true
      },
      {
        name: '💳 Wallet Type',
        value: walletType.charAt(0).toUpperCase() + walletType.slice(1),
        inline: true
      },
      {
        name: '💵 New Balance',
        value: `${newBalanceM}M GP`,
        inline: true
      }
    ];

    // Add rank info if it's a customer wallet
    if (rankInfo && walletType === 'customer') {
      embedFields.push({
        name: '🏆 VIP Rank',
        value: `${rankInfo.emoji} **${rankInfo.name}** (${rankInfo.discountPercentage}% discount)`,
        inline: true
      });
    }

    const embed = {
      color: 0x22C55E, // Green
      title: '✅ Admin Deposit Successful',
      description: `Funds have been added to ${targetUser.username}'s ${walletType} wallet`,
      fields: embedFields,
      footer: {
        text: 'Dragon Services • Admin Deposit System',
        icon_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=32&h=32&fit=crop&crop=center'
      },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [embed] });
    
    // Notify target user (optional)
    try {
      const dmEmbedFields: any[] = [
        {
          name: '💰 Amount Added',
          value: displayText,
          inline: false
        },
        {
          name: '💵 New Balance',
          value: `${newBalanceM}M GP`,
          inline: false
        }
      ];

      // Add rank info to DM if customer wallet
      if (rankInfo && walletType === 'customer') {
        dmEmbedFields.push({
          name: '🏆 Your VIP Rank',
          value: `${rankInfo.emoji} **${rankInfo.name}** - You now get **${rankInfo.discountPercentage}% discount** on all orders!`,
          inline: false
        });
      }

      const dmEmbed = {
        color: 0x22C55E,
        title: '💰 Funds Added to Your Wallet',
        description: `An administrator has added funds to your Dragon Services ${walletType} wallet!`,
        fields: dmEmbedFields,
        footer: {
          text: 'Use !wallet to check your wallet details',
          icon_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=32&h=32&fit=crop&crop=center'
        },
        timestamp: new Date().toISOString()
      };
      
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      console.log('Could not send DM to user:', dmError);
      // Don't fail the whole operation if DM fails
    }

  } catch (error) {
    console.error('Error handling admin deposit:', error);
    await message.reply('❌ An error occurred while processing the admin deposit. Please try again later.');
  }
}

// Handle !worker @user command - Assign worker role and create wallet
async function handleWorkerCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('worker').catch(() => {});
    
    // Check if user is admin
    const isAdmin = await isUserAdmin(message.author, message.guild);
    if (!isAdmin) {
      await message.reply('❌ **Access Denied:** This command is only available to server owners and administrators.\n\n**Required Permissions:**\n• Server Owner\n• Administrator role');
      return;
    }

    const args = message.content.split(' ');
    if (args.length < 2 || !args[1].startsWith('<@')) {
      await message.reply('❌ **Invalid format!** Use: `!worker @user`\n\n' +
                         '**Example:**\n' +
                         '• `!worker @john` - Assign worker role and create wallet\n\n' +
                         '**What this does:**\n' +
                         '✅ Assigns the "Worker" role\n' +
                         '✅ Creates worker wallet automatically\n' +
                         '✅ Ready to accept orders instantly');
      return;
    }

    // Parse target user mention
    const targetUserMention = args[1];
    const targetUserId = targetUserMention.slice(2, -1).replace('!', ''); // Remove <@ and >
    const targetUser = await message.client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
      await message.reply('❌ **User not found!** Please mention a valid Discord user.');
      return;
    }

    // Get guild member to assign role
    const guild = message.guild;
    const member = await guild.members.fetch(targetUserId).catch(() => null);
    
    if (!member) {
      await message.reply('❌ **Member not found!** The user must be in this server.');
      return;
    }

    // Find or create "Worker" role
    let workerRole = guild.roles.cache.find((role: any) => role.name.toLowerCase() === 'worker');
    
    if (!workerRole) {
      // Create the Worker role if it doesn't exist
      try {
        workerRole = await guild.roles.create({
          name: 'Worker',
          color: 0x3B82F6, // Blue color
          reason: 'Automatically created by Dragon Services bot for worker management'
        });
        console.log(`✅ Created "Worker" role in guild ${guild.name}`);
      } catch (roleError) {
        console.error('Error creating Worker role:', roleError);
        await message.reply('❌ **Failed to create Worker role!** Please make sure the bot has "Manage Roles" permission.');
        return;
      }
    }

    // Assign the role
    try {
      if (member.roles.cache.has(workerRole.id)) {
        await message.reply(`⚠️ **${targetUser.username} already has the Worker role!**\n\nChecking wallet status...`);
      } else {
        await member.roles.add(workerRole);
        console.log(`✅ Assigned Worker role to ${targetUser.username}`);
      }
    } catch (roleError) {
      console.error('Error assigning role:', roleError);
      await message.reply('❌ **Failed to assign role!** Make sure the bot has "Manage Roles" permission and the bot\'s role is higher than the Worker role.');
      return;
    }

    // Convert customer wallet to worker wallet or create new worker wallet
    // Use userId for more reliable lookup
    let existingWallet = await storage.getUserWallet(targetUserId);
    let walletAction = 'Created';
    let workerWallet;
    
    if (existingWallet) {
      // Wallet exists - check if it's already a worker wallet
      if (existingWallet.userType === 'worker') {
        walletAction = 'Already Exists';
        workerWallet = existingWallet;
        console.log(`ℹ️ ${targetUser.username} already has a worker wallet`);
      } else {
        // Convert customer wallet to worker wallet
        await storage.updateUserWallet(existingWallet.id, {
          userType: 'worker',
          updatedAt: new Date()
        });
        workerWallet = await storage.getUserWalletById(existingWallet.id);
        walletAction = 'Converted from Customer';
        console.log(`✅ Converted ${targetUser.username}'s customer wallet to worker wallet (Balance preserved: ${formatGPAmount(existingWallet.balanceGp)} GP)`);
      }
    } else {
      // No wallet exists - create new worker wallet
      workerWallet = await storage.createUserWallet({
        userId: targetUserId,
        username: targetUser.username,
        balanceGp: 0,
        totalDepositedGp: 0,
        totalSpentGp: 0,
        userType: 'worker'
      });
      walletAction = 'Created';
      console.log(`✅ Created new worker wallet for ${targetUser.username}`);
    }

    // Create success embed
    const embed = {
      color: 0x22C55E,
      title: '✅ Worker Setup Complete',
      description: `${targetUser.username} is ready to accept orders`,
      fields: [
        {
          name: '👤 Worker',
          value: `<@${targetUserId}>`,
          inline: false
        },
        {
          name: '💰 Wallet',
          value: `${walletAction}\nBalance: ${formatGPAmount(workerWallet.balanceGp)} GP`,
          inline: false
        }
      ],
      footer: {
        text: '🐲 Dragon Services',
        icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [embed] });

    // Send DM to the new worker
    try {
      const dmEmbed = {
        color: 0x3B82F6, // Blue
        title: '🎉 Welcome to Dragon Services Worker Team!',
        description: `Congratulations! You've been added as a **Worker** at Dragon Services!`,
        fields: [
          {
            name: '✅ What You Can Do Now',
            value: '• **Claim Orders:** Accept service orders from customers\n' +
                   '• **Earn GP:** Complete orders and get paid\n' +
                   '• **Build Reputation:** Deliver quality service\n' +
                   '• **Track Earnings:** Monitor your worker wallet',
            inline: false
          },
          {
            name: '💼 Your Worker Wallet',
            value: `**Current Balance:** ${formatGPAmount(workerWallet.balanceGp)} GP\n` +
                   `**Total Earnings:** ${formatGPAmount(workerWallet.totalDepositedGp)} GP\n` +
                   `**Locked Deposit:** ${formatGPAmount(workerWallet.lockedDepositGp || 0)} GP`,
            inline: false
          },
          {
            name: '🚀 Getting Started',
            value: '1. Watch for new orders in the claim channel\n' +
                   '2. Click "🎯 Claim This Order!" on orders you can complete\n' +
                   '3. Coordinate with customers through ticket channels\n' +
                   '4. Complete the service and get paid!',
            inline: false
          },
          {
            name: '💡 Important Notes',
            value: '• Your deposit is automatically locked when you claim orders\n' +
                   '• Deposits are returned when you complete the order\n' +
                   '• Build your reputation by delivering quality service\n' +
                   '• Contact admins if you need help',
            inline: false
          }
        ],
        footer: {
          text: '🐲 Dragon Services',
          icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        },
        timestamp: new Date().toISOString()
      };
      
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      console.log('Could not send DM to user:', dmError);
      // Don't fail the whole operation if DM fails
    }

  } catch (error) {
    console.error('Error handling !worker command:', error);
    await message.reply('❌ An error occurred while setting up the worker. Please try again later.');
  }
}

// Handle !removeworker @user command - Remove worker role and optionally convert wallet
async function handleRemoveWorkerCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('removeworker').catch(() => {});
    
    // Check if user is admin
    const isAdmin = await isUserAdmin(message.author, message.guild);
    if (!isAdmin) {
      await message.reply('❌ **Access Denied:** This command is only available to server owners and administrators.\n\n**Required Permissions:**\n• Server Owner\n• Administrator role');
      return;
    }

    const args = message.content.split(' ');
    if (args.length < 2 || !args[1].startsWith('<@')) {
      await message.reply('❌ **Invalid format!** Use: `!removeworker @user`\n\n' +
                         '**Example:**\n' +
                         '• `!removeworker @john` - Remove worker role and convert wallet back to customer\n\n' +
                         '**What this does:**\n' +
                         '❌ Removes the "Worker" role\n' +
                         '🔄 Converts worker wallet to customer wallet\n' +
                         '✅ Preserves all balances and data');
      return;
    }

    // Parse target user mention
    const targetUserMention = args[1];
    const targetUserId = targetUserMention.slice(2, -1).replace('!', '');
    const targetUser = await message.client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
      await message.reply('❌ **User not found!** Please mention a valid Discord user.');
      return;
    }

    // Get guild member to remove role
    const guild = message.guild;
    const member = await guild.members.fetch(targetUserId).catch(() => null);
    
    if (!member) {
      await message.reply('❌ **Member not found!** The user must be in this server.');
      return;
    }

    // Find "Worker" role
    const workerRole = guild.roles.cache.find((role: any) => role.name.toLowerCase() === 'worker');
    
    if (!workerRole) {
      await message.reply('❌ **Worker role not found!** There is no "Worker" role in this server.');
      return;
    }

    // Check if user has the role
    if (!member.roles.cache.has(workerRole.id)) {
      await message.reply(`⚠️ **${targetUser.username} doesn't have the Worker role!**\n\nThey are not currently a worker.`);
      return;
    }

    // Remove the role
    try {
      await member.roles.remove(workerRole);
      console.log(`✅ Removed Worker role from ${targetUser.username}`);
    } catch (roleError) {
      console.error('Error removing role:', roleError);
      await message.reply('❌ **Failed to remove role!** Make sure the bot has "Manage Roles" permission and the bot\'s role is higher than the Worker role.');
      return;
    }

    // Convert worker wallet back to customer wallet if it exists
    let walletAction = 'No Wallet';
    let convertedWallet = null;
    
    const existingWallet = await storage.getUserWallet(targetUserId);
    
    if (existingWallet) {
      if (existingWallet.userType === 'worker') {
        // Check if worker has locked deposits
        const lockedDeposit = existingWallet.workingDepositGp || 0;
        
        if (lockedDeposit > 0) {
          await message.reply({
            embeds: [{
              color: 0xF59E0B,
              title: '⚠️ Cannot Remove Worker - Active Orders',
              description: `**${targetUser.username}** has **${formatGPAmount(lockedDeposit)} GP** in locked deposits from active orders.\n\n**Please:**\n1. Complete or cancel all active orders first\n2. Ensure all deposits are unlocked\n3. Then try removing the worker role again`,
              fields: [
                {
                  name: '🔒 Locked Deposit',
                  value: `${formatGPAmount(lockedDeposit)} GP`,
                  inline: true
                },
                {
                  name: '💰 Balance',
                  value: `${formatGPAmount(existingWallet.balanceGp)} GP`,
                  inline: true
                }
              ],
              timestamp: new Date().toISOString()
            }]
          });
          
          // Re-add the role since we're cancelling the operation
          await member.roles.add(workerRole);
          return;
        }
        
        // Convert worker wallet to customer wallet
        await storage.updateUserWallet(existingWallet.id, {
          userType: 'customer',
          updatedAt: new Date()
        });
        convertedWallet = await storage.getUserWalletById(existingWallet.id);
        walletAction = 'Converted to Customer';
        console.log(`✅ Converted ${targetUser.username}'s worker wallet to customer wallet (Balance preserved: ${formatGPAmount(existingWallet.balanceGp)} GP)`);
      } else {
        walletAction = 'Already Customer Wallet';
        convertedWallet = existingWallet;
      }
    }

    // Create success embed
    const embed = {
      color: 0xEF4444, // Red
      title: '✅ Worker Removed Successfully',
      description: `**${targetUser.username}** has been removed as a worker.`,
      fields: [
        {
          name: '👤 Former Worker',
          value: `${targetUser.username} (<@${targetUserId}>)`,
          inline: true
        },
        {
          name: '🎭 Role Removed',
          value: `<@&${workerRole.id}>`,
          inline: true
        },
        {
          name: '💼 Wallet Status',
          value: walletAction,
          inline: true
        }
      ],
      footer: {
        text: '🐲 Dragon Services • Worker Management System',
        icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      },
      timestamp: new Date().toISOString()
    };

    if (convertedWallet) {
      embed.fields.push(
        {
          name: '💰 Current Balance',
          value: `${formatGPAmount(convertedWallet.balanceGp)} GP`,
          inline: true
        },
        {
          name: '📊 Total Spent',
          value: `${formatGPAmount(convertedWallet.totalSpentGp)} GP`,
          inline: true
        },
        {
          name: '🏆 Total Earnings',
          value: `${formatGPAmount(convertedWallet.totalEarningsGp || 0)} GP`,
          inline: true
        }
      );
    }

    await message.reply({ embeds: [embed] });

    // Send DM to the removed worker
    try {
      const dmEmbed = {
        color: 0xEF4444, // Red
        title: '⚠️ Worker Status Removed',
        description: `Your **Worker** status at Dragon Services has been removed.`,
        fields: [
          {
            name: '📋 What Changed',
            value: '• Worker role has been removed\n' +
                   '• Worker wallet converted to customer wallet\n' +
                   '• All balances have been preserved\n' +
                   '• You can no longer claim orders',
            inline: false
          }
        ],
        footer: {
          text: '🐲 Dragon Services • If you have questions, contact server admins',
          icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
        },
        timestamp: new Date().toISOString()
      };

      if (convertedWallet) {
        dmEmbed.fields.push({
          name: '💼 Your Customer Wallet',
          value: `**Current Balance:** ${formatGPAmount(convertedWallet.balanceGp)} GP\n` +
                 `**Total Spent:** ${formatGPAmount(convertedWallet.totalSpentGp)} GP\n` +
                 `**Total Earnings:** ${formatGPAmount(convertedWallet.totalEarningsGp || 0)} GP`,
          inline: false
        });
      }
      
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      console.log('Could not send DM to user:', dmError);
      // Don't fail the whole operation if DM fails
    }

  } catch (error) {
    console.error('Error handling !removeworker command:', error);
    await message.reply('❌ An error occurred while removing the worker. Please try again later.');
  }
}

// Strict admin check function - only server owners and administrators
async function isUserAdmin(author: any, guild?: any): Promise<boolean> {
  try {
    // Check if user has administrator permissions in the guild
    if (guild) {
      const member = await guild.members.fetch(author.id);
      
      // Check if user is the server owner
      if (member.id === guild.ownerId) {
        return true;
      }
      
      // Check if user has administrator permission (most restrictive)
      return member.permissions.has('Administrator');
    }
    
    // Fallback: hardcoded admin user IDs (replace with your admin IDs)
    const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    return adminIds.includes(author.id);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Helper function for offer type emojis (used in offer command)
function getOfferTypeEmoji(offerType: string): string {
  switch (offerType.toLowerCase()) {
    case 'flash': return '⚡';
    case 'weekly': return '📅';
    case 'limited': return '🔥';
    case 'seasonal': return '🎄';
    default: return '💎';
  }
}

async function handleEditSpentCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('editspent').catch(() => {});
    
    // Check if user is admin
    const isAdmin = await isUserAdmin(message.author, message.guild);
    if (!isAdmin) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Access Denied',
          description: 'Only administrators can use this command.',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      await message.reply({
        embeds: [{
          color: 0xF59E0B, // Yellow
          title: '⚠️ Invalid Usage',
          description: '**Usage:** `!editspent <username> <amount>M`\n\n**Examples:**\n`!editspent @user123 500M` - Set spending to 500M GP\n`!editspent PlayerName 2.5B` - Set spending to 2.5B GP',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    let targetUser = args[1];
    const amountStr = args[2];

    // Remove @ symbol if present
    if (targetUser.startsWith('<@') && targetUser.endsWith('>')) {
      const userId = targetUser.slice(2, -1).replace('!', '');
      const user = await client.users.fetch(userId);
      targetUser = user.username;
    } else if (targetUser.startsWith('@')) {
      targetUser = targetUser.slice(1);
    }

    // Parse amount (supports M for millions, B for billions)
    let amount: number;
    if (amountStr.toUpperCase().endsWith('M')) {
      amount = parseFloat(amountStr.slice(0, -1)) * 1000000;
    } else if (amountStr.toUpperCase().endsWith('B')) {
      amount = parseFloat(amountStr.slice(0, -1)) * 1000000000;
    } else {
      amount = parseFloat(amountStr);
    }

    if (isNaN(amount) || amount < 0) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Invalid Amount',
          description: 'Please enter a valid positive amount (e.g., 500M, 2.5B, 1000000)',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    // Find user wallet
    const wallet = await storage.getUserWalletByUsername(targetUser);
    if (!wallet) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ User Not Found',
          description: `No wallet found for user: **${targetUser}**`,
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    // Update the wallet's total spent amount and calculate total deposited
    await storage.updateUserWallet(wallet.id, {
      totalSpentGp: amount,
      totalDepositedGp: wallet.balanceGp + amount, // Auto-calculate deposit
      updatedAt: new Date()
    });

    // Get updated wallet info with rank calculation
    const updatedWallet = await storage.getUserWalletByUsername(targetUser);
    const rank = getCustomerRank(updatedWallet?.totalSpentGp || 0, updatedWallet?.manualRank);

    await message.reply({
      embeds: [{
        color: 0x22C55E, // Green
        title: '✅ Spending Amount Updated',
        description: `Successfully updated spending amount for **${targetUser}**`,
        fields: [
          {
            name: '💰 New Total Spent',
            value: formatGPAmount(amount),
            inline: true
          },
          {
            name: '🏅 Customer Rank',
            value: rank ? `${rank.emoji} **${rank.name}** (${rank.discountPercentage}% discount)` : '**No Rank**',
            inline: true
          }
        ],
        footer: {
          text: `Updated by ${message.author.username}`
        },
        timestamp: new Date().toISOString()
      }]
    });

  } catch (error) {
    console.error('Error in editspent command:', error);
    await message.reply({
      embeds: [{
        color: 0xEF4444, // Red
        title: '❌ Error',
        description: 'Failed to update spending amount. Please try again.',
        timestamp: new Date().toISOString()
      }]
    });
  }
}

async function handleEditDepositCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('editdeposit').catch(() => {});
    
    // Check if user is admin
    const isAdmin = await isUserAdmin(message.author, message.guild);
    if (!isAdmin) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Access Denied',
          description: 'Only administrators can use this command.',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    const args = message.content.split(' ');
    if (args.length < 4) {
      await message.reply({
        embeds: [{
          color: 0xF59E0B, // Yellow
          title: '⚠️ Invalid Usage',
          description: '**Usage:** `!editdeposit @user <amount> worker`\n\n**Examples:**\n`!editdeposit @user123 1200M worker` - Set deposit to 1200M GP\n`!editdeposit @worker 1.5B worker` - Set deposit to 1.5B GP (1500M)\n`!editdeposit @worker 800M worker` - Set deposit to 800M GP\n\n**Supported Formats:** M (millions), B (billions)\n**Important:** This only changes the deposit amount, NOT their real payment balance!',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    const targetUserMention = args[1];
    const amountStr = args[2];
    const walletType = args[3].toLowerCase();

    // Validate wallet type
    if (walletType !== 'worker') {
      await message.reply('❌ **Invalid wallet type!** This command only works for worker wallets.\n\n' +
                         'Use: `!editdeposit @user amount worker`');
      return;
    }

    // Parse user ID from mention
    let targetUserId = targetUserMention.slice(2, -1).replace('!', '');
    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
      await message.reply('❌ **User not found!** Please mention a valid Discord user.');
      return;
    }

    // Parse amount (supports M for millions, B for billions)
    let amount: number;
    if (amountStr.toUpperCase().endsWith('M')) {
      amount = parseFloat(amountStr.slice(0, -1)) * 1000000;
    } else if (amountStr.toUpperCase().endsWith('B')) {
      amount = parseFloat(amountStr.slice(0, -1)) * 1000000000;
    } else {
      amount = parseFloat(amountStr);
    }

    if (isNaN(amount) || amount < 0) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Invalid Amount',
          description: 'Please enter a valid positive amount (e.g., 1200M, 800M, 3.5B)',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    // Get worker wallet using userId for reliability
    const wallet = await storage.getUserWallet(targetUserId);
    if (!wallet) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Wallet Not Found',
          description: `**${targetUser.username}** does not have a wallet.\n\nUse \`!worker @${targetUser.username}\` to set them up as a worker first.`,
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    if (wallet.userType !== 'worker') {
      await message.reply({
        embeds: [{
          color: 0xF59E0B, // Yellow
          title: '⚠️ Not a Worker',
          description: `**${targetUser.username}** has a ${wallet.userType} wallet, not a worker wallet.\n\nUse \`!worker @${targetUser.username}\` to convert them to a worker first.`,
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    // Store old values for comparison
    const oldTotalDeposited = wallet.totalDepositedGp;
    const oldAvailable = wallet.totalDepositedGp - wallet.workingDepositGp;

    // Update ONLY totalDepositedGp (not balanceGp which is real payment)
    await storage.updateUserWallet(wallet.id, {
      totalDepositedGp: amount,
      updatedAt: new Date()
    });

    // Calculate new available deposit
    const newAvailable = amount - wallet.workingDepositGp;

    await message.reply({
      embeds: [{
        color: 0x22C55E, // Green
        title: '✅ Worker Deposit Modified Successfully',
        description: `Updated security deposit for **${targetUser.username}**`,
        fields: [
          {
            name: '👤 Worker',
            value: `${targetUser.username} (<@${targetUserId}>)`,
            inline: true
          },
          {
            name: '👑 Modified By',
            value: message.author.username,
            inline: true
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false
          },
          {
            name: '📊 Before',
            value: `🔒 Total Deposited: ${formatGPAmount(oldTotalDeposited)} GP\n` +
                   `🏅 Available Security: ${formatGPAmount(oldAvailable)} GP\n` +
                   `🏆 Locked: ${formatGPAmount(wallet.workingDepositGp)} GP`,
            inline: true
          },
          {
            name: '📊 After',
            value: `🔒 Total Deposited: ${formatGPAmount(amount)} GP\n` +
                   `🏅 Available Security: ${formatGPAmount(newAvailable)} GP\n` +
                   `🏆 Locked: ${formatGPAmount(wallet.workingDepositGp)} GP`,
            inline: true
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false
          },
          {
            name: '💰 Real Payment Balance',
            value: `${formatGPAmount(wallet.balanceGp)} GP ✅ **Unchanged**\n\n*This command only modifies security deposits, not real money*`,
            inline: false
          }
        ],
        footer: {
          text: '🐲 Dragon Services • Worker Deposit Management'
        },
        timestamp: new Date().toISOString()
      }]
    });

    console.log(`✅ ${message.author.username} edited ${targetUser.username}'s deposit: ${formatGPAmount(oldTotalDeposited)} GP → ${formatGPAmount(amount)} GP`);

  } catch (error) {
    console.error('Error in editdeposit command:', error);
    await message.reply({
      embeds: [{
        color: 0xEF4444, // Red
        title: '❌ Error',
        description: 'Failed to update deposit amount. Please try again.',
        timestamp: new Date().toISOString()
      }]
    });
  }
}

// Edit Locked Deposit Command - for testing deposit locking/unlocking
async function handleEditLockDepositCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('editlockdeposit').catch(() => {});
    
    // Check if user is admin
    const isAdmin = await isUserAdmin(message.author, message.guild);
    if (!isAdmin) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Access Denied',
          description: 'Only administrators can use this command.',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    const args = message.content.split(' ');
    if (args.length < 4) {
      await message.reply({
        embeds: [{
          color: 0xF59E0B, // Yellow
          title: '⚠️ Invalid Usage',
          description: '**Usage:** `!editlockdeposit @user <amount> worker`\n\n**Examples:**\n`!editlockdeposit @user123 250M worker` - Set locked deposit to 250M GP\n`!editlockdeposit @worker 1B worker` - Set locked deposit to 1B GP (1000M)\n`!editlockdeposit @worker 0M worker` - Unlock all deposits\n\n**Supported Formats:** M (millions), B (billions)\n**Important:** This directly modifies locked deposits for testing purposes!',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    const targetUserMention = args[1];
    const amountStr = args[2];
    const walletType = args[3].toLowerCase();

    // Validate wallet type
    if (walletType !== 'worker') {
      await message.reply('❌ **Invalid wallet type!** This command only works for worker wallets.\n\n' +
                         'Use: `!editlockdeposit @user amount worker`');
      return;
    }

    // Parse user ID from mention
    let targetUserId = targetUserMention.slice(2, -1).replace('!', '');
    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
      await message.reply('❌ **User not found!** Please mention a valid Discord user.');
      return;
    }

    // Parse amount (supports M for millions, B for billions)
    let amount: number;
    if (amountStr.toUpperCase().endsWith('M')) {
      amount = parseFloat(amountStr.slice(0, -1)) * 1000000;
    } else if (amountStr.toUpperCase().endsWith('B')) {
      amount = parseFloat(amountStr.slice(0, -1)) * 1000000000;
    } else {
      amount = parseFloat(amountStr);
    }

    if (isNaN(amount) || amount < 0) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Invalid Amount',
          description: 'Please enter a valid positive amount (e.g., 250M, 0M, 500M)',
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    // Get worker wallet using userId for reliability
    const wallet = await storage.getUserWallet(targetUserId);
    if (!wallet) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Wallet Not Found',
          description: `**${targetUser.username}** does not have a wallet.\n\nUse \`!worker @${targetUser.username}\` to set them up as a worker first.`,
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    if (wallet.userType !== 'worker') {
      await message.reply({
        embeds: [{
          color: 0xF59E0B, // Yellow
          title: '⚠️ Not a Worker',
          description: `**${targetUser.username}** has a ${wallet.userType} wallet, not a worker wallet.\n\nUse \`!worker @${targetUser.username}\` to convert them to a worker first.`,
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    // Validate that locked amount doesn't exceed total deposited
    if (amount > wallet.totalDepositedGp) {
      await message.reply({
        embeds: [{
          color: 0xEF4444, // Red
          title: '❌ Invalid Locked Amount',
          description: `Cannot lock **${formatGPAmount(amount)} GP** because it exceeds the total deposited amount of **${formatGPAmount(wallet.totalDepositedGp)} GP**.\n\nLocked deposits cannot be more than total deposits!`,
          timestamp: new Date().toISOString()
        }]
      });
      return;
    }

    // Store old values for comparison
    const oldWorkingDeposit = wallet.workingDepositGp;
    const oldAvailable = wallet.totalDepositedGp - wallet.workingDepositGp;

    // Update ONLY workingDepositGp (locked deposits)
    await storage.updateUserWallet(wallet.id, {
      workingDepositGp: amount,
      updatedAt: new Date()
    });

    // Calculate new available deposit
    const newAvailable = wallet.totalDepositedGp - amount;

    await message.reply({
      embeds: [{
        color: 0x22C55E, // Green
        title: '✅ Locked Deposit Modified Successfully',
        description: `Updated locked deposit for **${targetUser.username}**`,
        fields: [
          {
            name: '👤 Worker',
            value: `${targetUser.username} (<@${targetUserId}>)`,
            inline: true
          },
          {
            name: '👑 Modified By',
            value: message.author.username,
            inline: true
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false
          },
          {
            name: '📊 Before',
            value: `🔒 Total Deposited: ${formatGPAmount(wallet.totalDepositedGp)} GP\n` +
                   `🏅 Available Security: ${formatGPAmount(oldAvailable)} GP\n` +
                   `🏆 Locked: ${formatGPAmount(oldWorkingDeposit)} GP`,
            inline: true
          },
          {
            name: '📊 After',
            value: `🔒 Total Deposited: ${formatGPAmount(wallet.totalDepositedGp)} GP\n` +
                   `🏅 Available Security: ${formatGPAmount(newAvailable)} GP\n` +
                   `🏆 Locked: ${formatGPAmount(amount)} GP`,
            inline: true
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false
          },
          {
            name: '💰 Real Payment Balance',
            value: `${formatGPAmount(wallet.balanceGp)} GP ✅ **Unchanged**\n\n*This command only modifies locked deposits for testing purposes*`,
            inline: false
          }
        ],
        footer: {
          text: '🐲 Dragon Services • Worker Deposit Testing Tool'
        },
        timestamp: new Date().toISOString()
      }]
    });

    console.log(`✅ ${message.author.username} edited ${targetUser.username}'s locked deposit: ${formatGPAmount(oldWorkingDeposit)} GP → ${formatGPAmount(amount)} GP`);

  } catch (error) {
    console.error('Error in editlockdeposit command:', error);
    await message.reply({
      embeds: [{
        color: 0xEF4444, // Red
        title: '❌ Error',
        description: 'Failed to update locked deposit amount. Please try again.',
        timestamp: new Date().toISOString()
      }]
    });
  }
}

// Order Management Commands - Manual Order Creation for Staff
async function handleOrderCommand(interaction: any) {
  try {
    storage.updateCommandUsage('order').catch(() => {});
    
    // Check if user has permission to create orders (admin/staff only)
    const hasPermission = interaction.member?.permissions?.has('Administrator') || 
                         interaction.member?.roles?.cache?.some((role: any) => 
                           role.name.toLowerCase().includes('staff') || 
                           role.name.toLowerCase().includes('admin') ||
                           role.name.toLowerCase().includes('manager')
                         );
    
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ You do not have permission to create orders. This command is for staff only.',
        ephemeral: false
      });
      return;
    }

    // Create modal for manual order creation
    const modal = new ModalBuilder()
      .setCustomId('create_order_modal')
      .setTitle('🐲✨ Dragon Services - Create Order');

    // Order title field
    const titleField = new TextInputBuilder()
      .setCustomId('order_title')
      .setLabel('🎯 Order Title/Summary')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('🔥 Fire Cape Service, 📋 Quest Completion, ⚔️ Boss kills, etc.')
      .setRequired(true)
      .setMaxLength(100);

    // Order value field
    const orderValueField = new TextInputBuilder()
      .setCustomId('order_value')
      .setLabel('💰 Order Total Amount (in millions)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('💸 200 (= 200M GP) - Premium services start at 50M')
      .setRequired(true)
      .setMaxLength(20);

    // Customer ID field (required)
    const customerField = new TextInputBuilder()
      .setCustomId('customer_id')
      .setLabel('👤 Customer Discord ID (REQUIRED)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('👑 123456789012345678 - Right-click user > Copy ID')
      .setRequired(true)
      .setMaxLength(100);

    // Deposit requirement field
    const depositField = new TextInputBuilder()
      .setCustomId('deposit_required')
      .setLabel('🏦 Required Deposit (in millions)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('🔒 250 (= 250M GP security deposit for workers)')
      .setRequired(false)
      .setMaxLength(20);

    // Order description field
    const descriptionField = new TextInputBuilder()
      .setCustomId('order_description')
      .setLabel('📋 Service Description & Account Info')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('🔥 Service details...\n\n👤 ACCOUNT INFO:\n• Username: YourName\n• Image: [Upload image & copy link]')
      .setRequired(true)
      .setMaxLength(1000);

    // Add inputs to action rows - Discord limit is 5 rows
    const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(titleField);
    const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(orderValueField);
    const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(customerField);
    const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(depositField);
    const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionField);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

    await interaction.showModal(modal);

  } catch (error) {
    console.error('Error handling order command:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the order command.',
      ephemeral: false
    });
  }
}

async function handleMyOrdersCommand(interaction: any) {
  try {
    storage.updateCommandUsage('my-orders').catch(() => {});
    
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    // Get user's orders
    const orders = await storage.getOrdersByUser(userId);
    
    if (orders.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('📦 Your Orders')
        .setDescription('You haven\'t placed any orders yet.')
        .addFields([
          {
            name: '🛒 Start Ordering',
            value: 'Use `/order` to create your first order!',
            inline: false
          }
        ])
        .setColor(0x2B2D31);
        
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      return;
    }

    // Show recent orders (limit to 5)
    const recentOrders = orders.slice(0, 5);
    
    const embed = new EmbedBuilder()
      .setTitle('📦 Your Recent Orders')
      .setDescription(`Showing your ${recentOrders.length} most recent orders`)
      .setColor(0x2B2D31);

    for (const order of recentOrders) {
      const statusEmoji = getOrderStatusEmoji(order.status);
      const paymentEmoji = order.paymentStatus === 'paid' ? '✅' : '⏳';
      
      embed.addFields([
        {
          name: `${statusEmoji} ${order.orderNumber}`,
          value: [
            `**Status:** ${order.status.replace('_', ' ').toUpperCase()}`,
            `**Payment:** ${paymentEmoji} ${order.paymentStatus.toUpperCase()}`,
            `**Total:** ${formatGPAmount(order.totalAmountGp)} GP`,
            `**Created:** <t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:R>`
          ].join('\n'),
          inline: true
        }
      ]);
    }

    if (orders.length > 5) {
      embed.setFooter({ text: `Showing 5 of ${orders.length} total orders. Use /order-status for specific orders.` });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling my-orders command:', error);
    await interaction.reply({
      content: '❌ An error occurred while fetching your orders.',
      ephemeral: true
    });
  }
}

async function handleOrderStatusCommand(interaction: any) {
  try {
    storage.updateCommandUsage('order-status').catch(() => {});
    
    const orderNumber = interaction.options.getString('order_number');
    
    // Find order by number
    const allOrders = await storage.getOrders();
    const order = allOrders.find(o => o.orderNumber.toLowerCase() === orderNumber.toLowerCase());
    
    if (!order) {
      await interaction.reply({
        content: `❌ Order ${orderNumber} not found. Please check the order number and try again.`,
        ephemeral: true
      });
      return;
    }

    // Check if user can view this order (either their own order or they're admin)
    const userId = interaction.user.id;
    const isUserOrder = order.userId === userId;
    const isAdmin = interaction.member?.permissions?.has('Administrator') || false;
    
    if (!isUserOrder && !isAdmin) {
      await interaction.reply({
        content: '❌ You can only view your own orders.',
        ephemeral: true
      });
      return;
    }

    // Get order items and status history
    const items = await storage.getOrderItems(order.id);
    const statusHistory = await storage.getOrderStatusHistory(order.id);
    
    // Create detailed order embed
    const statusEmoji = getOrderStatusEmoji(order.status);
    const paymentEmoji = order.paymentStatus === 'paid' ? '✅' : '⏳';
    
    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji} Order ${order.orderNumber}`)
      .setDescription(`Detailed order information`)
      .addFields([
        {
          name: '👤 Customer',
          value: order.username,
          inline: true
        },
        {
          name: '📊 Status',
          value: `${statusEmoji} ${order.status.replace('_', ' ').toUpperCase()}`,
          inline: true
        },
        {
          name: '💳 Payment',
          value: `${paymentEmoji} ${order.paymentStatus.toUpperCase()}`,
          inline: true
        },
        {
          name: '💰 Pricing',
          value: [
            `Original: ${formatGPAmount(order.originalAmountGp)} GP`,
            order.discountApplied > 0 ? `Discount: -${formatGPAmount(order.discountAmountGp)} GP (${order.discountApplied}%)` : '',
            `**Total: ${formatGPAmount(order.totalAmountGp)} GP**`
          ].filter(Boolean).join('\n'),
          inline: false
        }
      ])
      .setColor(order.status === 'completed' ? 0x00FF00 : order.status === 'cancelled' ? 0xFF0000 : 0x2B2D31);

    // Add order items
    if (items.length > 0) {
      const itemsText = items.map(item => 
        `• ${item.serviceName} x${item.quantity} - ${formatGPAmount(item.totalPriceGp)} GP`
      ).join('\n');
      
      embed.addFields([
        {
          name: '📋 Order Items',
          value: itemsText.length > 1000 ? itemsText.substring(0, 1000) + '...' : itemsText,
          inline: false
        }
      ]);
    }

    // Add recent status updates
    if (statusHistory.length > 0) {
      const recentHistory = statusHistory.slice(0, 3);
      const historyText = recentHistory.map(h => 
        `<t:${Math.floor(new Date(h.createdAt).getTime() / 1000)}:R> - ${h.newStatus.toUpperCase()}${h.notes ? ` (${h.notes})` : ''}`
      ).join('\n');
      
      embed.addFields([
        {
          name: '📈 Recent Updates',
          value: historyText,
          inline: false
        }
      ]);
    }

    embed.addFields([
      {
        name: '📅 Order Date',
        value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:F>`,
        inline: true
      }
    ]);

    if (order.notes) {
      embed.addFields([
        {
          name: '📝 Notes',
          value: order.notes.substring(0, 200),
          inline: false
        }
      ]);
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling order-status command:', error);
    await interaction.reply({
      content: '❌ An error occurred while fetching the order status.',
      ephemeral: true
    });
  }
}

// Order Service Selection Handler
async function handleOrderServiceSelection(interaction: any, serviceId: string) {
  try {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    // Get service details
    const service = await storage.getService(serviceId);
    if (!service) {
      await interaction.reply({
        content: '❌ Service not found.',
        ephemeral: true
      });
      return;
    }

    // Get user's wallet
    let wallet = await storage.getUserWallet(userId);
    if (!wallet) {
      wallet = await storage.createUserWallet({
        userId,
        username,
        userType: 'customer',
        balanceGp: 0,
        totalDepositedGp: 0,
        totalSpentGp: 0,
        totalEarningsGp: 0,
        totalOrders: 0,
        customerRank: 'IRON',
        isActive: true
      });
    }

    // Create service options embed for order
    const embed = new EmbedBuilder()
      .setTitle(`🛒 Add ${service.name} to Order`)
      .setDescription(`Select the specific ${service.name} service you want to order:`)
      .addFields([
        {
          name: '💰 Your Balance',
          value: `${formatGPAmount(wallet.balanceGp)} GP`,
          inline: true
        },
        {
          name: '🏆 Your Rank',
          value: wallet.customerRank || 'IRON',
          inline: true
        },
        {
          name: '🎯 Your Discount',
          value: `${getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank)}%`,
          inline: true
        }
      ])
      .setColor(0x2B2D31)
      .setFooter({ text: 'Select service option to add to your order' });

    if (!service.options || service.options.length === 0) {
      // Handle services without options - create basic order
      const unitPrice = 10000; // Default 10k GP if no options
      const discountPercent = getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank);
      const finalPrice = Math.floor(unitPrice * (100 - discountPercent) / 100);
      
      if (wallet.balanceGp < finalPrice) {
        await interaction.reply({
          content: `❌ Insufficient balance! You need ${formatGPAmount(finalPrice)} GP but only have ${formatGPAmount(wallet.balanceGp)} GP.`,
          ephemeral: true
        });
        return;
      }

      // Create the order
      const orderNumber = await storage.generateOrderNumber();
      const order = await storage.createOrder({
        orderNumber,
        userId,
        username,
        walletId: wallet.id,
        status: 'pending',
        totalAmountGp: finalPrice,
        originalAmountGp: unitPrice,
        discountApplied: discountPercent,
        discountAmountGp: unitPrice - finalPrice,
        customerRank: getCustomerRank(wallet.totalSpentGp || 0, wallet.manualRank)?.name || null,
        paymentStatus: 'pending'
      });

      // Create order item
      await storage.createOrderItem({
        orderId: order.id,
        serviceType: service.category,
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        quantity: 1,
        unitPriceGp: unitPrice,
        totalPriceGp: finalPrice,
        configuration: JSON.stringify({}),
        status: 'pending'
      });

      // Process payment and confirm order
      await processOrderPayment(order.id, wallet, finalPrice);

      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Order Created Successfully!')
        .setDescription(`Your order has been created and payment processed.`)
        .addFields([
          {
            name: '📦 Order Number',
            value: order.orderNumber,
            inline: true
          },
          {
            name: '🛍️ Service',
            value: service.name,
            inline: true
          },
          {
            name: '💰 Total Paid',
            value: `${formatGPAmount(finalPrice)} GP`,
            inline: true
          }
        ])
        .setColor(0x00FF00);

      await interaction.reply({
        embeds: [confirmEmbed],
        ephemeral: true
      });
      return;
    }

    // Create service options select menu for ordering
    const options = service.options.slice(0, 25).map(option => {
      const price = typeof option.price === 'string' ? parseInt(option.price.replace(/[^0-9]/g, '')) : option.price;
      const discountPercent = getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank);
      const finalPrice = Math.floor((price || 10000) * (100 - discountPercent) / 100);
      
      return new StringSelectMenuOptionBuilder()
        .setLabel(option.name)
        .setDescription(`${formatGPAmount(finalPrice)} GP • ${option.description?.substring(0, 50) || 'Premium service'}`)
        .setValue(option.id);
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`order_option_${service.id}`)
      .setPlaceholder('🛒 Choose service option for your order...')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      embeds: [embed],
      components: [actionRow],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling order service selection:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing your service selection.',
      ephemeral: true
    });
  }
}

// Handle order option selection (final step)
async function handleOrderOptionSelection(interaction: any, customId: string, optionId: string) {
  try {
    const serviceId = customId.replace('order_option_', '');
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    // Get service and option details
    const service = await storage.getService(serviceId);
    if (!service) {
      await interaction.reply({
        content: '❌ Service not found.',
        ephemeral: true
      });
      return;
    }

    const selectedOption = service.options?.find(opt => opt.id === optionId);
    if (!selectedOption) {
      await interaction.reply({
        content: '❌ Service option not found.',
        ephemeral: true
      });
      return;
    }

    // Get user's wallet
    const wallet = await storage.getUserWallet(userId);
    if (!wallet) {
      await interaction.reply({
        content: '❌ Wallet not found. Please contact support.',
        ephemeral: true
      });
      return;
    }

    // Calculate pricing with discount
    const unitPrice = typeof selectedOption.price === 'string' 
      ? parseInt(selectedOption.price.replace(/[^0-9]/g, '')) 
      : selectedOption.price || 10000;
    
    const discountPercent = getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank);
    const finalPrice = Math.floor(unitPrice * (100 - discountPercent) / 100);
    
    // Check balance
    if (wallet.balanceGp < finalPrice) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Insufficient Balance')
        .setDescription(`You need ${formatGPAmount(finalPrice)} GP but only have ${formatGPAmount(wallet.balanceGp)} GP.`)
        .addFields([
          {
            name: '🛍️ Selected Service',
            value: `${service.name} - ${selectedOption.name}`,
            inline: false
          },
          {
            name: '💰 Required Amount',
            value: formatGPAmount(finalPrice) + ' GP',
            inline: true
          },
          {
            name: '💳 Current Balance',
            value: formatGPAmount(wallet.balanceGp) + ' GP',
            inline: true
          }
        ])
        .setColor(0xFF0000);

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      return;
    }

    // Create the order
    const orderNumber = await storage.generateOrderNumber();
    const order = await storage.createOrder({
      orderNumber,
      userId,
      username,
      walletId: wallet.id,
      status: 'pending',
      totalAmountGp: finalPrice,
      originalAmountGp: unitPrice,
      discountApplied: discountPercent,
      discountAmountGp: unitPrice - finalPrice,
      customerRank: getCustomerRank(wallet.totalSpentGp || 0, wallet.manualRank)?.name || null,
      paymentStatus: 'pending'
    });

    // Create order item
    await storage.createOrderItem({
      orderId: order.id,
      serviceType: service.category,
      serviceId: service.id,
      serviceName: service.name,
      description: `${service.name} - ${selectedOption.name}`,
      quantity: 1,
      unitPriceGp: unitPrice,
      totalPriceGp: finalPrice,
      configuration: JSON.stringify({
        optionId: selectedOption.id,
        optionName: selectedOption.name,
        optionDescription: selectedOption.description
      }),
      status: 'pending'
    });

    // Process payment and confirm order
    await processOrderPayment(order.id, wallet, finalPrice);

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setTitle('🎉 Order Created Successfully!')
      .setDescription('Your order has been created and payment processed automatically.')
      .addFields([
        {
          name: '📦 Order Number',
          value: order.orderNumber,
          inline: true
        },
        {
          name: '🛍️ Service',
          value: `${service.name} - ${selectedOption.name}`,
          inline: true
        },
        {
          name: '💰 Total Paid',
          value: `${formatGPAmount(finalPrice)} GP`,
          inline: true
        },
        {
          name: '🎯 Discount Applied',
          value: discountPercent > 0 ? `${discountPercent}% (${formatGPAmount(unitPrice - finalPrice)} GP saved)` : 'None',
          inline: false
        },
        {
          name: '📊 Order Status',
          value: '✅ Confirmed and ready for processing',
          inline: false
        }
      ])
      .setColor(0x00FF00)
      .setFooter({ text: `Use /order-status ${order.orderNumber} to check progress` });

    // Create buttons for follow-up actions
    const viewOrderButton = new ButtonBuilder()
      .setLabel('📋 View Order Details')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(`view_order_${order.id}`);

    const newOrderButton = new ButtonBuilder()
      .setLabel('🛒 Create Another Order')
      .setStyle(ButtonStyle.Primary)
      .setCustomId('create_new_order');

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(viewOrderButton, newOrderButton);

    await interaction.reply({
      embeds: [successEmbed],
      components: [actionRow],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling order option selection:', error);
    await interaction.reply({
      content: '❌ An error occurred while creating your order. Please try again.',
      ephemeral: true
    });
  }
}

// Process order payment automatically
async function processOrderPayment(orderId: string, wallet: any, amount: number) {
  try {
    // Deduct from wallet balance
    await storage.updateUserWallet(wallet.id, {
      balanceGp: wallet.balanceGp - amount,
      totalSpentGp: (wallet.totalSpentGp || 0) + amount,
      totalOrders: wallet.totalOrders + 1
    });

    // Create transaction record
    await storage.createWalletTransaction({
      walletId: wallet.id,
      userId: wallet.userId,
      type: 'purchase',
      amount: '0.00',
      amountGp: amount,
      currency: 'GP',
      description: `Order payment`,
      status: 'completed'
    });

    // Update order to confirmed and paid
    await storage.updateOrder(orderId, {
      paymentStatus: 'paid',
      status: 'confirmed'
    });

    // Add status history
    await storage.createOrderStatusHistory({
      orderId,
      previousStatus: 'pending',
      newStatus: 'confirmed',
      updatedBy: 'system',
      updatedByUsername: 'System',
      notes: 'Payment processed successfully',
      isSystemUpdate: true
    });

  } catch (error) {
    console.error('Error processing order payment:', error);
    throw error;
  }
}

// Vouching command handlers
async function handleVouchCommand(message: any) {
  try {
    storage.updateCommandUsage('vouch').catch(() => {});

    const vouchContent = message.content.slice('!vouch '.length).trim();

    if (!vouchContent || vouchContent.length < 5) {
      await message.reply('❌ **Usage:** `!vouch <your message>`\n\n**Example:** `!vouch Great service, fast fire cape! Highly recommend Dragon Services.`');
      return;
    }

    if (vouchContent.length > 500) {
      await message.reply('❌ Vouch message cannot be longer than 500 characters.');
      return;
    }

    const username = message.author.username;
    const userId = message.author.id;

    // Build the vouch embed
    const vouchEmbed = new EmbedBuilder()
      .setColor(0xFF6B35)
      .setTitle('⭐ New Vouch - Dragon Services')
      .setDescription(`💬 *"${vouchContent}"*`)
      .addFields(
        {
          name: '👤 From',
          value: `**${username}** (<@${userId}>)`,
          inline: true
        },
        {
          name: '🎯 Service',
          value: '**Dragon Services** • OSRS',
          inline: true
        },
        {
          name: '🔗 Also vouch on Sythe',
          value: '[Click here to leave a vouch on our Sythe thread](https://www.sythe.org/threads/4326552/osrs-services-vouchers/)',
          inline: false
        }
      )
      .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
      .setFooter({
        text: '🐲 Dragon Services • Thank you for your feedback!',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp();

    // Post to services-vouch channel
    try {
      let vouchChannel = client.channels.cache.get(VOUCH_CHANNEL_ID) as TextChannel | null;
      if (!vouchChannel) {
        vouchChannel = await client.channels.fetch(VOUCH_CHANNEL_ID) as TextChannel | null;
      }
      if (vouchChannel && vouchChannel.isTextBased()) {
        await (vouchChannel as any).send({ embeds: [vouchEmbed] });
      }
    } catch (err) {
      console.error('Error posting vouch to services-vouch channel:', err);
    }

    // Post to Sythe vouch channel
    try {
      let sytheChannel = client.channels.cache.get(SYTHE_VOUCH_CHANNEL_ID) as TextChannel | null;
      if (!sytheChannel) {
        sytheChannel = await client.channels.fetch(SYTHE_VOUCH_CHANNEL_ID) as TextChannel | null;
      }
      if (sytheChannel && sytheChannel.isTextBased()) {
        await (sytheChannel as any).send({ embeds: [vouchEmbed] });
      }
    } catch (err) {
      console.error('Error posting vouch to Sythe vouch channel:', err);
    }

    // Save to database
    try {
      await storage.createVouch({
        voucherUserId: userId,
        voucherUsername: username,
        vouchedUserId: 'dragon-services',
        vouchedUsername: 'Dragon Services',
        vouchType: 'quality',
        isPositive: true,
        reason: vouchContent,
        serviceContext: undefined,
        orderId: undefined,
        isVerified: true,
        isActive: true,
        moderationNotes: undefined,
        moderatedBy: undefined,
        moderatedAt: undefined,
      });
    } catch (err) {
      console.error('Error saving vouch to database:', err);
    }

    // Confirm to the user
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Vouch Posted!')
          .setDescription(`Your vouch has been posted to <#${VOUCH_CHANNEL_ID}> and <#${SYTHE_VOUCH_CHANNEL_ID}>.\n\nThank you for your feedback, **${username}**! 🐲`)
          .setTimestamp()
      ]
    });

  } catch (error) {
    console.error('❌ Error handling !vouch command:', error);
    await message.reply('❌ An error occurred while posting your vouch. Please try again.');
  }
}

async function handleLeaveVouchCommand(message: any) {
  try {
    // Update command usage
    storage.updateCommandUsage('leavevouch').catch(() => {});
    
    const userId = message.author.id;
    const username = message.author.username;
    
    // Parse command: !leavevouch ORDER123 This service was amazing!
    const args = message.content.split(' ');
    if (args.length < 3) {
      await message.reply('❌ **Invalid Format**\n\nUsage: `!leavevouch ORDER123 [your vouch message]`\n\nExample: `!leavevouch ORDER123 Amazing service! Fast and professional fire cape completion.`');
      return;
    }
    
    const orderNumber = args[1].toUpperCase();
    
    // Simple logging for vouch attempts
    console.log(`📝 VOUCH: ${username} attempting to vouch for order ${orderNumber}`);
    const vouchText = args.slice(2).join(' ');
    
    if (vouchText.length < 10) {
      await message.reply('❌ **Vouch Too Short**\n\nPlease provide a more detailed vouch (at least 10 characters) to help other customers understand your experience.');
      return;
    }
    
    if (vouchText.length > 500) {
      await message.reply('❌ **Vouch Too Long**\n\nPlease keep your vouch under 500 characters for better readability.');
      return;
    }
    
    // Check if order exists and is completed
    const order = await storage.getOrderByNumber(orderNumber);
    if (!order) {
      await message.reply(`❌ **Order Not Found**\n\nOrder **${orderNumber}** does not exist. Please check the order number and try again.`);
      return;
    }
    
    if (order.status !== 'completed') {
      await message.reply(`❌ **Order Not Completed**\n\nOrder **${orderNumber}** is not yet completed (Status: **${order.status}**). You can only vouch for completed orders.`);
      return;
    }
    
    // Anyone can vouch on completed orders - the voucher's name shows who gave the vouch
    
    // Check if user already vouched for this order
    const existingOrderVouch = await storage.getVouchByOrderAndUser(orderNumber, userId);
    if (existingOrderVouch) {
      await message.reply(`❌ **Already Vouched**\n\nYou have already left a vouch for order **${orderNumber}**. Each customer can only vouch once per order.`);
      return;
    }
    
    // Get the worker info for vouching
    let vouchedUserId = order.workerId || 'dragon-services';
    let vouchedUsername = 'Dragon Services Team';
    
    if (order.workerId) {
      try {
        const worker = await storage.getUser(order.workerId);
        if (worker) {
          vouchedUsername = worker.username || 'Dragon Services Worker';
        }
      } catch (err) {
        console.log('Could not fetch worker info:', err);
      }
    }

    // Create the order completion vouch
    const orderVouch = await storage.createVouch({
      voucherUserId: userId,
      voucherUsername: username,
      vouchedUserId: vouchedUserId,
      vouchedUsername: vouchedUsername,
      vouchType: 'quality', // Default to quality for order vouches
      reason: vouchText,
      isPositive: true, // Order completion vouches are always positive
      orderNumber: orderNumber // Link to specific order
    });
    
    // Get the worker info
    let workerInfo = 'Dragon Services Team';
    if (order.workerId) {
      try {
        const worker = await storage.getUser(order.workerId);
        if (worker) {
          workerInfo = worker.username || 'Dragon Services Worker';
        }
      } catch (err) {
        console.log('Could not fetch worker info:', err);
      }
    }
    
    // Send confirmation to the customer
    const confirmEmbed = {
      color: 0xFF6B35, // Dragon fire orange
      title: '🎉 Vouch Posted Successfully!',
      description: `🐲 **Thank you for your feedback!** Your vouch has been posted to the Dragon Services community.`,
      fields: [
        {
          name: '📋 Order Details',
          value: `🆔 **Order:** ${orderNumber}\n🎯 **Service:** ${order.serviceName || 'Dragon Services'}\n👤 **Worker:** ${workerInfo}`,
          inline: true
        },
        {
          name: '⭐ Your Vouch',
          value: `💬 "${vouchText}"\n\n🌟 **Type:** Quality Service\n✅ **Status:** Posted to community`,
          inline: true
        },
        {
          name: '🚀 What\'s Next?',
          value: `🎖️ **Thank you for choosing Dragon Services!**\n🔄 **Need more services?** Use \`/dragon-services\` anytime\n📞 **Support:** Our team is always here to help`,
          inline: false
        }
      ],
      footer: {
        text: '🐲 Dragon Services',
        icon_url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      },
      timestamp: new Date().toISOString(),
      thumbnail: {
        url: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png'
      }
    };
    
    await message.reply({ embeds: [confirmEmbed] });
    
    // Post to vouch channel for community visibility
    await postVouchToChannel(orderVouch, order, workerInfo, vouchText);
    
  } catch (error) {
    console.error('Error handling !leavevouch command:', error);
    await message.reply('❌ An error occurred while processing your vouch. Please try again later.');
  }
}

async function postVouchToChannel(vouch: any, order: any, workerInfo: string, vouchText: string) {
  try {
    console.log(`🎯 Attempting to post vouch to channel ${VOUCH_CHANNEL_ID}...`);
    
    // Try to get channel from cache first, then fetch if not found
    let vouchChannel = client.channels.cache.get(VOUCH_CHANNEL_ID);
    
    if (!vouchChannel) {
      console.log('📡 Channel not in cache, fetching...');
      try {
        vouchChannel = await client.channels.fetch(VOUCH_CHANNEL_ID);
        console.log(`✅ Successfully fetched channel: ${vouchChannel?.id}`);
      } catch (fetchError) {
        console.error('❌ Failed to fetch vouch channel:', fetchError);
        console.error(`   Make sure channel ID ${VOUCH_CHANNEL_ID} is correct and bot has access`);
        return;
      }
    }
    
    if (!vouchChannel || !vouchChannel.isTextBased()) {
      console.error('❌ Vouch channel is not a text channel or is invalid');
      console.error(`   Channel ID: ${VOUCH_CHANNEL_ID}`);
      console.error(`   Channel Type: ${vouchChannel?.type}`);
      return;
    }
    
    // Get service info
    const serviceName = order.serviceName || 'Dragon Services';
    const orderNumber = order.orderNumber;
    
    console.log(`📝 Creating vouch embed for order ${orderNumber}...`);
    
    // Create beautiful community vouch embed with BIG vouch text
    const communityVouchEmbed = new EmbedBuilder()
      .setTitle('🌟 NEW CUSTOMER VOUCH - DRAGON SERVICES')
      .setDescription(`# 💬 "${vouchText}"\n\n` +
                     `> ⭐ **Service Quality:** Exceptional\n` +
                     `> ✅ **Status:** Verified Order Completion\n` +
                     `> 👤 **Customer:** ${vouch.voucherUsername}\n\n` +
                     `🐲 **Another successful Dragon Services delivery!**`)
      .addFields([
        {
          name: '📋 Service Details',
          value: `🆔 **Order:** ${orderNumber}\n🎯 **Service:** ${serviceName}\n👨‍💼 **Handled by:** ${workerInfo}`,
          inline: true
        },
        {
          name: '🏆 Dragon Services Excellence',
          value: `🛡️ **Security:** Protected & Safe\n⚡ **Speed:** Fast Delivery\n🎖️ **Quality:** Premium Standard\n🤝 **Support:** 24/7 Available`,
          inline: true
        },
        {
          name: '🚀 Join Our Community!',
          value: `🔥 **Ready for OSRS services?** Use \`/dragon-services\` to get started\n💎 **Quality Guaranteed:** Join thousands of satisfied customers\n🐲 **Dragon Services:** Your trusted OSRS service provider`,
          inline: false
        }
      ])
      .setColor(0xFF6B35) // Dragon fire orange
      .setFooter({ 
        text: '🐲 Dragon Services',
        iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
      })
      .setTimestamp()
      .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png');
    
    console.log(`📤 Sending vouch embed to channel...`);
    await (vouchChannel as any).send({ embeds: [communityVouchEmbed] });
    
    console.log(`✅ Successfully posted vouch to channel for order: ${orderNumber} by ${vouch.voucherUsername}`);
  } catch (error) {
    console.error('❌ Error posting vouch to channel:', error);
    console.error('   Full error details:', JSON.stringify(error, null, 2));
  }
}

async function handleVouchesCommand(message: any) {
  const args = message.content.split(' ').slice(1);
  
  let targetUserId: string;
  let targetUsername: string;
  
  if (args.length === 0) {
    // Show vouches for the message author
    targetUserId = message.author.id;
    targetUsername = message.author.username;
  } else {
    // Parse the mentioned user
    const mentionMatch = args[0].match(/^<@!?(\d+)>$/) || args[0].match(/^@?(.+)$/);
    if (!mentionMatch) {
      await message.reply('❌ **Usage:** `!vouches` or `!vouches @username`');
      return;
    }

    targetUserId = mentionMatch[1];
    targetUsername = args[0];
    
    // If it's a Discord mention, get the user info
    if (args[0].startsWith('<@')) {
      try {
        const targetUser = await client.users.fetch(targetUserId);
        targetUsername = targetUser.username;
      } catch (error) {
        await message.reply('❌ **Error:** Could not find that user.');
        return;
      }
    } else {
      // Clean username (remove @)
      targetUsername = args[0].replace('@', '');
      targetUserId = targetUsername; // For non-Discord users
    }
  }

  try {
    // Get vouches and reputation stats
    const [userVouches, reputationStats] = await Promise.all([
      storage.getVouchesByUser(targetUserId),
      storage.getVouchReputationStats(targetUserId)
    ]);

    // Create reputation display
    let reputationText = '📊 **No vouches yet**';
    if (reputationStats.totalVouches > 0) {
      const scoreEmoji = reputationStats.reputationScore >= 90 ? '🌟' : 
                         reputationStats.reputationScore >= 75 ? '✅' : 
                         reputationStats.reputationScore >= 50 ? '⚠️' : '❌';
      
      reputationText = `${scoreEmoji} **${reputationStats.reputationScore}% Reputation** (${reputationStats.positiveVouches}+ / ${reputationStats.negativeVouches}-)`;
      
      // Add breakdown by type
      const typeBreakdown = Object.entries(reputationStats.vouchesByType)
        .map(([type, count]) => `${type}: ${count}`)
        .join(' • ');
      
      if (typeBreakdown) {
        reputationText += `\n**Breakdown:** ${typeBreakdown}`;
      }
    }

    // Create vouches embed
    const vouchesEmbed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle(`${targetUsername}'s Vouches`)
      .setDescription(reputationText)
      .setFooter({ text: '🐲 Dragon Services', iconURL: 'https://i.imgur.com/dragon-small.png' })
      .setTimestamp();

    // Add recent vouches (up to 10)
    if (userVouches.length > 0) {
      const recentVouches = userVouches.slice(0, 10);
      let vouchText = '';
      
      for (const vouch of recentVouches) {
        const typeEmoji = vouch.vouchType === 'quality' ? '⭐' :
                         vouch.vouchType === 'trustworthy' ? '🛡️' :
                         vouch.vouchType === 'reliable' ? '✅' :
                         vouch.vouchType === 'communication' ? '💬' :
                         vouch.vouchType === 'speed' ? '⚡' : '👍';
                         
        const vouchIcon = vouch.isPositive ? '✅' : '❌';
        const date = new Date(vouch.createdAt).toLocaleDateString();
        
        const shortReason = vouch.reason.length > 100 ? vouch.reason.substring(0, 97) + '...' : vouch.reason;
        vouchText += `${vouchIcon} ${typeEmoji} **${vouch.voucherUsername}** (${date})\n${shortReason}\n\n`;
      }
      
      vouchesEmbed.addFields({
        name: `Recent (${userVouches.length} total)`,
        value: vouchText || 'None',
        inline: false
      });
    }

    await message.reply({ embeds: [vouchesEmbed] });

    // Update command usage
    storage.updateCommandUsage('vouches').catch(() => {});
    
  } catch (error) {
    console.error('❌ Error fetching vouches:', error);
    await message.reply('❌ **Error:** Failed to fetch vouches. Please try again later.');
  }
}

function getOrderStatusEmoji(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending': return '⏳';
    case 'confirmed': return '✅';
    case 'in_progress': return '🔄';
    case 'completed': return '🎉';
    case 'cancelled': return '❌';
    default: return '📦';
  }
}


export { client };
