const db = require('../../database/db');
const Logger = require('../../utils/logger');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member, client) {
        if (!member.guild) return;

        const guildId = member.guild.id;
        const currentBackup = await db.get(`role_backups_${guildId}`) || {};
        const memberId = member.id;

        Logger.info(`Member ${member.user.tag} left the server. Purging from role backups...`);

        let purgedAny = false;

        for (const roleId in currentBackup) {
            const membersList = currentBackup[roleId].members || [];
            const index = membersList.indexOf(memberId);

            if (index !== -1) {
                membersList.splice(index, 1);
                currentBackup[roleId].members = membersList;
                purgedAny = true;
            }
        }

        if (purgedAny) {
            await db.set(`role_backups_${guildId}`, currentBackup);
            Logger.success(`Successfully purged ${member.user.tag} from all role protection records.`);
        }
    },
};
