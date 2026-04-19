const db = require('../../database/db');
const config = require('../../utils/config.json');
const { addXP } = require('../../utils/level');
const { baseEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent } = require('discord.js');
const { logSecurityEvent } = require('../../utils/security-logs.js');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState, client) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        // Session time tracking
        if (!oldState.channelId && newState.channelId) {
            await db.set(`voice_join_time_${member.id}`, Date.now());
            return;
        }

        if (oldState.channelId && !newState.channelId) {
            Logger.info(`${member.user.tag} sesli kanaldan ayrıldı.`);
        }

        // Mute & Deafen Lock Features
        const muteStatusChanged = oldState.serverMute !== newState.serverMute;
        const deafStatusChanged = oldState.serverDeaf !== newState.serverDeaf;

        if (muteStatusChanged || deafStatusChanged) {
            const isMuted = newState.serverMute;
            const isUnmuted = !newState.serverMute && oldState.serverMute;
            const isDeafened = newState.serverDeaf;
            const isUndeafened = !newState.serverDeaf && oldState.serverDeaf;

            // Fetch executor with retry logic
            let executor = null;
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                try {
                    const fetchedLogs = await newState.guild.fetchAuditLogs({
                        limit: 5,
                        type: AuditLogEvent.MemberUpdate,
                    });
                    const updateLog = fetchedLogs.entries.find(
                        (entry) => entry.targetId === member.id && entry.changes.some((c) => c.key === 'mute' || c.key === 'deaf')
                    );

                    if (updateLog && Date.now() - updateLog.createdTimestamp < 10000) {
                        executor = updateLog.executor;
                        break;
                    }
                } catch (error) {
                    Logger.error('Failed to fetch audit logs for voice state update:', error);
                }
            }

            // Handle Mute Lock
            if (muteStatusChanged) {
                if (isMuted && executor) {
                    if (config.muter_ids.includes(executor.id)) {
                        await db.set(`mute_locked_${member.id}`, true);
                        Logger.info(`${member.user.tag} in ${newState.guild.name} has been mute locked by ${executor.tag}.`);
                    }
                } else if (isUnmuted && executor) {
                    const isLocked = await db.get(`mute_locked_${member.id}`);
                    if (isLocked) {
                        if (!config.muter_ids.includes(executor.id)) {
                            // Unauthorized unmute attempt
                            await newState.setMute(true, 'Mute locked user attempted unmute');
                            Logger.warn(`${executor.tag} tried to unmute ${member.user.tag} who is mute locked. Re-muting...`);

                            await logSecurityEvent(client, newState.guild.id, 'mute_lock_violation', {
                                target: member.id,
                                moderator: executor.id
                            });
                        } else {
                            // Authorized unmute - remove lock
                            await db.delete(`mute_locked_${member.id}`);
                            Logger.info(`${member.user.tag} mute lock removed by authorized user ${executor.tag}.`);
                        }
                    }
                }
            }

            // Handle Deafen Lock
            if (deafStatusChanged) {
                if (isDeafened && executor) {
                    if (config.muter_ids.includes(executor.id)) {
                        await db.set(`deafen_locked_${member.id}`, true);
                        Logger.info(`${member.user.tag} in ${newState.guild.name} has been deafen locked by ${executor.tag}.`);
                    }
                } else if (isUndeafened && executor) {
                    const isLocked = await db.get(`deafen_locked_${member.id}`);
                    if (isLocked) {
                        if (!config.muter_ids.includes(executor.id)) {
                            // Unauthorized undeafen attempt
                            await newState.setDeaf(true, 'Deafen locked user attempted undeafen');
                            Logger.warn(`${executor.tag} tried to undeafen ${member.user.tag} who is deafen locked. Re-deafening...`);

                            await logSecurityEvent(client, newState.guild.id, 'deafen_lock_violation', {
                                target: member.id,
                                moderator: executor.id
                            });
                        } else {
                            // Authorized undeafen - remove lock
                            await db.delete(`deafen_locked_${member.id}`);
                            Logger.info(`${member.user.tag} deafen lock removed by authorized user ${executor.tag}.`);
                        }
                    }
                }
            }
        }
    },
};
