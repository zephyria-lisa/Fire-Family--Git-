require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

const commands = [];
const commandsDir = path.join(__dirname, '..', 'commands');

// ─── Recursively read all command files ─────────────────────
function readCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            readCommands(fullPath);
        } else if (entry.name.endsWith('.js')) {
            Logger.info(`Loading command file: ${entry.name}`);
            const command = require(fullPath);

            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
                Logger.info(`Successfully loaded command: ${command.data.name}`);
            } else {
                Logger.warn(`Skipping ${fullPath} — missing "data" with .toJSON()`);
            }
        }
    }
}

readCommands(commandsDir);

// ─── Deploy ─────────────────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    const isGlobal = process.argv.includes('global');

    try {
        Logger.info(`Deploying ${commands.length} command(s) ${isGlobal ? 'globally' : 'to guild'}…`);

        if (isGlobal) {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
        } else {
            if (!process.env.GUILD_ID) {
                Logger.error('GUILD_ID is not set in .env — pass "global" to deploy globally instead.');
                process.exit(1);
            }

            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
        }

        Logger.success(`Successfully deployed ${commands.length} command(s)!`);
    } catch (error) {
        Logger.error('Failed to deploy commands:', error);
    }
})();
