const db = require('../database/db');
const Logger = require('./logger');
const config = require('../config');
const jsonConfig = require('./config.json');
const { baseEmbed } = require('./embeds');

/*
Detail types:
kick: { target: string, reason: string, moderator: string }
ban: { target: string, reason: string, moderator: string }
unban: { target: string, reason: string, moderator: string }
mute: { target: string, reason: string, moderator: string, duration: number }
unmute: { target: string, reason: string, moderator: string }
warn: { target: string, reason: string, moderator: string }
warn_remove: { target: string, reason: string, moderator: string }
jail: { target: string, reason: string, moderator: string, duration: number }
unjail: { target: string, reason: string, moderator: string }
*/

/**
 * Generates a standard security log embed from a log entry.
 * @param {object} logEntry The log entry from the database.
 * @returns {import('discord.js').EmbedBuilder}
 */
function generateSecurityEmbed(logEntry) {
    const { id, type: eventType, details, timestamp } = logEntry;
    const fields = [];

    if (eventType === 'kick') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'ban') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'unban') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'mute') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
            { name: 'Süre', value: `${details.duration} dakika`, inline: true },
        );
    }

    if (eventType === 'unmute') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'warn') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'warn_remove') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'jail') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Süre', value: `${details.duration} dakika`, inline: true },
            { name: 'Sebep', value: `${details.reason}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'unjail') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `${details.reason || 'Süre doldu / Manuel'}`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'mute_lock_violation') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `Sağ tık kilitli susturmayı açma teşebbüsü`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    if (eventType === 'deafen_lock_violation') {
        fields.push(
            { name: 'Hedef', value: `<@${details.target}>`, inline: true },
            { name: 'Sebep', value: `Sağ tık kilitli sağırlaştırmayı açma teşebbüsü`, inline: true },
            { name: 'Moderatör', value: `<@${details.moderator}>`, inline: true },
        );
    }

    return baseEmbed()
        .setTitle(`${eventType.toUpperCase()} - Güvenlik Kaydı`)
        .setDescription(`<t:${Math.floor(new Date(timestamp).getTime() / 1000)}:R> tarihinde ${id} ID'li ${eventType} işlemi gerçekleşti.`)
        .addFields(fields)
        .setColor('#FFFFFF')
        .setTimestamp(new Date(timestamp));
}

async function logSecurityEvent(client, guildId, eventType, details) {
    const logId = Date.now();
    const logEntry = {
        id: logId,
        guildId: guildId,
        type: eventType,
        details: details,
        timestamp: new Date().toISOString(),
    };

    try {
        await db.set(`security_log_${logId}`, logEntry);
        Logger.info(`Security log saved: ${eventType} in guild ${guildId}`);

        const channelId = jsonConfig.channels.security_logs;
        const logChannel = client.channels.cache.get(channelId);
        if (!logChannel) {
            Logger.error(`Security log channel not found: ${channelId}`);
            return;
        }

        const embed = generateSecurityEmbed(logEntry);
        embed.setFooter({ text: `Olay ID: ${logId}`, iconURL: client.user.displayAvatarURL() });
        embed.setThumbnail(client.user.displayAvatarURL());

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        Logger.error(`Failed to save security log: ${error.message}`);
    }
}

module.exports = { logSecurityEvent, generateSecurityEmbed };

