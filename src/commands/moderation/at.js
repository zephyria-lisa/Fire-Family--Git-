const { SlashCommandBuilder, PermissionFlagsBits, BaseManager } = require('discord.js');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const { getQuotaStatus, consumeQuota, addToUserScore } = require('../../utils/cooldown');
const { logSecurityEvent } = require('../../utils/security-logs');
const db = require('../../database/db');
const config = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('at')
        .setDescription('Sunucudan birini atar')
        .addUserOption((option) =>
            option
                .setName('hedef')
                .setDescription('Atılacak üye')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('sebep')
                .setDescription('Atılma sebebi')
                .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('hedef');
        const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

        const member = await interaction.guild.members.cache.find(m => m.user.id === target.id);

        if (!member) {
            return interaction.reply({
                embeds: [errorEmbed('Hata', 'Bu üyeyi sunucuda bulamadım.')],
                ephemeral: true,
            });
        }

        if (interaction.guild.members.me.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Hata', 'Bu üyeyi yasaklayamıyorum. Belki de benden daha yüksek bir role sahiptir.')],
                ephemeral: true,
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Hata', 'Senden daha yüksekte olan bir üyeyi yasaklayamazsın.')],
                ephemeral: true,
            });
        }

        const quotaStatus = await getQuotaStatus(interaction.member);

        if (quotaStatus.remaining.kick <= 0) {
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Günlük atma hakkınız dolmuştur. (${quotaStatus.used.kick}/${quotaStatus.quota.kick})`)],
                ephemeral: true,
            });
        }

        const DMembed = baseEmbed()
            .setColor("#f5428d")
            .setTitle(`${config.emojis.feet_kick} | Atıldınız!`)
            .setDescription(`** ${interaction.guild.name}** adlı sunucudan atıldınız.`)
            .addFields(
                { name: 'Atan', value: interaction.member.user.tag, inline: true },
                { name: 'Sebep', value: reason, inline: true },
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

        await member.send({ embeds: [DMembed] }).catch(() => { });

        await member.kick({ reason: reason });

        await addToUserScore(interaction.member, 'kick');
        await consumeQuota(interaction.member, 'kick');
        await logSecurityEvent(interaction.client, interaction.guild.id, 'kick', {
            target: target.id,
            reason: reason,
            moderator: interaction.member.id,
        });

        const embedInfo = baseEmbed()
            .setColor("#155db0")
            .setTitle('Üye Atıldı')
            .setDescription(`** ${target.tag}** adlı üye sunucudan atıldı.`)
            .addFields(
                { name: 'Atan', value: interaction.member.user.tag, inline: true },
                { name: 'Atılan', value: target.tag, inline: true },
                { name: 'Sebep', value: reason, inline: true },
                { name: 'Kalan Günlük Hak', value: `${quotaStatus.remaining.kick - 1}/${quotaStatus.quota.kick}`, inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

        await interaction.reply({
            embeds: [embedInfo],
        });
    },
};
