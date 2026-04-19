const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu-bilgi')
        .setDescription('Sunucu hakkında bilgi verir'),

    async execute(interaction) {
        const { guild } = interaction;

        if (!guild) {
            return interaction.reply({ content: 'Bu komut sadece bir sunucuda kullanılabilir.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply();

        const embed = infoEmbed(`📊 ${guild.name}`, null)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'Sahip', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Üyeler', value: `${guild.memberCount}`, inline: true },
                { name: 'Kanallar', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Roller', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Boost Seviyesi', value: `Seviye ${guild.premiumTier}`, inline: true },
                { name: 'Boost Sayısı', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
                { name: 'Oluşturulma', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            );

        await interaction.editReply({ embeds: [embed] });
    },
};
