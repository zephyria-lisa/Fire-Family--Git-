const { ActivityType } = require('discord.js');
const Logger = require('../../utils/logger');
const config = require('../../config');
const db = require('../../database/db');
const { checkMember } = require('../../utils/memberChecker');
const { baseEmbed } = require('../../utils/embeds');
const { initJailCheck } = require('../../utils/jailUtils');
const { syncGuild } = require('../../utils/roleProtection');
const { emojis, limits } = require('../../utils/config.json');
const { msToTime, getTodayDate, getTodayStartTimestamp, isNightTime } = require('../../utils/time');
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

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        Logger.success(`${config.bot.name} is online as ${client.user.tag}`);
        Logger.info(`Serving ${client.guilds.cache.size} guild(s) | ${client.users.cache.size} cached user(s)`);

        // ─── Role Protection Initial Sync ─────────────────────
        for (const guild of client.guilds.cache.values()) {
            await syncGuild(guild);
        }

        // ─── Dynamic Rich Presence ─────────────────────────────
        const { presence } = config;
        let activityIndex = 0;

        const updatePresence = () => {
            const activity = presence.activities[activityIndex];
            const name = activity.name
                .replace('{guilds}', client.guilds.cache.size)
                .replace('{users}', client.users.cache.size);

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

        // ─── Jail Expiration Check ─────────────────────────────
        //initJailCheck(client);
    },
};

