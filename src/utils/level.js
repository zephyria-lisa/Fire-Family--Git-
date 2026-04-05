const config = require('./config.json');
const Logger = require('./logger');
const db = require('../database/db');
const { baseEmbed } = require('./embeds');

function calculateNeededXp(level) {
    return Math.floor((level == 0 ? 1 : level) * 100 * Math.pow(1.2, level));
}

async function setMemberLevelRoles(client, member, level) {
    const reservedRoles = config.level_roles.filter(r => r.level <= level).map(r => r.role_id);
    const memberRoles = member.roles.cache.map(r => r.id);

    const newRoles = reservedRoles.filter(roleId => {
        if (memberRoles.includes(roleId)) return false;
        const role = member.guild.roles.cache.get(roleId);
        return role && member.guild.members.me.roles.highest.position > role.position;
    });

    const rolesToRemove = config.level_roles
        .filter(r => r.level > level && member.roles.cache.has(r.role_id))
        .map(r => r.role_id)
        .filter(roleId => {
            const role = member.guild.roles.cache.get(roleId);
            return role && member.guild.members.me.roles.highest.position > role.position;
        });

    if (newRoles.length > 0) {
        await member.roles.add(newRoles).catch(err => {
            Logger.error(`Seviye rolü verilemedi: ${err}`);
        });
    }

    if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove).catch(err => {
            Logger.error(`Seviye rolü kaldırılamadı: ${err}`);
        });
    }
}

async function addXP(member, amount) {
    if (!member || member.user.bot) return;

    const currentXp = await db.get(`xp_${member.id}`) || 0;
    const newXp = currentXp + amount;
    await db.set(`xp_${member.id}`, newXp);

    const currentLevel = await db.get(`level_${member.id}`) || 0;
    const neededXp = calculateNeededXp(currentLevel);

    if (newXp >= neededXp) {
        const newLevel = currentLevel + 1;
        await db.set(`level_${member.id}`, newLevel);

        const levelUpChannel = member.guild.channels.cache.get(config.level_up_channel_id);
        if (levelUpChannel) {
            const embed = baseEmbed()
                .setTitle('Seviye Atladın!')
                .setDescription(`${member} seviye ${newLevel} oldu!`)
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setThumbnail(member.user.displayAvatarURL())
                .setColor("#a8325a");

            await levelUpChannel.send({ embeds: [embed] }).catch(err => Logger.error(`Seviye atlama mesajı gönderilemedi: ${err}`));
        }

        await setMemberLevelRoles(member.client, member, newLevel);

        // Recurse if they gained enough XP to jump multiple levels
        await addXP(member, 0);
    }
}

module.exports = { calculateNeededXp, setMemberLevelRoles, addXP };
