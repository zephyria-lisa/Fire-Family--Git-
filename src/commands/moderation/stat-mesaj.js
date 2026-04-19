const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const { emojis } = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stat-mesaj')
        .setDescription('Botun otomatik güncellediği istatistik mesajını gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const message = await interaction.deferReply({ fetchReply: true });
        const statsEmbed = baseEmbed()
            .setTitle(`${emojis.info} | İstatistikler`)
            .setDescription(`Bu mesaj, otomatik olarak güncellenecektir.`)

        await interaction.editReply({
            embeds: [statsEmbed]
        });

        await db.set(`stats_message`, {
            messageId: message.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id
        });
    },
};
