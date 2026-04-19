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
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Melisa 💖', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Irmak 💝', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Zümra 💘', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Zehra 😊', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Melis 💌', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Meryem 😋', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Alya 💪🏿', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Diclem 💖', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: 'Fire Family 🔮', type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Ateş ⚡", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Berk 🌐", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Efe 🏆", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Taha 👑", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Arda ✌️", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Enes 😉", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Ufuk 😇", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Emir ⚓", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
            { name: "Hasan ♦️", type: ActivityType.Listening },
            { name: '💬 | Dünün Birincisi: {top_user}', type: ActivityType.Watching },
        ],
        status: 'online', // online | idle | dnd | invisible
    },
};


