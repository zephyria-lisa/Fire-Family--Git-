const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const { generateSecurityEmbed } = require('../../utils/security-logs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('olay-kontrol-et')
        .setDescription('Sunucudaki olayları kontrol eder.')
        .addStringOption((option) =>
            option
                .setName('olay-id')
                .setDescription('Olay ID')
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog),

    async execute(interaction) {
        const logId = interaction.options.getString('olay-id');

        const logEntry = await db.get(`security_log_${logId}`);

        if (!logEntry) {
            return interaction.reply({
                embeds: [errorEmbed('Hata', 'Bu ID ile bir olay bulunamadı.')],
                ephemeral: true,
            });
        }

        const embed = generateSecurityEmbed(logEntry);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
