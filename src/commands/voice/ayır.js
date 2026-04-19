const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, warnEmbed } = require('../../utils/embeds');
const config = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayır')
        .setDescription('Bir kullanıcının özel odadan atamasını kaldırırsınız.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Ataması kaldırılacak kullanıcı').setRequired(true)),

    async execute(interaction) {
        const guild = interaction.guild;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.roles.cache.has(config.roles.management_team) && 
            (interaction.member.user.id !== config.userids.melisa)) {
            return interaction.reply({ embeds: [errorEmbed('Yetki Yetersiz', 'Bu komutu kullanmak için `Yönetici` yetkisine veya `Yönetim Ekibi` rolüne sahip olmalısınız.')], ephemeral: true });
        }

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('kullanıcı');
        const roomData = await db.get(`private_rooms.${guild.id}.${targetUser.id}`);

        if (!roomData) {
            return interaction.editReply({ embeds: [warnEmbed('Hata', 'Bu kullanıcının üzerine atanmış herhangi bir özel oda bulunmamaktadır.')] });
        }

        // Delete from DB
        await db.delete(`private_rooms.${guild.id}.${targetUser.id}`);
        await db.delete(`bound_channels.${guild.id}.${roomData.channelId}`);

        const channel = guild.channels.cache.get(roomData.channelId);
        if (channel) {
            try {
                await channel.delete();
            } catch (error) {
                console.error('Channel deletion failed during ayır:', error);
                return interaction.editReply({
                    embeds: [warnEmbed('Kanal Silinemedi', `${targetUser} kullanıcısının oda ataması başarıyla kaldırıldı ancak bağlı sesli kanal silinirken bir hata oluştu. Lütfen odayı manuel olarak silin.`)]
                });
            }
        }

        return interaction.editReply({
            embeds: [successEmbed('Bağlantı Kesildi', `${targetUser} kullanıcısının özel oda ataması başarıyla kaldırıldı ve kanal silindi.`)]
        });
    },
};
