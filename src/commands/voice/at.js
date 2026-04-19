const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, warnEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('at')
        .setDescription('Bir kullanıcıyı özel odanızdan atarsınız (bağlantısını kesersiniz).')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Atılacak kullanıcı').setRequired(true)),

    async execute(interaction) {
        const guild = interaction.guild;
        const roomData = await db.get(`private_rooms.${guild.id}.${interaction.user.id}`);
        
        if (!roomData) {
            return interaction.reply({ embeds: [errorEmbed('Hata', 'Size atanmış geçerli bir özel oda bulunamadı.')], ephemeral: true });
        }

        const channel = guild.channels.cache.get(roomData.channelId);
        if (!channel) {
            return interaction.reply({ embeds: [errorEmbed('Hata', 'Atandığınız kanal artık mevcut değil.')], ephemeral: true });
        }

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('kullanıcı');

        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({ embeds: [warnEmbed('Hata', 'Kendi kendinizi odanızdan atamazsınız.')] });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ embeds: [errorEmbed('Hata', 'Belirtilen kullanıcı sunucuda bulunamadı.')] });
        }

        if (targetMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ embeds: [warnEmbed('Hata', 'Bir yöneticiyi odanızdan atamazsınız.')] });
        }

        if (targetMember.voice.channelId !== channel.id) {
            return interaction.editReply({ embeds: [warnEmbed('Hata', 'Bu kullanıcı odanızda bulunmuyor.')] });
        }

        try {
            await targetMember.voice.disconnect();
            return interaction.editReply({ embeds: [successEmbed('Kullanıcı Atıldı', `${targetUser} kullanıcısı odadan atıldı.`)] });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [errorEmbed('Hata', 'Kullanıcı atılırken bir hata oluştu.')] });
        }
    },
};
