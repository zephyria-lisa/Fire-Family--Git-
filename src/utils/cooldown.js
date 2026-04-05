const time = require('./time');
const db = require('../database/db');
const jsonConfig = require('./config.json');
const Logger = require('./logger');
const logger = require('./logger');

async function getQuotaStatus(member) {
    const roleCooldowns = jsonConfig.role_cooldowns || {};
    const memberRoles = member.roles.cache;

    let quota = { ban: 0, kick: 0 };

    for (const [roleId, config] of Object.entries(roleCooldowns)) {
        if (memberRoles.has(roleId)) {
            if (config.ban !== undefined && config.ban > quota.ban) quota.ban = config.ban;
            if (config.kick !== undefined && config.kick > quota.kick) quota.kick = config.kick;
        }
    }

    const today = time.getTodayDate();
    const dbKey = `quota_usage_${today}_${member.guild.id}_${member.id}`;
    const used = await db.get(dbKey) || { ban: 0, kick: 0 };
    const remaining = {
        ban: Math.max(0, quota.ban - used.ban),
        kick: Math.max(0, quota.kick - used.kick)
    };

    logger.info(`Moderation Quota: ${member.user.tag} has ${remaining.ban} ban and ${remaining.kick} kick quota in key ${dbKey}`);


    return { quota, used, remaining };
}

async function addToUserScore(member, type) {
    const dbKey = `usage_score_${member.guild.id}_${member.id}`;

    const currentUsage = await db.get(dbKey) || { ban: 0, kick: 0 };

    currentUsage[type] = (currentUsage[type] || 0) + 1;

    await db.set(dbKey, currentUsage);
}

async function consumeQuota(member, type) {
    const today = time.getTodayDate();
    const dbKey = `quota_usage_${today}_${member.guild.id}_${member.id}`;

    const currentUsage = await db.get(dbKey) || { ban: 0, kick: 0 };

    currentUsage[type] = (currentUsage[type] || 0) + 1;

    await db.set(dbKey, currentUsage);

    Logger.info(`Moderation Quota: ${member.user.tag} consumed 1 ${type} (Today's Total: ${currentUsage[type]})`);
}

async function getUserScore(member) {
    const dbKey = `usage_score_${member.guild.id}_${member.id}`;
    const score = await db.get(dbKey) || { ban: 0, kick: 0 };
    return score;
}

module.exports = { getQuotaStatus, consumeQuota, getUserScore, addToUserScore };