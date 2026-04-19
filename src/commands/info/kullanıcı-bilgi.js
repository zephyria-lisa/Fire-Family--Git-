const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kullanıcı-bilgi')
        .setDescription('Kullanıcı hakkında bilgi verir')
        .addUserOption((option) =>
            option
                .setName('kullanıcı')
                .setDescription('Kullanıcı')
                .setRequired(false),
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('kullanıcı') || interaction.user;
        const member = interaction.guild?.members.cache.get(target.id);

        const embed = infoEmbed(`👤 ${target.tag}`, null)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'ID', value: target.id, inline: true },
                { name: 'Bot Mu?', value: target.bot ? 'Evet' : 'Hayır', inline: true },
                { name: 'Oluşturulma Tarihi', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
            );

        if (member) {
            embed.addFields(
                { name: 'Sunucuya Katılma', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Takma Ad', value: member.nickname ?? 'Yok', inline: true },
                { name: 'En Yüksek Rol', value: `${member.roles.highest}`, inline: true },
            );
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
