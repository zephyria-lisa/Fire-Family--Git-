const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const Logger = require('./logger');
const { baseEmbed } = require('./embeds');
const config = require('./config.json');
const db = require('../database/db');

/**
 * Checks if a member is suspicious and handles the response.
 * @param {import('discord.js').GuildMember} member The member to check.
 * @param {import('discord.js').Client} client The client instance.
 * @param {boolean} isOfflineJoin Whether this member joined while the bot was offline.
 */
async function checkMember(member, client, isOfflineJoin = false) {
    if (member.user.bot) return;

    const channel = member.guild.channels.cache.get(config.suspicious_member_channel || config.welcome_channel_id);
    if (!channel) return;

    const jailData = await db.get(`jail_${member.id}`);

    if (jailData) {
        const jailRole = member.guild.roles.cache.get(config.roles.jail_role);

        if (!jailRole) {
            Logger.error(`Jail role not found for member ${member.id}`);
            return;
        }

        if (member.roles.cache.has(jailRole.id)) return;

        await member.roles.set([jailRole.id]).catch(e => Logger.error(`Failed to set jail role for member ${member.id}: ${e.message}`));

        const memberDMEmbed = baseEmbed()
            .setColor("#ff0000")
            .setTitle('Karantina - Bilgilendime')
            .setDescription(`Sunucuya tekrardan giriş yaptın ancak karantina verisi bulundu. Bittiğinde otomatik olarak sunucuya erişim sağlayabileceksin.`)
            .setThumbnail(member.displayAvatarURL())
            .addFields(
                { name: 'Süre', value: `${jailData.duration} dakika`, inline: true },
                { name: 'Sebep', value: jailData.reason, inline: true },
                { name: 'Bitiş Tarihi', value: `<t:${Math.floor(new Date(jailData.endDate).getTime() / 1000)}:R>`, inline: true },
                { name: 'Moderator', value: `<@${jailData.moderatorId.toString()}>`, inline: true }
            )
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })

        await member.send({ embeds: [memberDMEmbed] }).catch(() => { });

        return;
    }

    let accountAge = Date.now() - member.user.createdTimestamp;

    // Original logic: halve age if no avatar (making it twice as "new")
    // Note: displayAvatarURL() usually returns a default avatar, so this might need adjustment,
    // but we keep it for consistency with current code.
    if (!member.user.avatar) {
        accountAge = accountAge / 2;
    }

    if (accountAge < config.account_age_threshold) {
        Logger.warn(`Suspicious member detected: ${member.user.tag} (Offline: ${isOfflineJoin})`);

        const embedTitle = isOfflineJoin ? "Şüpheli üye (Bot Kapalıyken Katıldı)!" : "Şüpheli üye!";
        const embedDescription = isOfflineJoin
            ? "Sunucuya ben aktif değilken şüpheli bir üye katıldı! Lütfen kontrol ediniz."
            : "Sunucuya şüpheli bir üye katıldı! Lütfen kontrol ediniz.";

        const embed = baseEmbed()
            .setTitle(embedTitle)
            .setDescription(embedDescription)
            .addFields(
                { name: 'Üye', value: `${member.user.tag}`, inline: true },
                { name: 'ID', value: `\`${member.id}\``, inline: true },
                { name: 'Hesap Oluşturulma Tarihi', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Sunucuya Katılma Tarihi', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            )
            .setColor("#eb3434");

        // Timeout if bot has permissions and member is not higher in hierarchy
        if (member.guild.members.me.roles.highest.position >= member.roles.highest.position
            && member.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)
        ) {
            try {
                await member.timeout(config.account_age_threshold, "Şüpheli üye");
                embed.setDescription(`Sunucuya şüpheli bir üye katıldı! Lütfen kontrol ediniz. Üye ${config.account_age_threshold / 1000 / 60 / 60 / 24} gün boyunca susturuldu.`);
            } catch (error) {
                Logger.error(`Failed to timeout suspicious member ${member.user.tag}: ${error.message}`);
            }
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`kick_member_${member.id}`)
                    .setLabel('Üyeyi At')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`unmute_member_${member.id}`)
                    .setLabel('Susturmayı Kaldır')
                    .setStyle(ButtonStyle.Success)
            );

        await channel.send({ embeds: [embed], components: [row] });
        return true; // Was suspicious
    }

    // Normal join logic (only if not a catch-up check)
    if (!isOfflineJoin) {
        const welcomeEmbed = baseEmbed()
            .setTitle('🚪 | Sunucuya bir üye katıldı!')
            .setDescription(`Sunucumuza hoş geldin, <@${member.id}>!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: 'Redavolistan Bot', iconURL: member.client.user.displayAvatarURL() })
            .addFields(
                { name: 'Üye', value: `${member.user.tag}`, inline: true },
                { name: 'ID', value: `\`${member.id}\``, inline: true },
                { name: 'Hesap Oluşturulma Tarihi', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Sunucuya Katılma Tarihi', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            )
            .setColor("#34eb86");

        const welcomeRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`view_member_${member.id}`)
                    .setLabel('Üyeyi İncele')
                    .setStyle(ButtonStyle.Secondary)
            );

        await channel.send({ embeds: [welcomeEmbed], components: [welcomeRow] });
    }

    return false; // Not suspicious
}

module.exports = { checkMember };
