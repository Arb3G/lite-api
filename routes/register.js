// routes/register.js
const { SlashCommandBuilder } = require('discord.js');
const { getUser, addUser } = require('../services/db');

function isValidStellarPublicKey(key) {
  return /^G[A-Z2-7]{55}$/.test(key);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Link your Stellar wallet to your Discord account')
    .addStringOption(option =>
      option
        .setName('publickey')
        .setDescription('Your Stellar public key (G...)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const publicKey = interaction.options.getString('publickey');
    const discordId = interaction.user.id;

    if (!isValidStellarPublicKey(publicKey)) {
      return interaction.reply({
        content: '❌ That does not look like a valid Stellar public key. Please check and try again.',
        ephemeral: true,
      });
    }

    try {
      const existingUser = await getUser(discordId);

      if (existingUser) {
        if (existingUser.public_key !== publicKey) {
          await addUser(discordId, publicKey);
          return interaction.reply({
            content: '✅ Your Stellar public key was updated successfully!',
            ephemeral: true,
          });
        } else {
          return interaction.reply({
            content: 'ℹ️ Your Stellar public key is already registered.',
            ephemeral: true,
          });
        }
      } else {
        await addUser(discordId, publicKey);
        return interaction.reply({
          content: '✅ Successfully linked your Stellar wallet to your Discord account!',
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error('[register] DB error:', error);
      return interaction.reply({
        content: '⚠️ Sorry, something went wrong while saving your information. Please try again later.',
        ephemeral: true,
      });
    }
  },
};
