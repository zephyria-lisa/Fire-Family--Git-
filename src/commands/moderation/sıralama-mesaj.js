const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { baseEmbed } = require('../../utils/embeds');
const { emojis } = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sıralama-mesaj')
        .setDescription('Otomatik olarak güncellenen bir sıralama mesajı gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const message = await interaction.deferReply({ fetchReply: true });
        const placeholderEmbed = baseEmbed()
            .setTitle(`Fire Family - Günlük Mesaj Sıralaması`)
            .setDescription(`Mesaj sıralaması kısa süre içerisinde güncellenecektir...`)
            .setFooter({
                text: interaction.client.user.username,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.editReply({
            embeds: [placeholderEmbed]
        });

        await db.set(`stat_mesaj`, {
            guildId: interaction.guild.id,
            messageId: message.id,
            channelId: interaction.channel.id
        });
    },
};
