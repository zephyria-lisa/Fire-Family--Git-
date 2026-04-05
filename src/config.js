const { ActivityType } = require('discord.js');

/**
 * Central configuration file.
 * Add any bot-wide settings, feature flags, or constants here.
 */

module.exports = {
    // Bot metadata
    bot: {
        name: 'Fire Family',
        version: '1.0.0',
        color: 0x5865F2,           // Discord Blurple — default embed color
        errorColor: 0xED4245,      // Red — error embeds
        successColor: 0x57F287,    // Green — success embeds
        warnColor: 0xFEE75C,      // Yellow — warning embeds
    },

    // Developer / owner IDs (used for owner-only commands)
    developers: [
        // 'YOUR_USER_ID',
    ],

    // Default cooldown in seconds (per-command override via command file)
    defaultCooldown: 3,

    // Channel IDs
    channels: {
        welcome_channel: '1487483643059376281',
        suspicious_member_channel: '1487483643059376281', // Can be different if desired
    },

    // Embed footer
    embedFooter: {
        text: 'Fire Family',
    },
    // Presence configuration
    presence: {
        interval: 15000, // 15 seconds (in milliseconds)
        activities: [
            { name: 'Melisa tarafından 💖 ile geliştirildi.', type: ActivityType.Listening },
            { name: 'Fire Family 🔥', type: ActivityType.Playing },
        ],
        status: 'online', // online | idle | dnd | invisible
    },
};


