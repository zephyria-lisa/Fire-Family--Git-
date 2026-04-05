const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const { logSecurityEvent } = require('../../utils/security-logs');

module.exports = {
    data: {
        customId: 'unmute_member_',
        startsWith: true, // Matches dynamic ID logic in interactionCreate.js
    },

    async execute(interaction, client) {
        // Extract the user ID from the customId (view_member_ID)
        const targetId = interaction.customId.replace('unmute_member_', '');

        try {
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);

            if (!member) {
                return interaction.reply({
                    embeds: [errorEmbed('Error', 'Could not find that user.')],
                    ephemeral: true
                });
            }

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcıyı susturma yetkin yok.')],
                    ephemeral: true
                });
            }

            if (!member.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcıyı susturma yetkim yok.')],
                    ephemeral: true
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcıyı susturma yetkin yok. Üst rütbede.')],
                    ephemeral: true
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcıyı susturma yetkin yok. Üst rütbede.')],
                    ephemeral: true
                });
            }

            if (!member.communicationDisabledUntil) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcı zaten susturulmamış.')],
                    ephemeral: true
                });
            }

            member.timeout(null).catch(error => {
                Logger.error(`Error in view_member button:`, error);
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bir şeyler ters gitti.')],
                    ephemeral: true
                });
            })

            const embed = infoEmbed('Başarılı', 'Üyenin susturulması kaldırıldı.')

            await interaction.reply({ embeds: [embed], ephemeral: true });

            await logSecurityEvent(client, interaction.guild.id, 'unmute', {
                target: member.id,
                reason: 'Belirtilmedi.',
                moderator: interaction.member.id,
            });

        } catch (error) {
            Logger.error(`Error in view_member button:`, error);
            await interaction.reply({
                embeds: [errorEmbed('Error', 'Failed to fetch member details. They may have left the server.')],
                ephemeral: true
            });
        }
    },
};
