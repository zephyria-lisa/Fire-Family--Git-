const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embeds');
const config = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ödül')
        .setDescription('Ödül sistemini kontrol etmenizi sağlar.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Belirtilen kullanıcıya ödül ekler.')
                .addUserOption(option =>
                    option.setName('kullanıcı')
                        .setDescription('Ödül verilecek kullanıcı')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('ödül')
                        .setDescription('Ödül adı')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('sebep')
                        .setDescription('Ödülün sebebi')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('al')
                .setDescription('Belirtilen kullanıcıdan ödül alır.')
                .addUserOption(option =>
                    option.setName('kullanıcı')
                        .setDescription('Ödül alınacak kullanıcı')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('ödül')
                        .setDescription('Ödül numarası')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'ekle') {
            const rewardName = interaction.options.getString('ödül');
            const reason = interaction.options.getString('sebep');
            const user = interaction.options.getUser('kullanıcı');

            const userRewards = await db.get(`rewards_${user.id}`) || [];
            userRewards.push({
                name: rewardName,
                reason: reason,
                date: new Date().toISOString(),
                rewardId: userRewards.length + 1,
                moderator: interaction.user.id,
            });
            await db.set(`rewards_${user.id}`, userRewards);

            const logChannel = interaction.guild.channels.cache.get(config.bot_general_log);

            if (logChannel) {
                const logEmbed = baseEmbed()
                    .setColor("#34eb6b")
                    .setTitle('🏆 | Ödül Eklendi')
                    .setDescription(`${user} kullanıcısına ${rewardName} ödülü verildi.`)
                    .setFooter({ text: user.tag, iconURL: user.displayAvatarURL() })
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        { name: 'Kullanıcı', value: user.toString(), inline: true },
                        { name: 'Ödül', value: rewardName, inline: true },
                        { name: 'Sebep', value: reason, inline: true },
                        { name: 'Tarih', value: new Date().toISOString(), inline: true },
                        { name: 'Moderator', value: interaction.user.toString(), inline: true },
                        { name: 'Ödül ID', value: userRewards.length.toString(), inline: true }
                    );

                logChannel.send({ embeds: [logEmbed] });
            }
            await interaction.reply({
                embeds: [successEmbed('Başarılı!', `${user} kullanıcısına ${rewardName} ödülü verildi.`)]
            });

        } else if (subcommand === 'al') {
            const rewardIdInput = interaction.options.getString('ödül');
            const user = interaction.options.getUser('kullanıcı');

            const userRewards = await db.get(`rewards_${user.id}`) || [];
            const rewardIndex = userRewards.findIndex(r => r.rewardId === parseInt(rewardIdInput));

            if (rewardIndex === -1) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', `Belirtilen ID'ye sahip ödül bulunamadı.`)]
                });
            }

            const reward = userRewards[rewardIndex];
            const rewardName = reward.name;
            userRewards.splice(rewardIndex, 1);
            await db.set(`rewards_${user.id}`, userRewards);

            await interaction.reply({
                embeds: [successEmbed('Başarılı!', `${user} kullanıcısından ${rewardName} ödülü alındı.`)]
            });

            const logChannel = interaction.guild.channels.cache.get(config.bot_general_log);

            if (logChannel) {
                const logEmbed = baseEmbed()
                    .setColor("#eb3a34")
                    .setTitle('Ödül Alındı')
                    .setDescription(`${user} kullanıcısından ${rewardName} ödülü alındı.`)
                    .addFields(
                        { name: 'Kullanıcı', value: user.toString(), inline: true },
                        { name: 'Ödül', value: rewardName.toString(), inline: true },
                        { name: 'Tarih', value: new Date().toISOString(), inline: true },
                        { name: 'Moderator', value: interaction.user.toString(), inline: true },
                        { name: 'Ödül ID', value: rewardIdInput.toString(), inline: true }
                    );

                logChannel.send({ embeds: [logEmbed] });
            }
        }
    },
};
