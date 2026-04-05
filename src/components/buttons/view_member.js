const { EmbedBuilder } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');

module.exports = {
    data: {
        customId: 'view_member_',
        startsWith: true, // Matches dynamic ID logic in interactionCreate.js
    },

    async execute(interaction, client) {
        // Extract the user ID from the customId (view_member_ID)
        const targetId = interaction.customId.replace('view_member_', '');
        
        try {
            const target = await client.users.fetch(targetId);
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);

            if (!target) {
                return interaction.reply({
                    embeds: [errorEmbed('Error', 'Could not find that user.')],
                    ephemeral: true
                });
            }

            const embed = infoEmbed(`👤 ${target.tag}`, null)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: 'ID',        value: `\`${target.id}\``,                                 inline: true },
                    { name: 'Bot',       value: target.bot ? 'Yes' : 'No',                          inline: true },
                    { name: 'Created',   value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                );

            if (member) {
                embed.addFields(
                    { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Nickname',      value: member.nickname ?? 'None',                             inline: true },
                    { name: 'Top Role',      value: `${member.roles.highest}`,                            inline: true },
                );
            }

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
