/**
 * Command Handler
 * Recursively loads all command files from src/commands/
 */

const fs   = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

async function loadCommands(client) {
    const commandsDir = path.join(__dirname, '..', 'commands');
    let count = 0;

    function read(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                read(fullPath);
                continue;
            }

            if (!entry.name.endsWith('.js')) continue;

            const command = require(fullPath);

            if (!command.data || !command.execute) {
                Logger.warn(`Command file ${entry.name} is missing "data" or "execute" — skipped.`);
                continue;
            }

            client.commands.set(command.data.name, command);
            count++;
        }
    }

    read(commandsDir);
    Logger.success(`Loaded ${count} command(s).`);
}

module.exports = { loadCommands };
