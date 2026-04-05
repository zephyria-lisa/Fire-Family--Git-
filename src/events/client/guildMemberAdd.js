const Logger = require('../../utils/logger');
const { checkMember } = require('../../utils/memberChecker');
const db = require('../../database/db');
const { baseEmbed } = require('../../utils/embeds');
const config = require('../../utils/config');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        Logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);

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