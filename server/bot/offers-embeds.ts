import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SpecialOffer } from '@shared/schema';

// Helper function to get category emoji and name
function getCategoryInfo(category: string): { emoji: string; name: string } {
  switch (category.toLowerCase()) {
    case 'skilling':
      return { emoji: '⚒️', name: 'Skilling' };
    case 'questing':
      return { emoji: '📜', name: 'Questing' };
    case 'ironman_gathering':
      return { emoji: '⛏️', name: 'Ironman Gathering' };
    case 'bossing':
      return { emoji: '⚔️', name: 'Bossing' };
    case 'achievements':
      return { emoji: '🏆', name: 'Achievements' };
    case 'pet_hunting':
      return { emoji: '🐉', name: 'Pet Hunting' };
    default:
      return { emoji: '💎', name: 'Other' };
  }
}

// Special Offers and Deals embed functions
export function createSpecialOffersEmbed(offers: SpecialOffer[]) {
  const embed = new EmbedBuilder()
    .setTitle('💎 Special Offers')
    .setDescription('**Limited time discounts!**\n\n⚒️ Skilling • 📜 Questing • ⛏️ Ironman\n⚔️ Bossing • 🏆 Achievements • 🐉 Pets')
    .setColor(0xFFD700)
    .setFooter({
      text: '🐲 Dragon Services • Contact to claim!',
      iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
    })
    .setTimestamp();

  if (offers && offers.length > 0) {
    // Group offers by category
    const categories = ['skilling', 'questing', 'ironman_gathering', 'bossing', 'achievements', 'pet_hunting'];
    
    categories.forEach(category => {
      const categoryOffers = offers.filter(offer => offer.category === category);
      
      if (categoryOffers.length > 0) {
        const categoryInfo = getCategoryInfo(category);
        
        // Build value with all offers in this category
        let categoryValue = '';
        categoryOffers.forEach(offer => {
          const offerTypeEmoji = getOfferTypeEmoji(offer.offerType);
          const discountText = offer.discountPercentage 
            ? `${offer.discountPercentage}% OFF` 
            : offer.discountAmount || 'Special Price';

          const expiryText = offer.expiresAt 
            ? ` • ⏰ Expires <t:${Math.floor(new Date(offer.expiresAt).getTime() / 1000)}:R>`
            : '';

          categoryValue += `${offerTypeEmoji} **${offer.title}**\n`;
          
          // Display multiple items if they exist
          if (offer.items && Array.isArray(offer.items) && offer.items.length > 0) {
            categoryValue += `${discountText}${expiryText}\n`;
            offer.items.forEach((item: any) => {
              categoryValue += `${item.serviceName}: ~~${item.originalPrice}~~ → **${item.salePrice}**\n`;
            });
          } else {
            // Legacy single-item display
            const priceDisplay = offer.originalPrice && offer.salePrice 
              ? `~~${offer.originalPrice}~~ → **${offer.salePrice}**`
              : offer.salePrice || 'Contact';
            categoryValue += `${discountText} • ${priceDisplay}${expiryText}\n`;
          }
          
          categoryValue += `${offer.description.substring(0, 80)}${offer.description.length > 80 ? '...' : ''}\n\n`;
        });

        embed.addFields({
          name: `${categoryInfo.emoji} ${categoryInfo.name}`,
          value: categoryValue.trim(),
          inline: false
        });
      }
    });
  } else {
    embed.addFields({
      name: '📢 No Offers',
      value: 'Check back soon!',
      inline: false
    });
  }

  return embed;
}

export function createSingleOfferEmbed(offer: SpecialOffer) {
  const offerTypeEmoji = getOfferTypeEmoji(offer.offerType);
  const categoryInfo = getCategoryInfo(offer.category);
  const discountText = offer.discountPercentage 
    ? `${offer.discountPercentage}% OFF` 
    : offer.discountAmount || 'Special';

  const embed = new EmbedBuilder()
    .setTitle(`${offerTypeEmoji} ${offer.title}`)
    .setDescription(`**${discountText} - Limited Time!**\n` +
                   `${categoryInfo.emoji} ${categoryInfo.name}\n\n` +
                   `${offer.description}`)
    .setColor(getOfferColor(offer.offerType));

  // Add pricing information
  if (offer.items && Array.isArray(offer.items) && offer.items.length > 0) {
    // Display multiple items
    let itemsValue = '';
    offer.items.forEach((item: any, index: number) => {
      itemsValue += `**${index + 1}. ${item.serviceName}**\n` +
                   `~~${item.originalPrice}~~ ➤ **${item.salePrice}**\n\n`;
    });
    
    embed.addFields({
      name: '💰 Included Services',
      value: itemsValue.trim(),
      inline: false
    });
  } else if (offer.originalPrice && offer.salePrice) {
    // Legacy single-item pricing
    embed.addFields({
      name: '💰 Pricing',
      value: `~~**Original:** ${offer.originalPrice}~~\n` +
             `**🔥 Sale Price:** ${offer.salePrice}\n` +
             `**💎 You Save:** ${offer.discountAmount || 'Huge discount!'}`,
      inline: true
    });
  }

  // Add expiry information with countdown
  if (offer.expiresAt) {
    const timestamp = Math.floor(new Date(offer.expiresAt).getTime() / 1000);
    embed.addFields({
      name: '⏰ Offer Expires',
      value: `🕒 **End Date:** <t:${timestamp}:F>\n` +
             `⏳ **Time Left:** <t:${timestamp}:R>\n` +
             `🚨 **Countdown:** <t:${timestamp}:t>`,
      inline: true
    });
  }

  // Add terms and conditions
  embed.addFields({
    name: '📋 Terms & Conditions',
    value: '• Offer valid while supplies last\n' +
           '• Cannot be combined with other offers\n' +
           '• Account requirements must be met\n' +
           '• Contact support to claim this deal',
    inline: false
  });

  if (offer.imageUrl) {
    embed.setImage(offer.imageUrl);
  }

  embed.setFooter({
    text: `🐲 Dragon Services • ${offer.offerType.toUpperCase()} OFFER • Act Fast!`,
    iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
  });

  embed.setTimestamp();

  return embed;
}

export function createOffersSelectMenu(offers: SpecialOffer[]) {
  if (!offers || offers.length === 0) {
    return null;
  }

  const options = offers.slice(0, 25).map((offer, index) => {
    const offerTypeEmoji = getOfferTypeEmoji(offer.offerType);
    const discountText = offer.discountPercentage 
      ? `${offer.discountPercentage}% OFF` 
      : 'Special Deal';

    return new StringSelectMenuOptionBuilder()
      .setLabel(`${offer.title}`)
      .setDescription(`${offerTypeEmoji} ${discountText} • ${offer.description.substring(0, 40)}...`)
      .setValue(offer.id);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('special_offers_select')
    .setPlaceholder('🔥 Select an offer to view details...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

export function createOfferActionButtons(offer: SpecialOffer) {
  const claimButton = new ButtonBuilder()
    .setLabel('🔥 Claim This Deal')
    .setStyle(ButtonStyle.Primary)
    .setCustomId(`claim_offer_${offer.id}`);

  const backButton = new ButtonBuilder()
    .setLabel('🔙 Back to All Offers')
    .setStyle(ButtonStyle.Secondary)
    .setCustomId('back_to_offers');

  const contactButton = new ButtonBuilder()
    .setLabel('💬 Contact Support')
    .setStyle(ButtonStyle.Success)
    .setCustomId(`contact_offer_${offer.id}`);

  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(claimButton, backButton, contactButton);
}

// Helper functions for offers
function getOfferTypeEmoji(offerType: string): string {
  switch (offerType.toLowerCase()) {
    case 'flash': return '⚡';
    case 'weekly': return '📅';
    case 'limited': return '🔥';
    case 'seasonal': return '🎄';
    default: return '💎';
  }
}

function getOfferColor(offerType: string): number {
  switch (offerType.toLowerCase()) {
    case 'flash': return 0xFF4500; // Orange red for urgency
    case 'weekly': return 0x32CD32; // Lime green for weekly
    case 'limited': return 0xFF1493; // Deep pink for limited
    case 'seasonal': return 0x9370DB; // Medium purple for seasonal
    default: return 0xFFD700; // Gold for default
  }
}