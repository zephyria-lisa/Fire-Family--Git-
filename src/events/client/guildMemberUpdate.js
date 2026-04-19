const { updateMemberRoles, handleRoleChangeProtection } = require('../../utils/roleProtection');
const { handleJailRoleProtection } = require('../../utils/jailUtils');
const Logger = require('../../utils/logger');

module.exports = {
    name: 'guildMemberUpdate',
    once: false,
    async execute(oldMember, newMember, client) {
        if (!newMember.guild) return;

        const oldRoles = oldMember.roles.cache.map(r => r.id);
        const newRoles = newMember.roles.cache.map(r => r.id);

        const rolesChanged = oldRoles.length !== newRoles.length || oldRoles.some(r => !newRoles.includes(r));

        if (rolesChanged) {
            Logger.info(`Member ${newMember.user.tag} roles changed. Updating protection cache...`);
            await updateMemberRoles(newMember);
        }

        const rolesAdded = newRoles.filter(r => !oldRoles.includes(r));
        const rolesRemoved = oldRoles.filter(r => !newRoles.includes(r));

        // Jail protection check
        await handleJailRoleProtection(newMember, rolesAdded);

        // Filter roles for general protection (only roles bot can manage)
        const manageableRolesAdded = rolesAdded.filter(r => newMember.guild.roles.cache.get(r) && newMember.guild.members.me.roles.highest.position > newMember.guild.roles.cache.get(r).position);
        const manageableRolesRemoved = rolesRemoved.filter(r => newMember.guild.roles.cache.get(r) && newMember.guild.members.me.roles.highest.position > newMember.guild.roles.cache.get(r).position);

        Logger.info("Roles removed: ", manageableRolesRemoved);
        Logger.info("Roles added: ", manageableRolesAdded);

        await handleRoleChangeProtection(oldMember, newMember, manageableRolesAdded, manageableRolesRemoved, client);
    },
};