const db = require('../database/db');
const Logger = require('./logger');
const config = require('./config.json');
const { baseEmbed } = require('./embeds');
const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');

/**
 * Synchronizes the entire guild's roles and their members to the database.
 * @param {import('discord.js').Guild} guild 
 */
async function syncGuild(guild) {
    Logger.info(`Starting Role Protection sync for guild: ${guild.name}`);

    // Hard Reset: Wipe old backup data to prevent stale member/role mixing
    await db.delete(`role_backups_${guild.id}`);
    Logger.info(`Wiped old role backups for ${guild.name} to ensure a clean sync.`);

    try {
        const allMembers = await guild.members.fetch();
        Logger.info(`Fetched ${allMembers.size} members for sync.`);

        const roleMemberMap = new Map();

        allMembers.forEach(member => {
            // Using member._roles (raw array of role ID strings) is faster and more reliable
            const rolesForMember = member._roles || [];
            rolesForMember.forEach(roleId => {
                if (!roleMemberMap.has(roleId)) {
                    roleMemberMap.set(roleId, []);
                }
                roleMemberMap.get(roleId).push(member.id);
            });
        });

        // Debug: Log the populated map
        roleMemberMap.forEach((memberIds, roleId) => {
            if (memberIds.length > 0) {
                Logger.info(`Mapped Role ${roleId} to ${memberIds.length} members.`);
            }
        });

        const roles = guild.roles.cache;
        const backupData = {};

        for (const role of roles.values()) {
            if (role.managed || role.name === '@everyone') continue;

            // Ensure we get a fresh copy of the array
            const memberIds = roleMemberMap.has(role.id) ? [...roleMemberMap.get(role.id)] : [];

            backupData[role.id] = {
                id: role.id,
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions.bitfield.toString(),
                position: role.position,
                mentionable: role.mentionable,
                members: memberIds
            };
        }

        // Save to database
        await db.set(`role_backups_${guild.id}`, backupData);

        // Debug: Verify what was actually saved
        const savedData = await db.get(`role_backups_${guild.id}`);
        const roleStats = Object.values(savedData).map(r => `${r.name}: ${r.members.length} members (Perms: ${r.permissions})`);
        Logger.info(`Sync Details:\n${roleStats.join('\n')}`);

        const totalMembersSaved = Object.values(savedData).reduce((acc, curr) => acc + curr.members.length, 0);

        Logger.success(`Role Protection sync complete for ${guild.name}. Cached ${Object.keys(backupData).length} roles with a total of ${totalMembersSaved} member-role associations.`);
    } catch (error) {
        Logger.error(`Failed to sync guild ${guild.name}:`, error);
    }
}

/**
 * Updates only the metadata (Properties) for a specific role in the backup.
 * This function avoids member fetching to prevent Gateway Opcode 8 rate limits.
 * @param {import('discord.js').Role} role 
 */
async function updateRoleMetadata(role) {
    if (role.managed || role.name === '@everyone') return;

    const currentBackup = await db.get(`role_backups_${role.guild.id}`) || {};

    const existingMembers = currentBackup[role.id] ? currentBackup[role.id].members : [];

    currentBackup[role.id] = {
        id: role.id,
        name: role.name,
        colors: role.colors,
        hoist: role.hoist,
        permissions: role.permissions.bitfield.toString(),
        position: role.position,
        mentionable: role.mentionable,
        members: existingMembers
    };

    await db.set(`role_backups_${role.guild.id}`, currentBackup);
}

/**
 * Updates the role membership for a single member in the backup.
 * @param {import('discord.js').GuildMember} member 
 */
async function updateMemberRoles(member) {
    const guildId = member.guild.id;
    const currentBackup = await db.get(`role_backups_${guildId}`) || {};
    const memberId = member.id;

    // We need to iterate through all cached roles and see if this member is in them
    // This ensures we add them to new roles and remove them from old ones
    for (const roleId in currentBackup) {
        // IMPORTANT: If the role no longer exists in the guild cache, it's being deleted.
        // We MUST NOT update its member list, or we'll wipe the backup before restoration.
        if (!member.guild.roles.cache.has(roleId)) continue;

        const hasRole = member.roles.cache.has(roleId);
        const membersList = currentBackup[roleId].members || [];

        const index = membersList.indexOf(memberId);

        if (hasRole && index === -1) {
            // Adding a member is always safe and immediate
            membersList.push(memberId);
            currentBackup[roleId].members = membersList;
            await db.set(`role_backups_${guildId}`, currentBackup);
            Logger.info(`Added ${member.user.tag} to backup for role ID ${roleId}. Total: ${membersList.length}`);
        } else if (!hasRole && index !== -1) {
            // Removing a member requires a stabilization buffer to prevent deletion race conditions
            Logger.info(`Detected role loss for ${member.user.tag} (Role: ${roleId}). Waiting for stabilization...`);

            setTimeout(async () => {
                try {
                    // Check if the role still exists after 2 seconds
                    const roleExists = member.guild.roles.cache.has(roleId);

                    if (roleExists) {
                        // Role still exists, this was a legitimate manual role removal
                        const freshBackup = await db.get(`role_backups_${guildId}`) || {};
                        if (freshBackup[roleId]) {
                            const updatedList = freshBackup[roleId].members || [];
                            const freshIndex = updatedList.indexOf(memberId);
                            if (freshIndex !== -1) {
                                updatedList.splice(freshIndex, 1);
                                freshBackup[roleId].members = updatedList;
                                await db.set(`role_backups_${guildId}`, freshBackup);
                                Logger.info(`Confirmed manual role removal for ${member.user.tag} from role ID ${roleId}.`);
                            }
                        }
                    } else {
                        // Role is gone! This was a role deletion, so we skip the removal to keep the backup safe.
                        Logger.info(`Ignored role loss for ${member.user.tag} - Role ${roleId} was deleted. Preserving backup.`);
                    }
                } catch (err) {
                    Logger.error(`Error during role removal stabilization:`, err);
                }
            }, 2000);
        }
    }
}

/**
 * Restores a deleted role using backup data.
 * @param {import('discord.js').Guild} guild 
 * @param {string} roleId 
 */
async function restoreRole(guild, roleId) {
    const currentBackup = await db.get(`role_backups_${guild.id}`);
    if (!currentBackup || !currentBackup[roleId]) {
        Logger.warn(`No backup found for deleted role ID: ${roleId}`);
        return;
    }

    const data = currentBackup[roleId];
    Logger.info(`Restoring role: ${data.name}...`);

    try {
        // 1. Re-create the role
        const newRole = await guild.roles.create({
            name: data.name,
            color: data.color,
            hoist: data.hoist,
            permissions: BigInt(data.permissions),
            mentionable: data.mentionable,
            reason: 'Role Protection: Automatic Restoration'
        });

        // 2. Set position (spot)
        try {
            await newRole.setPosition(data.position);
        } catch (e) {
            Logger.warn(`Could not set position for restored role ${data.name}. Bot role might be too low.`);
        }

        // 3. Update the backup ID (The old ID is dead, we need to track the new one for future deletions)
        delete currentBackup[roleId];
        currentBackup[newRole.id] = { ...data, id: newRole.id };
        await db.set(`role_backups_${guild.id}`, currentBackup);

        // 4. Re-add members (Batched to avoid rate limits)
        const memberIds = data.members || [];
        Logger.info(`Found backup for role ${data.name} with ${memberIds.length} members. Starting restoration...`);

        if (memberIds.length === 0) {
            Logger.warn(`Warning: Backup for role ${data.name} has 0 members stored.`);
        }

        let successCount = 0;
        let failCount = 0;

        // Process in batches of 5 every 1 second to be safe
        for (let i = 0; i < memberIds.length; i += 5) {
            const batch = memberIds.slice(i, i + 5);
            await Promise.all(batch.map(async (id) => {
                try {
                    const member = await guild.members.fetch(id).catch(() => null);
                    if (member) {
                        await member.roles.add(newRole, 'Rol Koruması: Otomatik Geri Yükleme');
                        successCount++;
                    }
                } catch (err) {
                    failCount++;
                }
            }));

            if (i + 5 < memberIds.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        Logger.success(`Restoration complete for ${data.name}. Recovered: ${successCount}, Failed: ${failCount}`);

        const infoEmbed = baseEmbed()
            .setAuthor({
                name: `${guild.name} - Rol Koruması`,
                iconURL: guild.iconURL()
            })
            .setDescription(`${config.emojis.gg} | \`${data.name}\` rolü tekrardan oluşturuldu.`)
            .setColor('Green')
            .setTimestamp()
            .addFields(
                {
                    name: 'Oluşturulan Rol',
                    value: `${newRole}`,
                    inline: true
                },
                {
                    name: 'Kurtarılan Üye Sayısı',
                    value: `${successCount}`,
                    inline: true
                },
                {
                    name: 'Başarısız Üye Sayısı',
                    value: `${failCount}`,
                    inline: true
                }
            )
            .setFooter({
                text: "Fire Family - Rol Koruması"
            });

        const logChannel = guild.channels.cache.find(c => c.id === config.channels.role_protection_logs);
        if (logChannel) {
            await logChannel.send({ embeds: [infoEmbed] });
        }

        return newRole;
    } catch (error) {
        Logger.error(`Critical failure during role restoration for ${data.name}:`, error);
    }
}

const RATE_LIMIT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

/**
 * Gets the highest grant and remove limits for a member based on their roles.
 * Cross-references the member's roles with config.role_perm_cooldowns.
 * @param {import('discord.js').GuildMember} member
 * @returns {{ grant: number, remove: number } | null} The highest limits, or null if the member has no matching roles.
 */
function getRateLimits(member) {
    const cooldowns = config.role_perm_cooldowns;
    if (!cooldowns) return null;

    let maxGrant = 0;
    let maxRemove = 0;
    let found = false;

    for (const [roleId, limits] of Object.entries(cooldowns)) {
        if (member.roles.cache.has(roleId)) {
            found = true;
            if (limits.grant > maxGrant) maxGrant = limits.grant;
            if (limits.remove > maxRemove) maxRemove = limits.remove;
        }
    }

    return found ? { grant: maxGrant, remove: maxRemove } : null;
}

/**
 * Gets the current rate-limit usage for an executor within the 2-hour window.
 * If the window has expired, returns fresh zeroed usage.
 * @param {string} executorId
 * @param {string} guildId
 * @returns {Promise<{ grant: number, remove: number, windowStart: number }>}
 */
async function getUsage(executorId, guildId) {
    const key = `role_rate_${guildId}_${executorId}`;
    const data = await db.get(key);
    const now = Date.now();

    if (data && (now - data.windowStart) < RATE_LIMIT_WINDOW_MS) {
        return data;
    }

    // Window expired or no data — return fresh usage
    return { grant: 0, remove: 0, windowStart: now };
}

/**
 * Increments the rate-limit usage counter for the given type.
 * Starts a new window if the current one has expired.
 * @param {string} executorId
 * @param {string} guildId
 * @param {'grant' | 'remove'} type
 * @param {number} count
 */
async function incrementUsage(executorId, guildId, type, count) {
    const key = `role_rate_${guildId}_${executorId}`;
    const usage = await getUsage(executorId, guildId);

    usage[type] += count;
    await db.set(key, usage);
}

/**
 * Returns a human-readable remaining time string for the current rate-limit window.
 * @param {number} windowStart
 * @returns {string}
 */
function getRemainingTime(windowStart) {
    const elapsed = Date.now() - windowStart;
    const remaining = RATE_LIMIT_WINDOW_MS - elapsed;

    if (remaining <= 0) return '0dk';

    const minutes = Math.ceil(remaining / (60 * 1000));
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}s ${mins}dk` : `${hours}s`;
    }
    return `${minutes}dk`;
}

/**
 * Handles role change protection using a 2-hourly rate-limit system.
 * - Checks audit logs to find who performed the action
 * - Skips if executor is the bot or has Administrator
 * - If the executor exceeds their rate limit, undoes the action
 * - Logs everything to the role_protection_logs channel
 *
 * @param {import('discord.js').GuildMember} oldMember
 * @param {import('discord.js').GuildMember} newMember
 * @param {string[]} rolesAdded - Array of role IDs that were added
 * @param {string[]} rolesRemoved - Array of role IDs that were removed
 * @param {import('discord.js').Client} client
 */
async function handleRoleChangeProtection(oldMember, newMember, rolesAdded, rolesRemoved, client) {
    // Nothing to check if no roles changed
    if (rolesAdded.length === 0 && rolesRemoved.length === 0) return;

    let executor = null;

    try {
        // Wait for audit log to populate
        await new Promise(resolve => setTimeout(resolve, 1000));

        const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberRoleUpdate });

        const roleLog = fetchedLogs.entries.find(entry => {
            if (entry.targetId !== newMember.id) return false;

            return entry.changes.some(change => {
                if (change.key === '$add' && rolesAdded.length > 0) {
                    return change.new.some(role => rolesAdded.includes(role.id));
                }
                if (change.key === '$remove' && rolesRemoved.length > 0) {
                    return change.new.some(role => rolesRemoved.includes(role.id));
                }
                return false;
            });
        });

        if (roleLog) {
            executor = roleLog.executor;
        } else {
            Logger.info(`Could not find audit log for role change on ${newMember.user.tag}.`);
            return;
        }
    } catch (error) {
        Logger.error('Failed to fetch audit logs for role change:', error);
        return;
    }

    if (!executor) return;

    // Skip if the bot itself made the change (e.g., undoing an action)
    if (executor.id === client.application.id) return;

    // Fetch the executor as a GuildMember
    const executorMember = await newMember.guild.members.fetch(executor.id).catch(() => null);
    if (!executorMember) return;

    // Skip if executor has Administrator permission
    /*if (executorMember.permissions.has(PermissionFlagsBits.Administrator)) {
        Logger.info(`Skipping rate-limit check for ${executor.tag} — has Administrator permission.`);
        return;
    }*/

    // Get the executor's rate limits based on their roles
    const limits = getRateLimits(executorMember);
    const logChannel = newMember.guild.channels.cache.find(c => c.id === config.channels.role_protection_logs);

    if (!limits) {
        // No matching roles in role_perm_cooldowns — this person has NO permission to change roles. Undo everything.
        Logger.warn(`${executor.tag} has no role-perm-cooldown roles. Undoing all role changes...`);

        try {
            if (rolesRemoved.length > 0) {
                await newMember.roles.add(rolesRemoved, 'Rol Koruması: Yetkisiz işlem geri alındı');
            }
            if (rolesAdded.length > 0) {
                await newMember.roles.remove(rolesAdded, 'Rol Koruması: Yetkisiz işlem geri alındı');
            }
        } catch (err) {
            Logger.error(`Failed to undo unauthorized role changes by ${executor.tag}:`, err);
        }

        if (logChannel) {
            const fields = [
                { name: 'Hedef', value: `${newMember.user.tag}`, inline: true },
                { name: 'Yetkili', value: `${executor.tag} (${executor.id})`, inline: true }
            ];
            if (rolesRemoved.length > 0) {
                fields.push({ name: 'Alınan Roller', value: rolesRemoved.map(r => `<@&${r}>`).join(', '), inline: true });
            }
            if (rolesAdded.length > 0) {
                fields.push({ name: 'Verilen Roller', value: rolesAdded.map(r => `<@&${r}>`).join(', '), inline: true });
            }

            const embed = baseEmbed()
                .setAuthor({ name: `${newMember.guild.name} - Rol Koruması`, iconURL: newMember.guild.iconURL() })
                .setDescription(`${config.emojis.lock} | \`${executor.tag}\` rol değiştirme yetkisi olmadığı için işlem geri alındı.`)
                .addFields(...fields)
                .setColor('Red')
                .setTimestamp()
                .setFooter({ text: client.user.tag, iconURL: client.user.avatarURL() });

            await logChannel.send({ embeds: [embed] });
        }

        return;
    }

    const guildId = newMember.guild.id;
    const usage = await getUsage(executor.id, guildId);

    let undidRemove = false;
    let undidGrant = false;

    // --- Check REMOVE limit ---
    if (rolesRemoved.length > 0) {
        if (usage.remove + rolesRemoved.length > limits.remove) {
            // OVER LIMIT — undo the removal by re-adding the roles
            Logger.warn(`${executor.tag} exceeded REMOVE limit (${usage.remove}+${rolesRemoved.length} > ${limits.remove}). Undoing...`);

            try {
                await newMember.roles.add(rolesRemoved, 'Rol Koruması: Limit aşıldı, işlem geri alındı');
                undidRemove = true;
            } catch (err) {
                Logger.error(`Failed to undo role removal for ${newMember.user.tag}:`, err);

                if (logChannel) {
                    const failEmbed = baseEmbed()
                        .setAuthor({ name: `${newMember.guild.name} - Rol Limiti`, iconURL: newMember.guild.iconURL() })
                        .setDescription(`${config.emojis.warning} | \`${executor.tag}\` limit aşımında rol alma işlemini geri almaya çalıştım ancak yetkim yetmedi.`)
                        .addFields(
                            { name: 'Hedef', value: `${newMember.user.tag}`, inline: true },
                            { name: 'Alınan Roller', value: rolesRemoved.map(r => `<@&${r}>`).join(', '), inline: true },
                            { name: 'Yetkili', value: `${executor.tag} (${executor.id})`, inline: true }
                        )
                        .setColor('Red')
                        .setTimestamp()
                        .setFooter({ text: client.user.tag, iconURL: client.user.avatarURL() });

                    await logChannel.send({ embeds: [failEmbed] });
                }
            }

            if (undidRemove && logChannel) {
                const remaining = getRemainingTime(usage.windowStart);
                const embed = baseEmbed()
                    .setAuthor({ name: `${newMember.guild.name} - Rol Limiti`, iconURL: newMember.guild.iconURL() })
                    .setDescription(`${config.emojis.lock} | \`${executor.tag}\` rol alma limitini aştığı için işlem geri alındı.`)
                    .addFields(
                        { name: 'Hedef', value: `${newMember.user.tag}`, inline: true },
                        { name: 'Alınan Roller', value: rolesRemoved.map(r => `<@&${r}>`).join(', '), inline: true },
                        { name: 'Kullanım', value: `${usage.remove}/${limits.remove}`, inline: true },
                        { name: 'Yetkili', value: `${executor.tag} (${executor.id})`, inline: true },
                        { name: 'Yenilenme Süresi', value: remaining, inline: true }
                    )
                    .setColor('Red')
                    .setTimestamp()
                    .setFooter({ text: client.user.tag, iconURL: client.user.avatarURL() });

                await logChannel.send({ embeds: [embed] });
            }
        } else {
            // Within limits — increment usage
            await incrementUsage(executor.id, guildId, 'remove', rolesRemoved.length);
            Logger.info(`${executor.tag} used ${rolesRemoved.length} REMOVE action(s). Now at ${usage.remove + rolesRemoved.length}/${limits.remove}.`);
        }
    }

    // --- Check GRANT limit ---
    if (rolesAdded.length > 0) {
        if (usage.grant + rolesAdded.length > limits.grant) {
            // OVER LIMIT — undo the grant by removing the roles
            Logger.warn(`${executor.tag} exceeded GRANT limit (${usage.grant}+${rolesAdded.length} > ${limits.grant}). Undoing...`);

            try {
                await newMember.roles.remove(rolesAdded, 'Rol Koruması: Limit aşıldı, işlem geri alındı');
                undidGrant = true;
            } catch (err) {
                Logger.error(`Failed to undo role grant for ${newMember.user.tag}:`, err);

                if (logChannel) {
                    const failEmbed = baseEmbed()
                        .setAuthor({ name: `${newMember.guild.name} - Rol Limiti`, iconURL: newMember.guild.iconURL() })
                        .setDescription(`${config.emojis.warning} | \`${executor.tag}\` limit aşımında rol verme işlemini geri almaya çalıştım ancak yetkim yetmedi.`)
                        .addFields(
                            { name: 'Hedef', value: `${newMember.user.tag}`, inline: true },
                            { name: 'Verilen Roller', value: rolesAdded.map(r => `<@&${r}>`).join(', '), inline: true },
                            { name: 'Yetkili', value: `${executor.tag} (${executor.id})`, inline: true }
                        )
                        .setColor('Red')
                        .setTimestamp()
                        .setFooter({ text: client.user.tag, iconURL: client.user.avatarURL() });

                    await logChannel.send({ embeds: [failEmbed] });
                }
            }

            if (undidGrant && logChannel) {
                const remaining = getRemainingTime(usage.windowStart);
                const embed = baseEmbed()
                    .setAuthor({ name: `${newMember.guild.name} - Rol Limiti`, iconURL: newMember.guild.iconURL() })
                    .setDescription(`${config.emojis.lock} | \`${executor.tag}\` rol verme limitini aştığı için işlem geri alındı.`)
                    .addFields(
                        { name: 'Hedef', value: `${newMember.user.tag}`, inline: true },
                        { name: 'Verilen Roller', value: rolesAdded.map(r => `<@&${r}>`).join(', '), inline: true },
                        { name: 'Kullanım', value: `${usage.grant}/${limits.grant}`, inline: true },
                        { name: 'Yetkili', value: `${executor.tag} (${executor.id})`, inline: true },
                        { name: 'Yenilenme Süresi', value: remaining, inline: true }
                    )
                    .setColor('Red')
                    .setTimestamp()
                    .setFooter({ text: client.user.tag, iconURL: client.user.avatarURL() });

                await logChannel.send({ embeds: [embed] });
            }
        } else {
            // Within limits — increment usage
            await incrementUsage(executor.id, guildId, 'grant', rolesAdded.length);
            Logger.info(`${executor.tag} used ${rolesAdded.length} GRANT action(s). Now at ${usage.grant + rolesAdded.length}/${limits.grant}.`);
        }
    }
}


module.exports = {
    syncGuild,
    updateRoleMetadata,
    updateMemberRoles,
    restoreRole,
    handleRoleChangeProtection,
    getRateLimits,
    getUsage,
    getRemainingTime
}
