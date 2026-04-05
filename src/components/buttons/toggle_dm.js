const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const db = require('../../database/db');

module.exports = {
    data: {
        customId: 'toggle_dm',
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

            const dmToggle = await db.get(`dm_toggle_${interaction.user.id}`);
            if (dmToggle) {
                await db.delete(`dm_toggle_${interaction.user.id}`);
                const embed = infoEmbed(`👤 | ${target.tag}`, null)
                    .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setDescription("Mesaj almayı açtınız. Bundan sonra size mesaj gönderilebilecek.")
                    .setColor("#32a852");

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            await db.set(`dm_toggle_${interaction.user.id}`, true);

            const embed = infoEmbed(`👤 | ${target.tag}`, null)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription("Mesaj almayı kapattınız. Bundan sonra size mesaj gönderilmeyecek.")
                .setColor("#a83232");

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
