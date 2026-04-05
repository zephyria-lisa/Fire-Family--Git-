const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

async function loadModals(client) {
    const dir = path.join(__dirname, '..', 'components', 'modals');
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return; }

    let count = 0;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const modal = require(path.join(dir, file));
        if (!modal.data?.customId || !modal.execute) {
            Logger.warn(`Modal file ${file} is missing "data.customId" or "execute" — skipped.`);
            continue;
        }
        client.modals.set(modal.data.customId, modal);
        count++;
    }

    Logger.success(`Loaded ${count} modal(s).`);
}

module.exports = { loadModals };
