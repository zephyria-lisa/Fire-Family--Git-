const { AuditLogEvent } = require('discord.js');
const db = require('../../database/db');
const Logger = require('../../utils/logger');

module.exports = {
    name: 'roleCreate',
    once: false,
    async execute(role, client) {
        if (!role.guild) return;
        
        // Wait briefly for audit logs to populate
        await new Promise(resolve => setTimeout(resolve, 500));

        let executorId = null;
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleCreate,
            });
            const creationLog = fetchedLogs.entries.first();
            if (creationLog && creationLog.targetId === role.id) {
                executorId = creationLog.executorId;
            }
        } catch (error) {
            Logger.warn('Could not fetch Audit Logs for RoleCreate. Defaulting to manual sync.');
        }

        // If the role was created by the bot, skip initialization
        // restorationRole() handles its own database updates.
        if (executorId === client.user.id) {
            Logger.info(`Role "${role.name}" was restored by the bot. Skipping redundant initialization.`);
            return;
        }

        const currentBackup = await db.get(`role_backups_${role.guild.id}`) || {};
        
        // If the role is NOT in our backup yet (manual creation)
        if (!currentBackup[role.id]) {
            Logger.info(`New role "${role.name}" created manually by user ${executorId || 'Unknown'}. Initializing protection cache...`);
            
            currentBackup[role.id] = {
                id: role.id,
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions.bitfield.toString(),
                position: role.position,
                mentionable: role.mentionable,
                members: [] 
            };
            
            await db.set(`role_backups_${role.guild.id}`, currentBackup);
        }
    },
};
