const { ActivityType } = require('discord.js');
const Logger = require('../../utils/logger');
const config = require('../../config');
const db = require('../../database/db');
const { checkMember } = require('../../utils/memberChecker');
const { baseEmbed } = require('../../utils/embeds');
const { initJailCheck, syncJails } = require('../../utils/jailUtils');
const { syncGuild, syncChannelPermissions } = require('../../utils/roleProtection');
const { emojis, limits } = require('../../utils/config.json');
const { msToTime, getTodayDate, getYesterdayDate, getTodayStartTimestamp, isNightTime } = require('../../utils/time');
const { getModeratorRoleOwnerAmounts } = require('../../utils/roleUtils');

async function updateStatsMessage(client) {
    try {
        const statsMessageId = await db.get(`stats_message`);
        if (!statsMessageId) return;

        const channel = client.channels.cache.get(statsMessageId.channelId);
        if (!channel) return;

        const statsMessage = await channel.messages.fetch(statsMessageId.messageId).catch(() => null);
        if (!statsMessage) return;

        const uptime = msToTime(client.uptime);
        const ping = client.ws.ping;
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const moderatorRoleOwnerAmounts = await getModeratorRoleOwnerAmounts(client.guilds.cache.first());
        const onlineMemberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.filter(member => member.presence && member.presence?.status !== 'offline').size, 0);
        const membersInVoice = client.guilds.cache.reduce((acc, guild) => acc + guild.voiceStates.cache.filter(state => state.channelId !== null).size, 0);

        const todaysDate = getTodayDate();
        const messagesToday = await db.get(`messages_${todaysDate}`) || 0;

        const todayStart = getTodayStartTimestamp();
        const firstGuild = client.guilds.cache.first();
        const joinsToday = firstGuild ? firstGuild.members.cache.filter(m => m.joinedTimestamp >= todayStart).size : 0;

        const pingDotEmoji = ping < 180 ? emojis.green_dot : ping < 250 ? emojis.yellow_dot : emojis.red_dot;
        const uptimeDotEmoji = client.uptime > 10 * 60 * 1000 ? emojis.green_dot : client.uptime > 2 * 60 * 1000 ? emojis.yellow_dot : emojis.red_dot;
        const totalMembersDotEmoji = totalMembers > 200 ? emojis.green_dot : totalMembers > 100 ? emojis.yellow_dot : emojis.red_dot;
        const downModeratorDotEmoji = moderatorRoleOwnerAmounts.down_moderator_role < limits.down_moderator_limit ? emojis.green_dot : moderatorRoleOwnerAmounts.down_moderator_role < limits.down_moderator_limit * 2 ? emojis.yellow_dot : emojis.red_dot;
        const middleModeratorDotEmoji = moderatorRoleOwnerAmounts.middle_moderator_role < limits.middle_moderator_limit ? emojis.green_dot : moderatorRoleOwnerAmounts.middle_moderator_role < limits.middle_moderator_limit * 2 ? emojis.yellow_dot : emojis.red_dot;
        const highModeratorDotEmoji = moderatorRoleOwnerAmounts.high_moderator_role < limits.high_moderator_limit ? emojis.green_dot : moderatorRoleOwnerAmounts.high_moderator_role < limits.high_moderator_limit * 2 ? emojis.yellow_dot : emojis.red_dot;
        const messagesTodayDotEmoji = messagesToday > 500 ? emojis.green_dot : messagesToday > 250 ? emojis.yellow_dot : emojis.red_dot;
        const onlineMemberCountDotEmoji = onlineMemberCount > totalMembers / 2 ? emojis.green_dot : onlineMemberCount > totalMembers / 4 ? emojis.yellow_dot : emojis.red_dot;
        const joinsTodayDotEmoji = joinsToday > 5 ? emojis.green_dot : joinsToday > 0 ? emojis.yellow_dot : emojis.red_dot;
        const membersInVoiceDotEmoji = membersInVoice > totalMembers / 2 ? emojis.green_dot : membersInVoice > totalMembers / 4 ? emojis.yellow_dot : emojis.red_dot;
        const nightTimeDotEmoji = isNightTime() ? emojis.gray_dot : emojis.green_dot;

        const statsEmbed = baseEmbed()
            .setTitle(`${emojis.info} | İstatistikler`)
            .setDescription(`Aşağıdaki istatistikler her 10 saniyede bir güncellenmektedir.`)
            .setColor("#a142f5")
            .setThumbnail(client.guilds.cache.first().iconURL())
            .setFooter({
                text: client.guilds.cache.first().name,
                iconURL: client.guilds.cache.first().iconURL()
            })
            .addFields(
                { name: `${emojis.ping} | Gecikme`, value: `${pingDotEmoji} \`${ping}ms\``, inline: true },
                { name: `${emojis.uptime} | Uptime`, value: `${uptimeDotEmoji} \`${uptime}\``, inline: true },
                { name: `${emojis.member} | Toplam Üye`, value: `${totalMembersDotEmoji} \`${totalMembers}\``, inline: true },
                { name: `${emojis.down_moderator} | Alt Yetkili Sayısı`, value: `${downModeratorDotEmoji} ${moderatorRoleOwnerAmounts.down_moderator_role}/${limits.down_moderator_limit}`, inline: true },
                { name: `${emojis.middle_moderator} | Orta Yetkili Sayısı`, value: `${middleModeratorDotEmoji} ${moderatorRoleOwnerAmounts.middle_moderator_role}/${limits.middle_moderator_limit}`, inline: true },
                { name: `${emojis.high_moderator} | Üst Yetkili Sayısı`, value: `${highModeratorDotEmoji} ${moderatorRoleOwnerAmounts.high_moderator_role}/${limits.high_moderator_limit}`, inline: true },
                { name: `${emojis.message} | Bugün Gönderilen Mesaj Sayısı`, value: `${messagesTodayDotEmoji} \`${messagesToday}\``, inline: true },
                { name: `${emojis.online} | Aktif Üye Sayısı`, value: `${onlineMemberCountDotEmoji} \`${onlineMemberCount}\``, inline: true },
                { name: `${emojis.member_join} | Bugün Katılan Üye Sayısı`, value: `${joinsTodayDotEmoji} \`${joinsToday}\``, inline: true },
                { name: `${emojis.voice} | Sesteki Üye Sayısı`, value: `${membersInVoiceDotEmoji} \`${membersInVoice}\``, inline: true },
                { name: `${emojis.timer} | Zaman`, value: `${nightTimeDotEmoji} \`${isNightTime() ? 'Gece' : 'Gündüz'}\``, inline: true },
            )
            .setTimestamp();

        await statsMessage.edit({
            embeds: [statsEmbed]
        });

        // Logger.success(`İstatistik mesajı güncellendi.`); // Commented out to avoid log spam
    } catch (err) {
        if (err.code !== 10008) { // Ignore Unknown Message to avoid log spam
            Logger.error(`İstatistik güncelleme hatası: ${err.message}`);
        }
    }
}

async function updateLeaderboardMessage(client) {
    try {
        // ─── Cleanup Yesterday's Data & DM Top Users ──────────
        const yesterday = getYesterdayDate();
        const yesterdayStats = await db.get(`daily_message_stats.${yesterday}`);

        if (yesterdayStats && Object.keys(yesterdayStats).length > 0) {
            const sortedYesterday = Object.entries(yesterdayStats)
                .sort(([, a], [, b]) => b - a);

            // Capture top 1 of yesterday before deletion
            const topUserEntry = sortedYesterday[0];
            if (topUserEntry) {
                await db.set('last_day_winner', {
                    userId: topUserEntry[0],
                    count: topUserEntry[1],
                    date: yesterday
                });
            }

            for (let i = 0; i < 3; i++) {
                const entry = sortedYesterday[i];
                if (!entry) break;

                const [userId, count] = entry;
                const rank = i + 1;
                const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);

                if (user) {
                    const congratulateEmbed = baseEmbed()
                        .setTitle(`${emojis.crown} | Günlük Sıralama Tebriği!`)
                        .setDescription(`Tebrikler ${user}! **${yesterday}** tarihindeki günlük mesaj sıralamasında **${rank}.** oldun!`)
                        .setColor("#a142f5")
                        .addFields(
                            { name: `${emojis.message} | Mesaj Sayın`, value: `• \`${count}\``, inline: true },
                            { name: `${emojis.info} | Sıralaman`, value: `• \`${rank}. \``, inline: true }
                        )
                        .setTimestamp();

                    await user.send({ embeds: [congratulateEmbed] }).catch(err => {
                        Logger.warn(`UserId: ${userId} olan kullanıcıya DM gönderilemedi: ${err.message}`);
                    });
                }
            }

            await db.delete(`daily_message_stats.${yesterday}`);
            Logger.info(`${yesterday} tarihli günlük mesaj verileri temizlendi ve ilk 10'a giren üyelere DM başarıyla gönderildi.`);
        }

        const leaderboardData = await db.get(`stat_mesaj`);
        if (!leaderboardData) return;

        const channel = client.channels.cache.get(leaderboardData.channelId);
        if (!channel) return;

        const lbMessage = await channel.messages.fetch(leaderboardData.messageId).catch(() => null);
        if (!lbMessage) return;

        const today = getTodayDate();
        const stats = await db.get(`daily_message_stats.${today}`) || {};

        // Convert to array and sort
        const sortedEntries = Object.entries(stats)
            .sort(([, a], [, b]) => b - a);

        let description = "";
        let topUserAvatar = null;

        for (let i = 0; i < 10; i++) {
            const entry = sortedEntries[i];
            const rank = i + 1;

            if (entry) {
                const [userId, count] = entry;
                const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);

                if (user) {
                    description += `**${rank} • ** ${user} (${emojis.message} ${count})\n`;
                    if (i === 0) topUserAvatar = user.displayAvatarURL();
                } else {
                    sortedEntries.splice(i, 1);
                    i--;
                    continue;
                }
            } else {
                description += `**${rank} •** Bulunamadı\n`;
            }
        }

        const todayDate = new Date().toLocaleDateString('tr-TR');
        const currentDateWithHour = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

        const lastWinnerData = await db.get('last_day_winner');
        let lastWinnerDisplay = "Henüz veri yok.";
        if (lastWinnerData) {
            const lastWinnerUser = client.users.cache.get(lastWinnerData.userId) || await client.users.fetch(lastWinnerData.userId).catch(() => null);
            lastWinnerDisplay = lastWinnerUser ? `${lastWinnerUser} (${emojis.message} ${lastWinnerData.count})` : "Bulunamadı";
        }

        const nextResetTimestamp = Math.floor((getTodayStartTimestamp() + (24 * 60 * 60 * 1000)) / 1000);

        const lbEmbed = baseEmbed()
            .setTitle(`${emojis.crown} | ${todayDate} - Günlük Mesaj Sıralaması`)
            .setDescription(description || "Henüz veri yok.")
            .setColor("#a142f5")
            .setFooter({
                text: client.user.username,
                iconURL: client.user.displayAvatarURL()
            })
            .addFields(
                { name: `${emojis.crown} | Dünün Birincisi`, value: "• " + lastWinnerDisplay, inline: false },
                { name: `${emojis.timer} | Sıfırlanma`, value: `• <t:${nextResetTimestamp}:R>`, inline: true },
                { name: `${emojis.timer} | Son Güncelleme`, value: "• " + currentDateWithHour, inline: true }
            )
            .setTimestamp();

        if (topUserAvatar) {
            lbEmbed.setThumbnail(topUserAvatar);
        }

        await lbMessage.edit({
            embeds: [lbEmbed]
        });

    } catch (err) {
        if (err.code !== 10008) {
            Logger.error(`Sıralama güncelleme hatası: ${err.message}`);
        }
    }
}

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        Logger.success(`${config.bot.name} is online as ${client.user.tag}`);
        Logger.info(`Serving ${client.guilds.cache.size} guild(s) | ${client.users.cache.size} cached user(s)`);

        // ─── Role Protection Initial Sync ─────────────────────
        for (const guild of client.guilds.cache.values()) {
            await syncGuild(guild);
            await syncJails(guild).catch(err => Logger.error(`Jail sync failed for ${guild.name}: ${err.message}`));
        }

        // ─── Dynamic Rich Presence ─────────────────────────────
        const { presence } = config;
        let activityIndex = 0;

        const updatePresence = async () => {
            const activity = presence.activities[activityIndex];
            let name = activity.name
                .replace('{guilds}', client.guilds.cache.size)
                .replace('{users}', client.users.cache.size);

            if (name.includes('{top_user}')) {
                const lastWinnerData = await db.get('last_day_winner');
                let lastWinnerName = "Bulunamadı";
                if (lastWinnerData) {
                    const user = client.users.cache.get(lastWinnerData.userId) || await client.users.fetch(lastWinnerData.userId).catch(() => null);
                    if (user) lastWinnerName = user.username;
                }
                name = name.replace('{top_user}', lastWinnerName);
            }

            client.user.setPresence({
                activities: [{ name, type: activity.type }],
                status: presence.status,
            });

            activityIndex = (activityIndex + 1) % presence.activities.length;
        };

        // Initial set and then interval
        updatePresence();
        setInterval(updatePresence, presence.interval || 15000);

        setInterval(async () => {
            await updateStatsMessage(client);
        }, 10000);

        setInterval(async () => {
            await updateLeaderboardMessage(client);
        }, 10000);

        // Removed manual cleanup as it's now handled in the update interval

        // ─── Offline Check ──────────────────────────────────────
        const lastOnline = await db.get('last_online_timestamp');
        const now = Date.now();

        /*if (lastOnline) {
            Logger.info(`Performing offline join check (Last online: ${new Date(lastOnline).toLocaleString()})`);

            let suspiciousCount = 0;
            let totalChecked = 0;

            for (const guild of client.guilds.cache.values()) {
                try {
                    // Fetch all members to ensure cache is full and we have everyone who joined
                    const members = await guild.members.fetch();
                    const joinedWhileOffline = members.filter(m => m.joinedTimestamp > lastOnline);

                    for (const member of joinedWhileOffline.values()) {
                        totalChecked++;
                        const isSuspicious = await checkMember(member, client, true);
                        if (isSuspicious) suspiciousCount++;
                    }

                } catch (error) {
                    Logger.error(`Error checking members in guild ${guild.name}:`, error);
                }
            }

            if (totalChecked > 0) {
                Logger.success(`Offline check complete: ${totalChecked} new members found, ${suspiciousCount} suspicious detections.`);
            } else {
                Logger.info('Offline check complete: No new members joined during downtime.');
            }
        } else {
            Logger.info('First run: Saving online timestamp for future offline checks.');
        }*/

        // Update timestamp immediately and then every minute
        await db.set('last_online_timestamp', now);

        setInterval(async () => {
            try {
                await db.set('last_online_timestamp', Date.now());
            } catch (error) {
                Logger.error('Heartbeat: Failed to update last_online_timestamp:', error);
            }
        }, 60000); // 1 minute heartbeat

        // ─── Channel Permission Cache (5-minute refresh) ──────
        setInterval(async () => {
            for (const guild of client.guilds.cache.values()) {
                await syncChannelPermissions(guild).catch(err =>
                    Logger.error(`Channel permission sync failed for ${guild.name}: ${err.message}`)
                );
            }
        }, 5 * 60 * 1000); // 5 minutes

        // ─── Jail System Initialization ────────────────────────
        initJailCheck(client);
    },
};

