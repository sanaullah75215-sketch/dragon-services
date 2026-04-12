import { SlashCommandBuilder } from 'discord.js';

export async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('dragon-services')
      .setDescription('Access the Dragon Services menu for OSRS services'),
    new SlashCommandBuilder()
      .setName('calculator')
      .setDescription('Calculate total pricing for multiple Dragon Services'),
    new SlashCommandBuilder()
      .setName('deals')
      .setDescription('View current special offers and weekly deals from Dragon Services'),
    new SlashCommandBuilder()
      .setName('order')
      .setDescription('Create a new order for Dragon Services'),
    new SlashCommandBuilder()
      .setName('my-orders')
      .setDescription('View your order history and status'),
    new SlashCommandBuilder()
      .setName('order-status')
      .setDescription('Check the status of a specific order')
      .addStringOption(option =>
        option.setName('order_number')
          .setDescription('Order number (e.g., #ORD-001)')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('complete-order')
      .setDescription('Mark an order as completed and unlock worker deposits (Staff Only)')
      .addStringOption(option =>
        option.setName('order_number')
          .setDescription('Order number to complete (e.g., DS-1234567890)')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('cancel-order')
      .setDescription('Cancel an order and refund the customer wallet (Staff Only)')
      .addStringOption(option =>
        option.setName('order_number')
          .setDescription('Order number to cancel (e.g., DS-1234567890)')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for cancellation')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('rsn')
      .setDescription('Register a RuneScape name to receive Dink updates in this channel (Staff Only)')
      .addStringOption(option =>
        option.setName('username')
          .setDescription('The RuneScape username to track')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('order_number')
          .setDescription('Order number to link (optional)')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('unrsn')
      .setDescription('Unregister a RuneScape name from Dink updates (Staff Only)')
      .addStringOption(option =>
        option.setName('username')
          .setDescription('The RuneScape username to unregister (or leave empty to unregister this channel)')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('dink-setup')
      .setDescription('Get the Dink webhook URL for configuring RuneLite (Staff Only)'),
    new SlashCommandBuilder()
      .setName('set-dink-channel')
      .setDescription('Set the channel where Dink webhook sends updates (Admin Only)')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('The channel where Dink webhook posts updates')
          .setRequired(true)
      ),
  ];

  return commands.map(command => command.toJSON());
}
