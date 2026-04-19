const jsonConfig = require('./config.json');

async function getModeratorRoleOwnerAmounts(guild) {
    const roles = jsonConfig.roles;
    const amounts = {};

    for (const [key, role] of Object.entries(roles)) {
        const roleObj = guild.roles.cache.get(role);
        amounts[key] = roleObj ? roleObj.members.size : 0;
    }

    return amounts;
}

module.exports = {
    getModeratorRoleOwnerAmounts
};
