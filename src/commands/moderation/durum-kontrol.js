const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const config = require('../../utils/config.json');
const Logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('durum-kontrol')
        .setDescription('Botun durumunu kontrol eder')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        let foundFlaw = false

        const embed = baseEmbed()
            .setTitle('Durum Kontrol')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setThumbnail(interaction.user.displayAvatarURL())
            .setColor("#a8325a");

        const fields = [];

        const requiredPermissions = [
            { flag: PermissionsBitField.Flags.ViewChannel, category: 'Kanal Yetkisi' },
            { flag: PermissionsBitField.Flags.SendMessages, category: 'Kanal Yetkisi' },
            { flag: PermissionsBitField.Flags.ReadMessageHistory, category: 'Kanal Yetkisi' },
            { flag: PermissionsBitField.Flags.UseApplicationCommands, category: 'Kanal Yetkisi' },
            { flag: PermissionsBitField.Flags.ModerateMembers, category: 'Moderasyon Yetkisi' },
            { flag: PermissionsBitField.Flags.ManageRoles, category: 'Moderasyon Yetkisi' },
        ];

        requiredPermissions.forEach(perm => {
            if (!interaction.guild.members.me.permissions.has(perm.flag)) {
                const permName = Object.keys(PermissionsBitField.Flags).find(key => PermissionsBitField.Flags[key] === perm.flag);
                fields.push({ name: perm.category, value: `\`${permName}\` yetkisine sahip değilim` });
                foundFlaw = true;
            }
        });

        Object.values(config.roles).forEach(role => {
            const roleFound = interaction.guild.roles.cache.find(r => r.id === role);
            if (!roleFound) {
                Logger.error(`Rol bulunamadı: ${role}`);
                fields.push({ name: 'Rol Yetkisi', value: `\`${role}\` rolü bulunamadı.` });
                foundFlaw = true;
            } else {
                if (interaction.guild.members.me.roles.highest.position < roleFound.position) {
                    fields.push({ name: 'Rol Yetkisi', value: `<@&${roleFound.id}> benden daha üstte.` });
                    foundFlaw = true;
                }
            }
        });

        Object.values(config.channels).forEach(channel => {
            const channelFound = interaction.guild.channels.cache.find(r => r.id === channel);
            if (!channelFound) {
                Logger.error(`Kanal bulunamadı: ${channel}`);
                fields.push({ name: 'Kanal Yetkisi', value: `\`${channel}\` kanalı bulunamadı.` });
                foundFlaw = true;
            }
        });

        if (foundFlaw) {
            embed.addFields(fields);
            embed.setDescription("Çalışmam için gerekli yetkiler eksik.")
            embed.setColor("#a8325a");
        } else {
            embed.setDescription("Çalışmam için gerekli tüm yetkilere sahibim.")
            embed.setColor("#32a852");
        }

        await interaction.reply({ embeds: [embed] });
    },
};
