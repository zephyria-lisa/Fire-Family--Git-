const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Üyeyi İncele')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        const target = interaction.targetUser;
        const member = interaction.targetMember;

        const embed = infoEmbed(`👤 ${target.tag}`, null)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'ID', value: `\`${target.id}\``, inline: true },
                { name: 'Bot Mu?', value: target.bot ? 'Evet' : 'Hayır', inline: true },
                { name: 'Hesap Oluşturulma Tarihi', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
            );

        if (member) {
            embed.addFields(
                { name: 'Sunucuya Katılma', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Takma Ad', value: member.nickname ?? 'Yok', inline: true },
                { name: 'En Yüksek Rol', value: `${member.roles.highest}`, inline: true },
            );
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
