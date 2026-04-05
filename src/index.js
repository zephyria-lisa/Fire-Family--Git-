/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    Fire Family Bot                         ║
 * ║         Advanced Discord.js v14 Bot Framework               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Entry point — boots the client, loads handlers, and connects.
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadEvents } = require('./handlers/eventHandler');
const { loadCommands } = require('./handlers/commandHandler');
const { loadButtons } = require('./handlers/buttonHandler');
const { loadModals } = require('./handlers/modalHandler');
const { loadSelectMenus } = require('./handlers/selectMenuHandler');
const Logger = require('./utils/logger');

// ─── Client Setup ───────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
    ],
});

// ─── Collections for slash commands & components ────────────
client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selectMenus = new Collection();
client.cooldowns = new Collection();
client.config = require('./utils/config.json');

// ─── Load all handlers ──────────────────────────────────────
(async () => {
    try {
        Logger.info('Loading commands…');
        await loadCommands(client);

        Logger.info('Loading buttons…');
        await loadButtons(client);

        Logger.info('Loading modals…');
        await loadModals(client);

        Logger.info('Loading select menus…');
        await loadSelectMenus(client);

        Logger.info('Loading events…');
        await loadEvents(client);

        Logger.info('Logging in…');
        await client.login(process.env.DISCORD_TOKEN);

        // ─── Global Error Handling ────────────────────────────
        client.on('error', (error) => {
            Logger.error('Discord Gateway Error:', error);
        });

        client.on('shardError', (error) => {
            Logger.error('A websocket connection encountered an error:', error);
        });
    } catch (error) {
        Logger.error('Failed to start the bot:', error);
        process.exit(1);
    }
})();

// ─── Graceful shutdown ──────────────────────────────────────
process.on('SIGINT', () => {
    Logger.warn('SIGINT received — shutting down…');
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    Logger.error('Unhandled promise rejection:', error);
});
