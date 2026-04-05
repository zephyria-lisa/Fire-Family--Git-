const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');

module.exports = {
    data: {
        customId: 'kick_member_',
        startsWith: true, // Matches dynamic ID logic in interactionCreate.js
    },

    async execute(interaction, client) {
        // Extract the user ID from the customId (view_member_ID)
        const targetId = interaction.customId.replace('kick_member_', '');

        try {
            const target = await client.users.fetch(targetId);
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);

            if (!target) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcı sunucuda bulunamadı.')],
                    ephemeral: true
                });
            }

            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bunu kullanmak için yönetici olmalısın.')],
                    ephemeral: true
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcı senden daha yüksek bir role sahip.')],
                    ephemeral: true
                });
            }

            if (member.guild.members.me.roles.highest.position <= member.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcıya işlem yapma yetkim yok.')],
                    ephemeral: true
                });
            }

            if (!member.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcıya işlem yapma yetkim yok.')],
                    ephemeral: true
                });
            }

            await member.kick().catch(error => {
                Logger.error(`Error in kick_member button:`, error);
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bir şeyler ters gitti. Bu mesajı görüyorsan, Melisa\'ya söyle.')],
                    ephemeral: true
                });
            });

            const embed = infoEmbed(`👤 ${target.tag}`, null)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription("Şüpheli üye sunucudan atıldı.")
                .addFields(
                    { name: 'ID', value: `\`${target.id}\``, inline: true },
                    { name: 'Bot mu?', value: target.bot ? 'Evet' : 'Hayır', inline: true },
                    { name: 'Hesap Oluşturulma Tarihi', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            Logger.error(`Error in view_member button:`, error);
            await interaction.reply({
                embeds: [errorEmbed('Error', 'Failed to fetch member details. They may have left the server.')],
                ephemeral: true
            });
        }
    },
};
