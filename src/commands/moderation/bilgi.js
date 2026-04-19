const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const { getRateLimits, getUsage, getRemainingTime } = require('../../utils/roleProtection');
const { emojis } = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bilgi')
        .setDescription('Durumunuz hakkında bilgi alırsınız.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('haklarım')
                .setDescription('Günlük haklarınızı görürsünüz.')),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'haklarım') {
            const roleLimits = getRateLimits(interaction.member);
            const roleUsage = roleLimits ? await getUsage(interaction.user.id, interaction.guild.id) : null;

            const embed = baseEmbed()
                .setTitle(`${emojis.info} | Rol Haklarınız`)
                .setDescription(`Mevcut rol haklarınız aşağıda belirtilmiştir.`)
                .setAuthor({
                    name: `${interaction.user.tag} - Günlük Haklarınız`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setColor("#639fff")
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

            if (roleLimits && roleUsage) {
                const remainingTime = getRemainingTime(roleUsage.windowStart);
                embed.addFields(
                    { name: 'Rol Hakları', value: `**${roleLimits.grant - roleUsage.grant}/${roleLimits.grant}** rol verme, **${roleLimits.remove - roleUsage.remove}/${roleLimits.remove}** rol alma hakkınız kaldı.` },
                    { name: 'Karantina Hakları', value: `**${roleLimits.jail - roleUsage.jail}/${roleLimits.jail}** karantina ekleme, **${roleLimits.unjail - roleUsage.unjail}/${roleLimits.unjail}** karantina çıkarma hakkınız kaldı.` },
                    { name: 'Sıfırlanma Süresi', value: `Haklarınız **${remainingTime}** sonra sıfırlanacak.` }
                );
            } else if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                embed.addFields({ name: 'Rol Hakları', value: `${emojis.lock} Herhangi bir yetkiniz bulunmamaktadır.` });
            }

            await interaction.editReply({
                embeds: [embed]
            });
        }
    },
};
