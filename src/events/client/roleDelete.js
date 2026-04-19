const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const Logger = require('../../utils/logger');
const { restoreRole } = require('../../utils/roleProtection');
const config = require('../../utils/config.json');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'roleDelete',
    once: false,
    async execute(role, client) {
        if (!role.guild) return;

        Logger.warn(`Role "${role.name}" (${role.id}) was deleted in ${role.guild.name}. Analyzing deletion...`);

        if (role.id === config.roles.protected_role) {
            Logger.success(`Protected role "${role.name}" (${role.id}) was deleted. Restoring...`);
            await restoreRole(role.guild, role.id);
            return;
        }

        if (role.position > role.guild.members.me.roles.highest.position) {
            Logger.success(`Role "${role.name}" (${role.id}) was deleted by a user with a higher role. Restoring...`);

            const logChannel = role.guild.channels.cache.find(c => c.id === config.channels.role_protection_logs);

            if (logChannel) {
                const embed = baseEmbed()
                    .setAuthor({
                        name: `${role.guild.name} - Rol Koruması`,
                        iconURL: role.guild.iconURL()
                    })
                    .setDescription(`\`${role.name}\` rolü silindi ancak rol benden daha yukarıda olduğu için tekrardan oluşturamıyorum.`)
                    .setColor('Red')
                    .setTimestamp()
                    .setFooter({
                        text: client.user.tag,
                        iconURL: client.user.avatarURL()
                    });

                await logChannel.send({ embeds: [embed] });
            }

            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        let executor = null;
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleDelete,
            });

            const deletionLog = fetchedLogs.entries.first();
            if (deletionLog && deletionLog.targetId === role.id) {
                executor = deletionLog.executor;
            }
        } catch (error) {
            Logger.error('Failed to fetch audit logs for role deletion:', error);
        }

        if (executor) {
            Logger.info(`Role "${role.name}" was deleted by ${executor.tag} (${executor.id}).`);

            try {
                const member = await role.guild.members.fetch(executor.id).catch(() => null);
                const protectedRoleId = config.roles.protected_role;

                if (member && member.user.bot) return;

                if (member && (member.roles.cache.has(protectedRoleId) || member.permissions.has(PermissionFlagsBits.Administrator))) {
                    Logger.success(`Authorized deletion by ${executor.tag}. Skipping restoration.`);

                    const infoEmbed = baseEmbed()
                        .setAuthor({
                            name: `${role.guild.name} - Rol Koruması`,
                            iconURL: role.guild.iconURL()
                        })
                        .setDescription(`\`${role.name}\` rolü yetkili bir kişi tarafından silindiği için tekrardan oluşturulmadı.`)
                        .addFields(
                            { name: 'Silinen Rol', value: role.name, inline: true },
                            { name: 'Silinen Rol ID', value: role.id, inline: true },
                            { name: 'Yetkili', value: executor.tag, inline: true },
                            { name: 'Yetkili ID', value: executor.id, inline: true }
                        )
                        .setColor('Red')
                        .setTimestamp()
                        .setFooter({
                            text: client.user.tag,
                            iconURL: client.user.avatarURL()
                        });

                    const logChannel = role.guild.channels.cache.find(c => c.id === config.channels.role_protection_logs);
                    if (logChannel) await logChannel.send({ embeds: [infoEmbed] });

                    return;
                }
            } catch (memberError) {
                Logger.error('Failed to fetch member details for protection check:', memberError);
            }
        } else {
            Logger.warn(`Could not determine who deleted role "${role.name}". Proceeding with protection by default.`);
        }

        Logger.info(`Unauthorized deletion detected. Initializing protection for "${role.name}"...`);
        const restoredRole = await restoreRole(role.guild, role.id);

        if (restoredRole) {
            Logger.success(`Role protection successful for "${role.name}". Role has been recreated and members are being restored.`);
        } else {
            Logger.error(`Role protection failed for "${role.name}". No backup found or error during restoration.`);
        }
    },
};