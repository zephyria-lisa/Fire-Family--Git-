const Logger = require('../../utils/logger');
const { checkMember } = require('../../utils/memberChecker');
const db = require('../../database/db');
const { baseEmbed } = require('../../utils/embeds');
const config = require('../../utils/config');
const { syncMemberJail } = require('../../utils/jailUtils');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        Logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);
        await syncMemberJail(member);

        const jailData = await db.get(`jail_${member.id}`);
        if (jailData) {
            const now = new Date();
            const endDate = new Date(jailData.endDate);
            if (endDate > now) {
                const jsonConfig = require('../../utils/config.json');
                const securityLogChannel = member.guild.channels.cache.get(jsonConfig.channels.security_logs);
                if (securityLogChannel) {
                    const jailLogEmbed = baseEmbed()
                        .setTitle(`${config.emojis.lock} | Karantinalı Üye Giriş Yaptı`)
                        .setDescription(`**${member.user.tag}** sunucuya giriş yaptı ancak aktif bir karantinası bulunduğu için karantina rolü verildi.`)
                        .addFields(
                            { name: 'Sebep', value: jailData.reason, inline: true },
                            { name: 'Bitiş Tarihi', value: `<t:${Math.floor(endDate.getTime() / 1000)}:R>`, inline: true },
                            { name: 'Karantinaya Alan', value: `<@${jailData.moderatorId}>`, inline: true }
                        )
                        .setColor("#ff9900")
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp()
                        .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });

                    await securityLogChannel.send({ embeds: [jailLogEmbed] }).catch(() => {});
                }
            }
        }

        const logChannelId = config.channels.action_logs;
        const logChannel = member.guild.channels.cache.get(logChannelId);

        const banData = await db.get(`temp_ban_${member.guild.id}_${member.id}`);
        if (banData) {
            const remainingTime = banData.unbanDate - Date.now();
            if (remainingTime > 0) {
                const DMEmbed = baseEmbed()
                    .setTitle(`${config.emojis.lock} | Yasaklandınız`)
                    .setDescription(`** ${member.guild.name}** sunucusundan yasaklı olduğunuz için otomatik olarak atıldınız.`)
                    .addFields(
                        { name: 'Yasaklayan', value: `<@${banData.moderator}>`, inline: true },
                        { name: 'Yasaklanan', value: member.user.tag, inline: true },
                        { name: 'Sebep', value: banData.reason, inline: true },
                        { name: 'Kalan Süre', value: `<t:${Math.floor(banData.unbanDate / 1000)}:R>`, inline: true }
                    )
                    .setColor("#eb4034")
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });

                await member.send({ embeds: [DMEmbed] }).catch(() => { });

                await member.kick({ reason: banData.reason }).catch(() => {
                    Logger.error(`Failed to kick member: ${member.user.tag}`);

                    const errorEmbed = baseEmbed()
                        .setTitle(`${config.emojis.lock} | Kullanıcı Atılamadı`)
                        .setDescription(`** ${member.user.tag}** sunucuya giriş yaptı ve yasaklı ancak yetkim olmadığı için atılamadı.`)
                        .addFields(
                            { name: 'Yasaklayan', value: `<@${banData.moderator}>`, inline: true },
                            { name: 'Yasaklanan', value: member.user.tag, inline: true },
                            { name: 'Sebep', value: banData.reason, inline: true },
                            { name: 'Bitiş Tarihi', value: `<t:${Math.floor(banData.unbanDate / 1000)}:F>`, inline: true }
                        )
                        .setColor("#eb4034")
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp()
                        .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });

                    logChannel.send({ embeds: [errorEmbed] });
                    return;
                });

                if (logChannel) {
                    const logEmbed = baseEmbed()
                        .setTitle(`${config.emojis.lock} | Kullanıcı Atıldı (Geçici Yasaklama)`)
                        .setDescription(`** ${member.user.tag}** sunucuya giriş yaptı ancak geçici yasaklı olduğu için atıldı.`)
                        .addFields(
                            { name: 'Yasaklayan', value: `<@${banData.moderator}>`, inline: true },
                            { name: 'Yasaklanan', value: member.user.tag, inline: true },
                            { name: 'Sebep', value: banData.reason, inline: true },
                            { name: 'Bitiş Tarihi', value: `<t:${Math.floor(banData.unbanDate / 1000)}:F>`, inline: true }
                        )
                        .setColor("#eb4034")
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp()
                        .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });

                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        }
    },
};