const jsonConfig = require('./config.json');

async function getModeratorRoleOwnerAmounts(guild) {
    const roles = jsonConfig.roles;
    const amounts = {};

    for (const [key, role] of Object.entries(roles)) {
        amounts[key] = guild.roles.cache.get(role).members.size;
    }

    return amounts;
}

module.exports = {
    getModeratorRoleOwnerAmounts
};
