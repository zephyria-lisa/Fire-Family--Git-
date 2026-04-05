const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

async function loadSelectMenus(client) {
    const dir = path.join(__dirname, '..', 'components', 'selectMenus');
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return; }

    let count = 0;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const menu = require(path.join(dir, file));
        if (!menu.data?.customId || !menu.execute) {
            Logger.warn(`SelectMenu file ${file} is missing "data.customId" or "execute" — skipped.`);
            continue;
        }
        client.selectMenus.set(menu.data.customId, menu);
        count++;
    }

    Logger.success(`Loaded ${count} select menu(s).`);
}

module.exports = { loadSelectMenus };
