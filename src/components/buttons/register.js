const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const db = require('../../database/db');
const config = require('../../utils/config.json');

module.exports = {
    data: {
        customId: 'register',
    },

    async execute(interaction, client) {
        try {
            const target = await client.users.fetch(interaction.user.id);

            if (!target) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Sunucuda değilsiniz!')],
                    ephemeral: true
                });
            }

            if (!interaction.guild) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Bu butonu yalnızca sunucuda kullanabilirsiniz!')],
                    ephemeral: true
                });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);

            if (!member) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Sunucuda değilsiniz!')],
                    ephemeral: true
                });
            }

            const memberRole = interaction.guild.roles.cache.find(r => r.id === config.roles.gecici_uye_rol);

            if (!memberRole) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Geçici rol bulunamadı!')],
                    ephemeral: true
                });
            }

            if (member.roles.cache.has(memberRole.id)) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Zaten geçici üyesiniz!')],
                    ephemeral: true
                });
            }

            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Size rolü verebilmek için gerekli yetkilere sahip değilim!')],
                    ephemeral: true
                });
            }

            if (memberRole.position > interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Geçici rolün pozisyonu benim rolümden yüksek! Bunu lütfen geliştiricilere belirtin.')],
                    ephemeral: true
                });
            }

            await member.roles.add(memberRole.id);

            const embed = infoEmbed(`👤 | ${target.tag}`, null)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`Kayıt oldunuz ve <@&${memberRole.id}> rolünü aldınız. Tam erişim sağlamak için <#1488250438292602901> kanalından Roblox hesabınızı bağlayabilirsiniz.`)
                .setColor("#32a852");

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            Logger.error(`Error in register button:`, error);
            await interaction.reply({
                embeds: [errorEmbed('Hata', 'Bir şeyler ters gitti, üzgünüz.')],
                ephemeral: true
            });
        }
    },
};
