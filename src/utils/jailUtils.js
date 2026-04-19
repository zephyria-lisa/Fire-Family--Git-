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
        role.id !== jsonConfig.roles.booster_role &&
        role.position < guild.members.me.roles.highest.position
    );

    const roleIds = memberRemovableRoles.map(role => role.id);

    try {
        await member.roles.add(jailRole);
        await member.roles.remove(memberRemovableRoles);

        const isLocked = jsonConfig.jail_lock ? moderator.roles.cache.some(role => jsonConfig.jail_lock.includes(role.id)) : false;

        const jailData = {
            userId: member.id,
            guildId: guild.id,
            moderatorId: moderator.id,
            reason: reason,
            duration: duration,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + duration * 60 * 1000).toISOString(),
            roles: roleIds,
            isLocked: isLocked
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
            roleId !== jsonConfig.roles.booster_role &&
            !(jsonConfig.jail_role_exceptions || []).includes(roleId) &&
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

async function syncMemberJail(member) {
    const jailData = await db.get(`jail_${member.id}`);
    if (!jailData) return;

    const now = new Date();
    const endDate = new Date(jailData.endDate);

    if (endDate > now) {
        const jailRole = member.guild.roles.cache.get(jsonConfig.roles.jail_role);
        if (jailRole) {
            if (!member.roles.cache.has(jailRole.id)) {
                await member.roles.add(jailRole).catch(() => {});
            }

            const rolesToRemove = member.roles.cache.filter(role =>
                role.id !== member.guild.id &&
                role.id !== jailRole.id &&
                role.id !== jsonConfig.roles.booster_role &&
                role.position < member.guild.members.me.roles.highest.position
            );

            if (rolesToRemove.size > 0) {
                await member.roles.remove(rolesToRemove).catch(() => {});
            }
        }
    }
}

async function handleJailRoleProtection(member, rolesAdded) {
    if (!rolesAdded || rolesAdded.length === 0) return;

    const jailData = await db.get(`jail_${member.id}`);
    if (!jailData) return;

    const now = new Date();
    const endDate = new Date(jailData.endDate);
    if (endDate <= now) return;

    const jailRole = member.guild.roles.cache.get(jsonConfig.roles.jail_role);
    const boosterRole = jsonConfig.roles.booster_role;

    // Fix: If the member doesn't have the jail role anymore, they shouldn't be under protection (prevents unjail interference)
    if (!member.roles.cache.has(jailRole?.id)) return;

    // Filter roles: Exclude jail, booster, exceptions, and invalid roles
    const protectedRoles = rolesAdded.filter(roleId => {
        const role = member.guild.roles.cache.get(roleId);
        return role && 
               role.id !== jailRole?.id && 
               role.id !== boosterRole && 
               !(jsonConfig.jail_role_protection_exceptions || []).includes(roleId);
    });

    if (protectedRoles.length === 0) return;

    const logChannel = member.guild.channels.cache.get(jsonConfig.channels.role_protection_logs);
    const botHighestRole = member.guild.members.me.roles.highest;

    const higherThanBot = [];
    const removableRoles = [];

    protectedRoles.forEach(roleId => {
        const role = member.guild.roles.cache.get(roleId);
        if (role.position >= botHighestRole.position) {
            higherThanBot.push(role);
        } else {
            removableRoles.push(role);
        }
    });

    // 1) If the role given is higher than the bot itself, send warning embed
    if (higherThanBot.length > 0 && logChannel) {
        const warningEmbed = baseEmbed()
            .setTitle(`${jsonConfig.emojis.warning} | Yüksek Yetkili Rol İşlemi`)
            .setDescription(`**${member.user.tag}** aktif bir karantinası olmasına rağmen botun yetkisinden yüksek roller verildi. Bu roller otomatik olarak alınamadı.`)
            .addFields(
                { name: 'Verilen Yüksek Roller', value: higherThanBot.map(r => `<@&${r.id}>`).join(', ') },
                { name: 'Hedef', value: `${member.user.tag} (${member.id})`, inline: true }
            )
            .setColor("#ff0000")
            .setTimestamp();

        await logChannel.send({ embeds: [warningEmbed] }).catch(() => {});
    }

    // 2) Attempt to remove the roles
    if (removableRoles.length > 0) {
        try {
            await member.roles.remove(removableRoles, 'Karantina Koruma: Aktif karantinası olan üyeye rol verildi.');

            if (logChannel) {
                const infoEmbed = baseEmbed()
                    .setTitle(`${jsonConfig.emojis.info} | Karantina Rol Koruması`)
                    .setDescription(`**${member.user.tag}** aktif bir karantinası olduğu için verilen roller geri alındı.`)
                    .addFields(
                        { name: 'Alınan Roller', value: removableRoles.map(r => `<@&${r.id}>`).join(', ') },
                        { name: 'Hedef', value: `${member.user.tag} (${member.id})`, inline: true }
                    )
                    .setColor("#34eb6b")
                    .setTimestamp();

                await logChannel.send({ embeds: [infoEmbed] }).catch(() => {});
            }
        } catch (error) {
            Logger.error(`Failed to remove roles from jailed user ${member.id}:`, error);
            if (logChannel) {
                const failEmbed = baseEmbed()
                    .setTitle(`${jsonConfig.emojis.warning} | Rol Alma Başarısız`)
                    .setDescription(`**${member.user.tag}** aktif karantinası olan üyeden roller alınmaya çalışıldı ancak bir hata oluştu.`)
                    .addFields(
                        { name: 'Alınmak İstenen Roller', value: removableRoles.map(r => `<@&${r.id}>`).join(', ') },
                        { name: 'Hata', value: error.message }
                    )
                    .setColor("#ff0000")
                    .setTimestamp();

                await logChannel.send({ embeds: [failEmbed] }).catch(() => {});
            }
        }
    }
}

async function syncJails(guild) {
    const allData = await db.all();
    const jails = allData.filter(d => d.id.startsWith('jail_'));
    const now = new Date();

    for (const jail of jails) {
        const jailData = jail.value;
        if (jailData.guildId !== guild.id) continue;

        const member = await guild.members.fetch(jailData.userId).catch(() => null);
        if (!member) continue;

        await syncMemberJail(member);
    }
}

module.exports = {
    jailMember,
    unjailMember,
    initJailCheck,
    syncJails,
    syncMemberJail,
    handleJailRoleProtection
};
