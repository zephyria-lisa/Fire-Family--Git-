const { successEmbed, infoEmbed, errorEmbed } = require('../../utils/embeds');
const jsonConfig = require('../../utils/config.json');
const Logger = require('../../utils/logger');

/**
 * Handle report modal submissions.
 * Submissions come from the 'Şikayet Et' message context menu.
 */
module.exports = {
    data: {
        customId: 'report_user_modal_',
        startsWith: true,
    },

    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        // Custom ID format: report_modal_TARGETID_MESSAGEID
        const targetId = parts[3];
        const reason = interaction.fields.getTextInputValue('report_reason');

        try {
            const logChannelId = jsonConfig.report_log_id;
            const logChannel = client.channels.cache.get(logChannelId) || await client.channels.fetch(logChannelId).catch(() => null);

            if (!logChannel) {
                Logger.error(`Report log channel (${logChannelId}) not found.`);
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Rapor kanalı bulunamadı. Lütfen yöneticiye bildirin.')],
                    ephemeral: true
                });
            }

            const targetUser = await interaction.guild.members.cache.find(m => m.id === targetId);

            const reportEmbed = infoEmbed('📢 Yeni Şikayet', `👤 | Bir kullanıcı şikayet edildi.`)
                .addFields(
                    { name: 'Şikayet Eden', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: 'Şikayet Edilen', value: targetUser ? `${targetUser} (\`${targetId}\`)` : `\`${targetId}\``, inline: true },
                    { name: 'Sebep', value: `\`\`\`${reason}\`\`\`` }
                )
                .setThumbnail(targetUser ? targetUser.displayAvatarURL({ dynamic: true }) : null)
                .setTimestamp();

            await logChannel.send({ embeds: [reportEmbed] });

            await interaction.reply({
                embeds: [successEmbed('Rapor İletildi', 'Şikayetiniz başarıyla moderatörlere iletildi. Teşekkür ederiz.')],
                ephemeral: true
            });

        } catch (error) {
            Logger.error(`Error processing report modal:`, error);
            await interaction.reply({
                embeds: [errorEmbed('Hata', 'Şikayet iletilirken bir sorun oluştu.')],
                ephemeral: true
            });
        }
    },
};
