import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Service, SpecialOffer } from '@shared/schema';

export function createServicesEmbed() {
  return new EmbedBuilder()
    .setTitle('🐲 DRAGON SERVICES 🐲')
    .setDescription(
      '```\n' +
      '═══════════════════════════════\n' +
      '   ELITE OSRS SERVICE PROVIDER\n' +
      '═══════════════════════════════\n' +
      '```\n\n' +
      '**🔥 Welcome to Dragon Services! 🔥**\n' +
      '*The most trusted OSRS service team*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '🟢 **Questing**\n' +
      '└ *Complete any quest from novice to grandmaster*\n\n' +
      '📱 **Achievement Diaries**\n' +
      '└ *Easy to Elite diary completions*\n\n' +
      '🔥 **Capes & PvM**\n' +
      '└ *Fire Cape, Inferno, & boss services*\n\n' +
      '⚡ **Skilling Services**\n' +
      '└ *1-99 any skill with fast & efficient methods*\n\n' +
      '💰 **Gold Making**\n' +
      '└ *Account builds for maximum GP/hr*\n\n' +
      '🐾 **Pet Hunting**\n' +
      '└ *Dedicated pet grinding services*\n\n' +
      '💀 **Ironman Specialists**\n' +
      '└ *Expert ironman account services*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '**⬇️ Select a category below to view pricing! ⬇️**'
    )
    .setColor(0xFF6B35)
    .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
    .setFooter({
      text: '🐲 Dragon Services • Professional • Trusted • Fast',
      iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
    })
    .setTimestamp();
}

export function createServicesSelectMenu(services: Service[], customId: string = 'dragon_services_select') {
  const options = services.map(service => {
    const description = customId === 'order_service' 
      ? `Add ${service.name.toLowerCase()} to your order`
      : `View ${service.name.toLowerCase()} services and pricing`;
    
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${service.icon} ${service.name}`)
      .setDescription(description)
      .setValue(service.id);
  });

  const placeholder = customId === 'order_service' 
    ? '🛒 Choose services to add to your order...'
    : '🐲 Choose a Dragon Services category...';

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

export function createServiceOptionsEmbed(service: Service) {
  const embed = new EmbedBuilder()
    .setTitle(`${service.icon} ${service.name} Services`)
    .setDescription(`🔥 **${service.description}**\n\n` +
                   `💎 **Available ${service.name} Options:**\n` +
                   `Select your desired service from the dropdown below for detailed pricing and information.`)
    .setColor(0xFF6B35) // Dragon fire orange
    .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png')
    .setFooter({
      text: `🐲 Dragon Services • ${service.name} Specialists • Professional OSRS Services`,
      iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
    })
    .setTimestamp();

  if (service.options && service.options.length > 0) {
    const optionsText = service.options.map((option, index) => 
      `**${index + 1}. ${option.name}**\n${option.description}\n💰 **Price:** ${option.price || 'Contact for quote'}\n⏱️ **Duration:** ${option.duration || 'Varies'}`
    ).join('\n\n');
    
    embed.addFields({
      name: `Available ${service.name} Services`,
      value: optionsText.substring(0, 1024) // Discord field limit
    });
  }

  return embed;
}

export function createServiceOptionsSelectMenu(service: Service) {
  if (!service.options || service.options.length === 0) {
    return null;
  }

  // Discord select menus can only show 25 options max, so we'll take the first 25
  const limitedOptions = service.options.slice(0, 25);
  
  const options = limitedOptions.map((option, index) => {
    // Add star ratings based on price tiers for visual appeal
    const getStarRating = (price: string) => {
      if (price.includes('Contact') || price.includes('quote')) return '💎';
      const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
      if (priceNum >= 100) return '⭐⭐⭐⭐⭐';
      if (priceNum >= 50) return '⭐⭐⭐⭐';
      if (priceNum >= 20) return '⭐⭐⭐';
      if (priceNum >= 10) return '⭐⭐';
      return '⭐';
    };

    const stars = getStarRating(option.price || '');
    
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${option.name}`)
      .setDescription(`${option.price || 'Custom Quote'} • ${option.description?.substring(0, 50) || 'Premium service'}`)
      .setValue(option.id);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`dragon_service_options_${service.id}`)
    .setPlaceholder(`🐲 Choose your ${service.name} service...`)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

// Calculator embed functions
export function createCalculatorEmbed() {
  return new EmbedBuilder()
    .setTitle('🐲 Service Calculator')
    .setDescription('**Calculate your order total**\n\n' +
                   '⚡ Instant pricing\n' +
                   '🎯 Smart discounts\n' +
                   '🏆 VIP benefits applied\n\n' +
                   'Click **Start Calculator** below!')
    .setColor(0xFF6B35)
    .setFooter({
      text: '🐲 Dragon Services • Use !calculator',
      iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
    })
    .setTimestamp();
}

export function createCalculatorComponents() {
  const startButton = new ButtonBuilder()
    .setCustomId('calculator_start')
    .setLabel('🧮 Start Calculator')
    .setStyle(ButtonStyle.Primary);

  return [new ActionRowBuilder<ButtonBuilder>().addComponents(startButton)];
}

export function createServiceSelectionEmbed() {
  return new EmbedBuilder()
    .setTitle('📋 Select Services')
    .setDescription('Choose services for your calculation:\n\n' +
                   '🟢 Questing • 📱 Dairy • 🎮 Mini games\n' +
                   '💀 Ironman • 👥 Builds • ⚔️ PvM\n' +
                   '🏅 Capes • 🏆 Combat • ⚡ Raids')
    .setColor(0x5865F2)
    .setFooter({
      text: 'Select services to calculate',
    });
}

export function createServiceSelectionComponents(services: Service[]) {
  const buttons: ButtonBuilder[] = [];
  
  // Create buttons for each service (max 5 per row)
  services.slice(0, 10).forEach(service => {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`calc_add_${service.id}`)
        .setLabel(`${service.icon} ${service.name}`)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  // Split buttons into rows (max 5 per row)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const rowButtons = buttons.slice(i, i + 5);
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(rowButtons));
  }

  // Add control buttons
  const controlButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('calculator_calculate')
      .setLabel('💰 Calculate Total')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('calculator_reset')
      .setLabel('🔄 Reset')
      .setStyle(ButtonStyle.Danger)
  );
  
  rows.push(controlButtons);
  return rows;
}

export function createCalculationResultEmbed(selectedServices: any[]) {
  let totalValue = 0;
  let totalGP = 0;
  
  // Parse prices and calculate totals
  const serviceDetails = selectedServices.map(service => {
    // Extract numeric value from price (e.g., "50M" -> 50)
    const priceMatch = service.price.match(/(\d+(?:\.\d+)?)/);
    const numericPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
    
    // Convert to GP (assuming M = million)
    let gpValue = 0;
    if (service.price.includes('M')) {
      gpValue = numericPrice * 1000000;
    } else if (service.price.includes('K')) {
      gpValue = numericPrice * 1000;
    } else {
      gpValue = numericPrice;
    }
    
    totalValue += numericPrice;
    totalGP += gpValue;
    
    return {
      ...service,
      gpValue: gpValue,
      numericPrice: numericPrice
    };
  });

  // Calculate bulk discount
  let discount = 0;
  if (selectedServices.length >= 5) {
    discount = 15; // 15% for 5+ services
  } else if (selectedServices.length >= 3) {
    discount = 10; // 10% for 3-4 services
  } else if (selectedServices.length >= 2) {
    discount = 5; // 5% for 2 services
  }

  const discountAmount = (totalGP * discount) / 100;
  const finalTotal = totalGP - discountAmount;

  const embed = new EmbedBuilder()
    .setTitle('💰 CALCULATION RESULTS')
    .setColor(0x00D4AA);

  // Add selected services
  const servicesText = serviceDetails.map((service, index) => 
    `**${index + 1}.** ${service.name} (${service.service})\n💰 ${service.price}`
  ).join('\n\n');

  embed.addFields(
    {
      name: '📋 Selected Services',
      value: servicesText || 'No services selected',
      inline: false
    },
    {
      name: '💵 Subtotal',
      value: `${(totalGP / 1000000).toFixed(1)}M GP`,
      inline: true
    },
    {
      name: '🎯 Bulk Discount',
      value: discount > 0 ? `${discount}% (-${(discountAmount / 1000000).toFixed(1)}M GP)` : 'No discount',
      inline: true
    },
    {
      name: '✅ **FINAL TOTAL**',
      value: `**${(finalTotal / 1000000).toFixed(1)}M GP**`,
      inline: true
    }
  );

  if (discount > 0) {
    embed.setDescription(`🎉 **Bulk Discount Applied!**\nYou saved ${(discountAmount / 1000000).toFixed(1)}M GP with this order!`);
  }

  embed.setFooter({
    text: `Calculator • ${selectedServices.length} service(s) selected`,
  });

  return embed;
}

// Skill calculator embed
export function createSkillCalculatorEmbed(data: any) {
  const { skill, startLevel, endLevel, expNeeded, methods } = data;
  
  const formatGP = (gp: number) => {
    if (gp >= 1000000000) {
      return `${(gp / 1000000000).toFixed(2)}B`;
    } else if (gp >= 1000000) {
      return `${(gp / 1000000).toFixed(2)}M`;
    } else if (gp >= 1000) {
      return `${(gp / 1000).toFixed(1)}K`;
    } else {
      return `${Math.round(gp)}`;
    }
  };

  const skillIcon = getSkillIcon(skill.name);
  
  const embed = new EmbedBuilder()
    .setTitle(`${skillIcon} ${skill.name.charAt(0).toUpperCase() + skill.name.slice(1)} — Levels ${startLevel} to ${endLevel}`)
    .setColor(0xFF6B35);

  // Group method breakdowns by method name
  const grouped: Map<string, any[]> = new Map();
  for (const methodData of methods) {
    const key = methodData.method.name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(methodData);
  }

  let description = '';
  let grandTotal = 0;
  let groupIndex = 0;

  for (const [methodName, entries] of grouped) {
    const methodEmoji = getMethodEmoji(methodName);
    let methodTotal = 0;

    description += `**${methodEmoji} ${methodName}**\n`;

    for (const entry of entries) {
      const { levelRange, totalCost, gpPerXp } = entry;
      methodTotal += totalCost;
      description += `\`[${levelRange}]\` • ${gpPerXp} gp/xp • 💰 ${formatGP(totalCost)} GP\n`;
    }

    description += `> 💵 **Method Total: ${formatGP(methodTotal)} GP**\n`;
    grandTotal += methodTotal;

    groupIndex++;
    if (groupIndex < grouped.size) {
      description += `\n`;
    }
  }

  if (grouped.size > 1) {
    description += `\n━━━━━━━━━━━━━━━━━━━━\n💰 **Grand Total: ${formatGP(grandTotal)} GP**`;
  }

  embed.setDescription(description.trim());

  embed.setFooter({
    text: `🐲 Dragon Services`,
    iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
  });

  embed.setTimestamp();

  return embed;
}

function getOSRSSkillIconUrl(skillName: string): string {
  const iconUrls: { [key: string]: string } = {
    'runecrafting': 'https://oldschool.runescape.wiki/images/thumb/d/d3/Runecraft_icon.png/21px-Runecraft_icon.png',
    'magic': 'https://oldschool.runescape.wiki/images/thumb/5/5c/Magic_icon.png/21px-Magic_icon.png',
    'prayer': 'https://oldschool.runescape.wiki/images/thumb/f/f2/Prayer_icon.png/21px-Prayer_icon.png',
    'construction': 'https://oldschool.runescape.wiki/images/thumb/f/f6/Construction_icon.png/21px-Construction_icon.png',
    'cooking': 'https://oldschool.runescape.wiki/images/thumb/4/47/Cooking_icon.png/21px-Cooking_icon.png',
    'woodcutting': 'https://oldschool.runescape.wiki/images/thumb/f/f4/Woodcutting_icon.png/21px-Woodcutting_icon.png',
    'fletching': 'https://oldschool.runescape.wiki/images/thumb/f/f0/Fletching_icon.png/21px-Fletching_icon.png',
    'fishing': 'https://oldschool.runescape.wiki/images/thumb/a/a8/Fishing_icon.png/21px-Fishing_icon.png',
    'firemaking': 'https://oldschool.runescape.wiki/images/thumb/f/f0/Firemaking_icon.png/21px-Firemaking_icon.png',
    'crafting': 'https://oldschool.runescape.wiki/images/thumb/e/ec/Crafting_icon.png/21px-Crafting_icon.png',
    'smithing': 'https://oldschool.runescape.wiki/images/thumb/d/dd/Smithing_icon.png/21px-Smithing_icon.png',
    'mining': 'https://oldschool.runescape.wiki/images/thumb/4/4a/Mining_icon.png/21px-Mining_icon.png',
    'herblore': 'https://oldschool.runescape.wiki/images/thumb/3/3a/Herblore_icon.png/21px-Herblore_icon.png',
    'agility': 'https://oldschool.runescape.wiki/images/thumb/0/05/Agility_icon.png/21px-Agility_icon.png',
    'thieving': 'https://oldschool.runescape.wiki/images/thumb/4/4a/Thieving_icon.png/21px-Thieving_icon.png',
    'slayer': 'https://oldschool.runescape.wiki/images/thumb/3/34/Slayer_icon.png/21px-Slayer_icon.png',
    'farming': 'https://oldschool.runescape.wiki/images/thumb/f/fc/Farming_icon.png/21px-Farming_icon.png',
    'ranged': 'https://oldschool.runescape.wiki/images/thumb/1/19/Ranged_icon.png/21px-Ranged_icon.png',
    'hunter': 'https://oldschool.runescape.wiki/images/thumb/d/dd/Hunter_icon.png/21px-Hunter_icon.png',
    'attack': 'https://oldschool.runescape.wiki/images/thumb/f/fe/Attack_icon.png/21px-Attack_icon.png',
    'strength': 'https://oldschool.runescape.wiki/images/thumb/1/1b/Strength_icon.png/21px-Strength_icon.png',
    'defence': 'https://oldschool.runescape.wiki/images/thumb/5/57/Defence_icon.png/21px-Defence_icon.png',
    'hitpoints': 'https://oldschool.runescape.wiki/images/thumb/a/a2/Hitpoints_icon.png/21px-Hitpoints_icon.png',
    'sailing': 'https://oldschool.runescape.wiki/images/thumb/c/ce/Sailing_icon.png/21px-Sailing_icon.png'
  };
  return iconUrls[skillName.toLowerCase()] || 'https://oldschool.runescape.wiki/images/thumb/a/a2/Hitpoints_icon.png/21px-Hitpoints_icon.png';
}

function getSkillIcon(skillName: string): string {
  const icons: { [key: string]: string } = {
    'runecrafting': '🔮',
    'magic': '✨',
    'prayer': '🙏',
    'construction': '🏠',
    'cooking': '🍳',
    'woodcutting': '🪓',
    'fletching': '🏹',
    'fishing': '🎣',
    'firemaking': '🔥',
    'crafting': '🧵',
    'smithing': '⚒️',
    'mining': '⛏️',
    'herblore': '🧪',
    'agility': '🏃',
    'thieving': '🗝️',
    'slayer': '⚔️',
    'farming': '🌱',
    'ranged': '🏹',
    'hunter': '🎯',
    'attack': '⚔️',
    'strength': '💪',
    'defence': '🛡️',
    'hitpoints': '❤️',
    'sailing': '⛵'
  };
  return icons[skillName.toLowerCase()] || '📊';
}

function getMethodEmoji(methodName: string): string {
  const lowerName = methodName.toLowerCase();
  // Runecrafting specific
  if (lowerName.includes('zmi')) return '🔮';
  if (lowerName.includes('lava')) return '🌋';
  if (lowerName.includes('guardian')) return '🛡️';
  if (lowerName.includes('blood') || lowerName.includes('soul')) return '🩸';
  
  // General skill methods
  if (lowerName.includes('magic')) return '✨';
  if (lowerName.includes('burst') || lowerName.includes('barrage')) return '💥';
  if (lowerName.includes('chin') || lowerName.includes('chinning')) return '🐭';
  if (lowerName.includes('crab') || lowerName.includes('sand')) return '🦀';
  if (lowerName.includes('dragon') || lowerName.includes('bones')) return '🦴';
  if (lowerName.includes('fishing') || lowerName.includes('fish')) return '🎣';
  if (lowerName.includes('woodcutting') || lowerName.includes('tree')) return '🌳';
  if (lowerName.includes('mining') || lowerName.includes('ore')) return '⛏️';
  if (lowerName.includes('cooking') || lowerName.includes('food')) return '🍳';
  if (lowerName.includes('prayer') || lowerName.includes('altar')) return '🙏';
  if (lowerName.includes('slayer') || lowerName.includes('task')) return '⚔️';
  if (lowerName.includes('agility') || lowerName.includes('course')) return '🏃';
  if (lowerName.includes('thieving') || lowerName.includes('pickpocket')) return '🗝️';
  if (lowerName.includes('construction') || lowerName.includes('house')) return '🏠';
  if (lowerName.includes('crafting') || lowerName.includes('leather')) return '🧵';
  if (lowerName.includes('smithing') || lowerName.includes('anvil')) return '⚒️';
  if (lowerName.includes('herblore') || lowerName.includes('potion')) return '🧪';
  if (lowerName.includes('fletching') || lowerName.includes('bow')) return '🏹';
  if (lowerName.includes('firemaking') || lowerName.includes('logs')) return '🔥';
  if (lowerName.includes('farming') || lowerName.includes('seed')) return '🌱';
  if (lowerName.includes('hunter') || lowerName.includes('trap')) return '🎯';
  
  return '📋';
}

// Quest calculator embed
export function createQuestCalculatorEmbed(data: any) {
  const { quest, priceItems, note } = data;

  const embed = new EmbedBuilder()
    .setTitle(`🗡️ ${quest.name} Quest`)
    .setColor(0xFF6B35)
    .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png');

  let description = `**Quest:** ${quest.name}\n\n`;

  if (priceItems && priceItems.length > 0) {
    description += `💰 **Pricing:**\n`;
    for (const item of priceItems) {
      if (item.discountPercentage > 0) {
        description += `**${item.name}** — ~~${item.price}~~ → ${(item.finalPrice / 1000000).toFixed(1)}M GP (${item.discountPercentage}% off)\n`;
      } else {
        description += `**${item.name}** — ${item.price}\n`;
      }
    }
    description += '\n';
  }

  if (note) {
    description += `📝 *${note}*\n\n`;
  }

  description += `⚠️ **Important Notes:**\n`;
  description += `• Skill & combat requirements must be met first\n`;
  description += `• Ironman accounts have additional upcharges\n`;
  description += `• Incomplete skills result in extra fees\n`;
  description += `• Contact support for custom pricing\n`;

  embed.setDescription(description.trim());
  embed.setFooter({
    text: `🐲 Dragon Services • Elite Quest Specialists • Requirements & Ironman upcharges apply`,
    iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
  });
  embed.setTimestamp();

  return embed;
}

function getQuestIconUrl(questName: string): string {
  // Use generic quest icon URLs or specific quest icons
  const iconUrls: { [key: string]: string } = {
    'cooking assistant': 'https://oldschool.runescape.wiki/images/thumb/4/47/Cooking_icon.png/21px-Cooking_icon.png',
    'dragon slayer': 'https://oldschool.runescape.wiki/images/thumb/f/fe/Attack_icon.png/21px-Attack_icon.png',
    'recipe for disaster': 'https://oldschool.runescape.wiki/images/thumb/4/47/Cooking_icon.png/21px-Cooking_icon.png',
    'monkey madness': 'https://oldschool.runescape.wiki/images/thumb/1/19/Ranged_icon.png/21px-Ranged_icon.png',
    'song of the elves': 'https://oldschool.runescape.wiki/images/thumb/1/19/Ranged_icon.png/21px-Ranged_icon.png',
    'desert treasure': 'https://oldschool.runescape.wiki/images/thumb/5/5c/Magic_icon.png/21px-Magic_icon.png'
  };
  
  // Return specific icon or default quest icon
  return iconUrls[questName.toLowerCase()] || 'https://oldschool.runescape.wiki/images/thumb/2/29/Quest_point_icon.png/21px-Quest_point_icon.png';
}

function getServiceEmoji(serviceType: string): string {
  const lowerType = serviceType.toLowerCase();
  
  if (lowerType.includes('standard') || lowerType.includes('normal')) return '📋';
  if (lowerType.includes('express') || lowerType.includes('fast') || lowerType.includes('quick')) return '⚡';
  if (lowerType.includes('vip') || lowerType.includes('premium') || lowerType.includes('priority')) return '👑';
  if (lowerType.includes('economy') || lowerType.includes('basic') || lowerType.includes('cheap')) return '💰';
  if (lowerType.includes('deluxe') || lowerType.includes('luxury')) return '🌟';
  
  return '🗡️'; // Default quest icon
}

// Multi-quest calculator embed
export function createMultiQuestCalculatorEmbed(questsData: any[]) {
  const formatGP = (gp: number) => {
    if (gp >= 1000000000) return `${(gp / 1000000000).toFixed(2)}B`;
    if (gp >= 1000000) return `${(gp / 1000000).toFixed(1)}M`;
    if (gp >= 1000) return `${(gp / 1000).toFixed(1)}K`;
    return `${Math.round(gp)}`;
  };

  const embed = new EmbedBuilder()
    .setTitle(`🧮 Quest Calculator (${questsData.length} Quests)`)
    .setColor(0xFF6B35)
    .setThumbnail('https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/130px-Dragon_full_helm.png');

  let description = '';
  let grandTotal = 0;

  questsData.forEach(questData => {
    const { quest, priceItems } = questData;
    description += `**${quest.name}**\n`;

    if (priceItems && priceItems.length > 0) {
      for (const item of priceItems) {
        const price = item.finalPrice || item.originalPrice || 0;
        grandTotal += price;
        if (item.discountPercentage > 0) {
          description += `• ${item.name}: ~~${item.price}~~ → ${formatGP(item.finalPrice)} GP (${item.discountPercentage}% off)\n`;
        } else {
          description += `• ${item.name}: **${item.price}**\n`;
        }
      }
    }
    description += '\n';
  });

  if (grandTotal > 0) {
    description += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    description += `**💰 Grand Total: ${formatGP(grandTotal)} GP**\n\n`;
  }

  description += `⚠️ **Important Notes:**\n`;
  description += `• All skill & combat requirements must be met\n`;
  description += `• Ironman accounts incur additional upcharges\n`;
  description += `• Missing skills will add extra fees per quest\n`;

  embed.setDescription(description.trim());
  embed.setFooter({
    text: `🐲 Dragon Services • Elite Multi-Quest Specialists • Requirements & Ironman upcharges apply`,
    iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
  });
  embed.setTimestamp();

  return embed;
}
