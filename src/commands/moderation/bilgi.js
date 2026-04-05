const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const { getTodayDate, getMidnightRemainingTime } = require('../../utils/time');
const { getQuotaStatus, getUserScore } = require('../../utils/cooldown');
const { getRateLimits, getUsage, getRemainingTime } = require('../../utils/roleProtection');
const { emojis } = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bilgi')
        .setDescription('Durumunuz hakkında bilgi alırsınız.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('haklarım')
                .setDescription('Günlük haklarınızı görürsünüz.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skorum')
                .setDescription('Toplam komut kullanımınızı görürsünüz.'))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'haklarım') {
            const quota = await getQuotaStatus(interaction.member);
            const roleLimits = getRateLimits(interaction.member);
            const roleUsage = roleLimits ? await getUsage(interaction.user.id, interaction.guild.id) : null;
            const dailyReset = getMidnightRemainingTime();

            const embed = baseEmbed()
                .setTitle(`${emojis.info} | Günlük Haklarınız`)
                .setDescription(`Günlük haklarınız aşağıda belirtilmiştir.`)
                .addFields(
                    { name: 'Toplam Hak', value: `Her gün **${quota.quota.ban}** yasaklama, **${quota.quota.kick}** atma hakkınız otomatik olarak yenilenir. (Sıfırlanma süresi: **${dailyReset}**)` },
                    { name: 'Kullanılan Hak', value: `**${quota.used.ban}** yasaklama, **${quota.used.kick}** atma hakkınızı kullandınız.` },
                    { name: 'Kalan Hak', value: `**${quota.remaining.ban}** yasaklama, **${quota.remaining.kick}** atma hakkınız kaldı.` }
                )
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
                    { name: 'Sıfırlanma Süresi', value: `Haklarınız **${remainingTime}** sonra sıfırlanacak.` }
                );
            } else if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                embed.addFields({ name: 'Rol Hakları', value: `${emojis.lock} Rol değiştirme yetkiniz bulunmamaktadır.` });
            }

            await interaction.reply({
                embeds: [embed]
            });
        } else if (subcommand === 'skorum') {
            const score = await getUserScore(interaction.member);

            if (score === null || score === undefined) {
                return interaction.reply({
                    embeds: [errorEmbed('Error', `Skorunuz bulunamadı.`)],
                    ephemeral: true
                });
            }

            const embed = baseEmbed()
                .setTitle(`${emojis.info} | Skorunuz`)
                .setDescription(`Toplam skorunuz aşağıda belirtilmiştir.`)
                .addFields(
                    { name: 'Toplam Yasaklama', value: `**${score.ban}**`, inline: true },
                    { name: 'Toplam Atma', value: `**${score.kick}**`, inline: true }
                )
                .setColor("#639fff")
                .setAuthor({
                    name: `${interaction.user.tag} - Skorunuz`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

            await interaction.reply({
                embeds: [embed]
            });
        }
    },
};
