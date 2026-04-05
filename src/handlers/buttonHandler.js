/**
 * Button Handler
 * Loads all button interaction files from src/components/buttons/
 */

const fs   = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

async function loadButtons(client) {
    const dir = path.join(__dirname, '..', 'components', 'buttons');
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return; }

    let count = 0;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const button = require(path.join(dir, file));
        if (!button.data?.customId || !button.execute) {
            Logger.warn(`Button file ${file} is missing "data.customId" or "execute" — skipped.`);
            continue;
        }
        client.buttons.set(button.data.customId, button);
        count++;
    }

    Logger.success(`Loaded ${count} button(s).`);
}

module.exports = { loadButtons };
