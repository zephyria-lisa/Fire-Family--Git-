const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const logId = interaction.options.getString('olay-id');

        const logEntry = await db.get(`security_log_${logId}`);

        if (!logEntry) {
            return interaction.editReply({
                embeds: [errorEmbed('Hata', 'Bu ID ile bir olay bulunamadı.')]
            });
        }

        const embed = generateSecurityEmbed(logEntry);
        await interaction.editReply({ embeds: [embed] });
    },
};
