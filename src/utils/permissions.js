/**
 * Permission & role check helpers.
 */

const config = require('../config');

/**
 * Returns true if the user ID is listed in the developers array.
 */
function isDeveloper(userId) {
    return config.developers.includes(userId);
}

/**
 * Returns true if the guild member has the given permission flag.
 */
function hasPermission(member, permission) {
    if (!member) return false;
    return member.permissions.has(permission);
}

/**
 * Returns true if the guild member has at least one of the given role IDs.
 */
function hasAnyRole(member, roleIds = []) {
    if (!member) return false;
    return member.roles.cache.some((role) => roleIds.includes(role.id));
}

module.exports = { isDeveloper, hasPermission, hasAnyRole };
