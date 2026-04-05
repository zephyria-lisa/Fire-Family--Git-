const { updateRoleMetadata } = require('../../utils/roleProtection');
const Logger = require('../../utils/logger');

module.exports = {
    name: 'roleUpdate',
    once: false,
    async execute(oldRole, newRole, client) {
        if (!newRole.guild) return;
        
        Logger.info(`Role ${newRole.name} updated. Syncing to protection cache...`);
        await updateRoleMetadata(newRole);
    },
};
