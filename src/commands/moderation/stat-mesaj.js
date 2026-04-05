const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const { getTodayDate } = require('../../utils/time');
const { getQuotaStatus, getUserScore } = require('../../utils/cooldown');
const { emojis } = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stat-mesaj')
        .setDescription('Botun otomatik güncellediği istatistik mesajını gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const statsEmbed = baseEmbed()
            .setTitle(`${emojis.info} | İstatistikler`)
            .setDescription(`Bu mesaj, otomatik olarak güncellenecektir.`)

        const message = await interaction.reply({
            embeds: [statsEmbed],
            fetchReply: true
        });

        await db.set(`stats_message`, {
            messageId: message.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id
        });
    },
};
