const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, baseEmbed } = require('../../utils/embeds');
const { jailMember, unjailMember } = require('../../utils/jailUtils');
const { getRateLimits, getUsage, incrementUsage, getRemainingTime } = require('../../utils/roleProtection');
const Logger = require('../../utils/logger');
const db = require('../../database/db');
const config = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('karantina')
        .setDescription('Karantina komutlarını kullanmanızı sağlar.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Kullanıcıyı karantinaya alır.')
                .addUserOption(option =>
                    option.setName('kullanıcı')
                        .setDescription('Kullanıcı')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('süre')
                        .setDescription('Karantina süresi (dakika)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('sebep')
                        .setDescription('Karantina sebebi')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('çıkar')
                .setDescription('Kullanıcıyı karantinadan çıkarır.')
                .addUserOption(option =>
                    option.setName('kullanıcı')
                        .setDescription('Kullanıcı')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Kullanıcının karantina bilgilerini gösterir.')
                .addUserOption(option =>
                    option.setName('kullanıcı')
                        .setDescription('Kullanıcı')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('kullanıcı');
        const guild = interaction.guild;
        const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);

        // Permission & Limit Check
        const isAdministrator = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const limits = getRateLimits(interaction.member);

        if (!isAdministrator && (!limits || (subcommand === 'ekle' && limits.jail <= 0) || (subcommand === 'çıkar' && limits.unjail <= 0) || (subcommand === 'bilgi' && limits.jail <= 0 && limits.unjail <= 0))) {
            return interaction.reply({
                embeds: [errorEmbed('Yetkisiz İşlem', 'Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        if (subcommand === 'ekle') {
            const duration = interaction.options.getInteger('süre');
            const reason = interaction.options.getString('sebep');

            if (!member) {
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', 'Kullanıcı bulunamadı.')]
                });
            }

            if (user.id === interaction.guild.ownerId) {
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', 'Sunucu sahibini karantinaya alamazsınız.')]
                });
            }

            if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', 'Yöneticileri karantinaya alamazsınız.')]
                });
            }

            if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcının yetkisi benden daha yüksek veya bana eşit olduğu için işlem yapamam.')]
                });
            }

            if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcının yetkisi sizden daha yüksek veya eşit.')]
                });
            }

            const existingJail = await db.get(`jail_${member.id}`);
            if (existingJail) {
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', 'Bu kullanıcı zaten karantinada.')]
                });
            }

            // Limit Check for 'ekle'
            if (!isAdministrator) {
                const usage = await getUsage(interaction.user.id, interaction.guild.id);
                if (usage.jail >= limits.jail) {
                    const remaining = getRemainingTime(usage.windowStart);
                    return interaction.editReply({
                        embeds: [errorEmbed('Limit Aşıldı', `Karantina ekleme limitinizi doldurdunuz. Haklarınız **${remaining}** sonra yenilenecektir.`)]
                    });
                }
            }

            try {
                const jailData = await jailMember(interaction.guild, member, interaction.member, duration, reason);

                // Increment usage
                await incrementUsage(interaction.user.id, interaction.guild.id, 'jail', 1);

                const successEmbed = baseEmbed()
                    .setColor("#34eb6b")
                    .setTitle('Karantina - Eklendi')
                    .setDescription(`${member} kullanıcısı ${duration} dakika karantinaya alındı.`)
                    .setThumbnail(member.displayAvatarURL())
                    .addFields(
                        { name: 'Kullanıcı', value: member.toString(), inline: true },
                        { name: 'Süre', value: `${duration} dakika`, inline: true },
                        { name: 'Sebep', value: reason, inline: true },
                        { name: 'Bitiş Tarihi', value: `<t:${Math.floor(new Date(jailData.endDate).getTime() / 1000)}:R>`, inline: true },
                        { name: 'Moderator', value: interaction.user.toString(), inline: true }
                    );

                await interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                Logger.error(`Karantina command error: ${error.message}`);
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', error.message || 'Beklenmedik bir hata oluştu.')]
                });
            }

        } else if (subcommand === 'çıkar') {
            try {
                const jailData = await db.get(`jail_${user.id}`);
                if (!jailData) {
                    return interaction.editReply({
                        embeds: [errorEmbed('Hata', 'Kullanıcı karantinada değil.')]
                    });
                }

                // Lock Check
                if (jailData.isLocked && !isAdministrator) {
                    const hasLockRole = config.jail_lock ? interaction.member.roles.cache.some(role => config.jail_lock.includes(role.id)) : false;
                    if (!hasLockRole) {
                        return interaction.editReply({
                            embeds: [errorEmbed('Karantina Kilidi', 'Bu kullanıcı üst düzey bir yetkili tarafından karantinaya alındığı için sadece kilit yetkisi olanlar çıkarabilir.')]
                        });
                    }
                }

                // Limit Check for 'çıkar'
                if (!isAdministrator) {
                    const usage = await getUsage(interaction.user.id, interaction.guild.id);
                    if (usage.unjail >= limits.unjail) {
                        const remaining = getRemainingTime(usage.windowStart);
                        return interaction.editReply({
                            embeds: [errorEmbed('Limit Aşıldı', `Karantina çıkarma limitinizi doldurdunuz. Haklarınız **${remaining}** sonra yenilenecektir.`)]
                        });
                    }
                }

                const now = new Date();
                const endDate = new Date(jailData.endDate);

                if (endDate <= now) {
                    return interaction.editReply({
                        embeds: [baseEmbed()
                            .setColor("#ffcc00")
                            .setTitle('Bilgi')
                            .setDescription(`${user} kullanıcısının karantina süresi zaten dolmuş. Kısa süre içerisinde otomatik olarak çıkarılacaktır.`)
                        ]
                    });
                }

                await unjailMember(interaction.guild, user.id, interaction.member);

                // Increment usage
                await incrementUsage(interaction.user.id, interaction.guild.id, 'unjail', 1);

                const successEmbed = baseEmbed()
                    .setColor("#34eb6b")
                    .setTitle('Karantina - Çıkarıldı')
                    .setDescription(`${user} kullanıcısı karantinadan çıkarıldı.`)
                    .addFields(
                        { name: 'Kullanıcı', value: user.toString(), inline: true },
                        { name: 'Moderator', value: interaction.user.toString(), inline: true },
                        { name: 'Karantina Nedeni', value: jailData.reason, inline: true }
                    );

                if (member) successEmbed.setThumbnail(member.displayAvatarURL());

                await interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                Logger.error(`Karantina command error: ${error.message}`);
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', error.message || 'Beklenmedik bir hata oluştu.')]
                });
            }
        } else if (subcommand === 'bilgi') {
            try {
                const jailData = await db.get(`jail_${user.id}`);
                if (!jailData) {
                    return interaction.editReply({
                        embeds: [errorEmbed('Hata', 'Kullanıcı karantinada değil.')]
                    });
                }

                const successEmbed = baseEmbed()
                    .setColor("#9e9291")
                    .setTitle('Karantina - Bilgi')
                    .setDescription(`${user} kullanıcısının karantina bilgileri.`)
                    .addFields(
                        { name: 'Kullanıcı', value: user.toString(), inline: true },
                        { name: 'Süre', value: `${jailData.duration} dakika`, inline: true },
                        { name: 'Sebep', value: jailData.reason, inline: true },
                        { name: 'Bitiş Tarihi', value: `<t:${Math.floor(new Date(jailData.endDate).getTime() / 1000)}:R>`, inline: true },
                        { name: 'Moderator', value: `<@${jailData.moderatorId.toString()}>`, inline: true },
                        { name: 'Kilitli', value: jailData.isLocked ? 'Evet' : 'Hayır', inline: true }
                    );

                if (member) successEmbed.setThumbnail(member.displayAvatarURL());

                await interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                Logger.error(`Karantina command error: ${error.message}`);
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', error.message || 'Beklenmedik bir hata oluştu.')]
                });
            }
        }
    },
};
