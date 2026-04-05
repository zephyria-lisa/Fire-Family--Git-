const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

async function loadEvents(client) {
    const eventsDir = path.join(__dirname, '..', 'events');
    let count = 0;

    const entries = fs.readdirSync(eventsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            // Support sub-folders like events/guild/, events/client/
            const subEntries = fs.readdirSync(path.join(eventsDir, entry.name), { withFileTypes: true });

            for (const sub of subEntries) {
                if (!sub.name.endsWith('.js')) continue;
                registerEvent(client, path.join(eventsDir, entry.name, sub.name));
                count++;
            }
        } else if (entry.name.endsWith('.js')) {
            registerEvent(client, path.join(eventsDir, entry.name));
            count++;
        }
    }

    Logger.success(`Loaded ${count} event(s).`);
}

function registerEvent(client, filePath) {
    const event = require(filePath);

    if (!event.name || !event.execute) {
        Logger.warn(`Event file ${path.basename(filePath)} is missing "name" or "execute" — skipped.`);
        return;
    }

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

module.exports = { loadEvents };
