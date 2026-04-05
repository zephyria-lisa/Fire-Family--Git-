const { SlashCommandBuilder, PermissionFlagsBits, BaseManager } = require('discord.js');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const { getQuotaStatus, consumeQuota, addToUserScore } = require('../../utils/cooldown');
const { logSecurityEvent } = require('../../utils/security-logs');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yasakla')
        .setDescription('Sunucudan birini yasaklar')
        .addUserOption((option) =>
            option
                .setName('hedef')
                .setDescription('Yasaklanacak üye')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('sebep')
                .setDescription('Yasaklanma sebebi')
                .setRequired(false),
        )
        .addIntegerOption((option) =>
            option
                .setName('süre')
                .setDescription('Yasaklanma süresi (saat)')
                .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('hedef');
        const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';
        const duration = interaction.options.getInteger('süre');

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

        if (quotaStatus.remaining.ban <= 0) {
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Yasaklama hakkınız dolmuştur. (${quotaStatus.used.ban}/${quotaStatus.quota.ban})`)],
                ephemeral: true,
            });
        }

        if (duration) {
            await member.kick({ reason, days: duration });
            await db.set(`temp_ban_${member.guild.id}_${member.id}`, {
                reason: reason,
                moderator: interaction.member.id,
                duration: duration,
                unbanDate: Date.now() + duration * 24 * 60 * 60 * 1000,
            });
        } else {
            await member.ban({ reason: reason });
        }

        await addToUserScore(interaction.member, 'ban');
        await consumeQuota(interaction.member, 'ban');
        await logSecurityEvent(interaction.client, interaction.guild.id, 'ban', {
            target: target.id,
            reason: reason,
            moderator: interaction.member.id,
        });

        const embedInfo = baseEmbed()
            .setColor("#155db0")
            .setTitle('Üye Yasaklandı')
            .setDescription(`** ${target.tag}** adlı üye sunucudan yasaklandı.`)
            .addFields(
                { name: 'Yasaklayan', value: interaction.member.user.tag, inline: true },
                { name: 'Yasaklanan', value: target.tag, inline: true },
                { name: 'Sebep', value: reason, inline: true },
                { name: 'Kalan Günlük Hak', value: `${quotaStatus.remaining.ban - 1}/${quotaStatus.quota.ban}`, inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

        await interaction.reply({
            embeds: [embedInfo],
        });
    },
};
