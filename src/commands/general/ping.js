/**
 * /ping — Latency check
 */

const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikmesini kontrol eder'),

    cooldown: 5,

    async execute(interaction, client) {
        const sent = await interaction.deferReply({ fetchReply: true });

        const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = Math.round(client.ws.ping);

        const embed = infoEmbed('ℹ️ | Gecikme Bilgisi', [
            `**Round-trip:** \`${roundTrip}ms\``,
        ].join('\n'));

        await interaction.editReply({ embeds: [embed] });
    },
};
