const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database/db');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-yedek-kontrol')
        .setDescription('Bir rolün yedek verilerini kontrol eder')
        .addRoleOption(option => 
            option.setName('rol')
                .setDescription('Kontrol edilecek rol')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();
        const role = interaction.options.getRole('rol');
        const guildId = interaction.guild.id;

        const backups = await db.get(`role_backups_${guildId}`);

        if (!backups || !backups[role.id]) {
            return interaction.editReply({
                embeds: [baseEmbed()
                    .setTitle('Yedek Bulunamadı')
                    .setDescription(`\`${role.name}\` için veritabanında herhangi bir yedek bulunmuyor. Sync işlemini bekleyin or botu yeniden başlatın.`)
                    .setColor('Red')]
            });
        }

        const data = backups[role.id];
        const memberCount = data.members ? data.members.length : 0;

        const embed = baseEmbed()
            .setTitle(`Yedek Detayları: ${data.name}`)
            .addFields(
                { name: 'Rol ID', value: `\`${data.id}\``, inline: true },
                { name: 'Renk', value: `\`${data.color}\``, inline: true },
                { name: 'Pozisyon', value: `\`${data.position}\``, inline: true },
                { name: 'Permissions (Bitfield)', value: `\`${data.permissions}\``, inline: false },
                { name: 'Yedeklenen Üye Sayısı', value: `\`${memberCount}\``, inline: true },
                { name: 'Görünürlük (Hoist)', value: `\`${data.hoist ? 'Açık' : 'Kapalı'}\``, inline: true }
            )
            .setColor(data.color || 'Blue')
            .setTimestamp();

        if (memberCount > 0) {
            // Show first 10 members as example
            const sampleMembers = data.members.slice(0, 10).map(id => `<@${id}>`).join(', ');
            embed.addFields({ name: 'Örnek Üyeler', value: sampleMembers + (memberCount > 10 ? '...' : ''), inline: false });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
