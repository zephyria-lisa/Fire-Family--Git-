const db = require('../database/db');
const Logger = require('./logger');
const config = require('../config');
const jsonConfig = require('./config.json');
const { logSecurityEvent } = require('./security-logs');
const { baseEmbed } = require('./embeds');

async function jailMember(guild, member, moderator, duration, reason) {
    const jailRole = guild.roles.cache.get(jsonConfig.roles.jail_role);
    if (!jailRole) throw Logger.error('Karantina rolü bulunamadı.');

    const memberJailData = await db.get(`jail_${member.id}`);
    if (memberJailData) throw Logger.error('Kullanıcı zaten karantinada.');

    const memberRemovableRoles = member.roles.cache.filter(role =>
        role.id !== guild.id &&
        role.id !== jailRole.id &&
        role.position < guild.members.me.roles.highest.position
    );

    const roleIds = memberRemovableRoles.map(role => role.id);

    try {
        await member.roles.add(jailRole);
        await member.roles.remove(memberRemovableRoles);

        const jailData = {
            userId: member.id,
            guildId: guild.id,
            moderatorId: moderator.id,
            reason: reason,
            duration: duration,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + duration * 60 * 1000).toISOString(),
            roles: roleIds
        };

        await db.set(`jail_${member.id}`, jailData);

        await logSecurityEvent(guild.client, guild.id, 'jail', {
            target: member.id,
            reason: reason,
            moderator: moderator.id,
            duration: duration
        });

        const memberDMEmbed = baseEmbed()
            .setColor("#ff0000")
            .setTitle('Karantina - Eklendi')
            .setDescription(`${moderator} tarafından ${duration} dakika karantinaya alındın.`)
            .setThumbnail(member.displayAvatarURL())
            .addFields(
                { name: 'Süre', value: `${duration} dakika`, inline: true },
                { name: 'Sebep', value: reason, inline: true },
                { name: 'Bitiş Tarihi', value: `<t:${Math.floor(new Date(jailData.endDate).getTime() / 1000)}:R>`, inline: true },
                { name: 'Moderator', value: moderator.toString(), inline: true }
            )
            .setFooter({ text: guild.name, iconURL: guild.iconURL() })

        await member.send({ embeds: [memberDMEmbed] }).catch(() => { });

        return jailData;
    } catch (error) {
        Logger.error(`Jail error for ${member.id}:`, error);
        throw error;
    }
}

async function unjailMember(guild, userId, moderator = null) {
    const jailData = await db.get(`jail_${userId}`);
    if (!jailData) throw new Error('Kullanıcı karantinada değil.');

    const member = await guild.members.fetch(userId).catch(() => null);
    const jailRole = guild.roles.cache.get(jsonConfig.roles.jail_role);

    if (member) {
        if (jailRole) await member.roles.remove(jailRole).catch(e => Logger.error(`Failed to remove jail role: ${e.message}`));

        const rolesToRestore = jailData.roles.filter(roleId =>
            guild.roles.cache.has(roleId) &&
            guild.roles.cache.get(roleId).position < guild.members.me.roles.highest.position
        );

        if (rolesToRestore.length > 0) {
            await member.roles.add(rolesToRestore).catch(e => Logger.error(`Failed to restore roles: ${e.message}`));
        }

        const memberDMEmbed = baseEmbed()
            .setColor("#34eb6b")
            .setTitle('Karantina - Çıkarıldı')
            .setDescription(`Karantinadan çıkarıldın.`)
            .addFields(
                { name: 'Karantina Nedeni', value: jailData.reason, inline: true },
                { name: 'Moderator', value: (moderator || guild.client.user).toString(), inline: true }
            );

        await member.send({ embeds: [memberDMEmbed] }).catch(() => { });
    } else {
        Logger.info(`Unjail: Member ${userId} not found in guild ${guild.id}. Cleaning up database only.`);
    }

    await db.delete(`jail_${userId}`);

    await logSecurityEvent(guild.client, guild.id, 'unjail', {
        target: userId,
        reason: member ? 'Karantina süresi doldu veya kaldırıldı.' : 'Kullanıcı sunucudan ayrıldığı için karantina temizlendi.',
        moderator: moderator ? moderator.id : guild.client.user.id
    });

    return jailData;
}

async function checkExpirations(client) {
    const allData = await db.all();
    const jails = allData.filter(d => d.id.startsWith('jail_'));
    const now = new Date();

    for (const jail of jails) {
        const jailData = jail.value;
        const endDate = new Date(jailData.endDate);

        if (endDate <= now) {
            const guild = client.guilds.cache.get(jailData.guildId);
            if (!guild) continue;

            Logger.info(`Auto-unjailing user ${jailData.userId} in guild ${guild.name}`);
            try {
                await unjailMember(guild, jailData.userId);
            } catch (error) {
                Logger.error(`Auto-unjail failed for ${jailData.userId}:`, error);
            }
        }
    }
}

function initJailCheck(client) {
    checkExpirations(client);

    setInterval(() => checkExpirations(client), 60000);
}

module.exports = {
    jailMember,
    unjailMember,
    initJailCheck
};
