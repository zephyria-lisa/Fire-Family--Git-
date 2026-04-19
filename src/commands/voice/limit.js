const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limit')
        .setDescription('Özel odanızın kullanıcı limitini belirlersiniz.')
        .addIntegerOption(option => option.setName('sayı').setDescription('Kullanıcı limiti').setRequired(true).setMinValue(0).setMaxValue(99)),

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

        const limit = interaction.options.getInteger('sayı');

        try {
            await channel.setUserLimit(limit);
            return interaction.editReply({ embeds: [successEmbed('Limit Güncellendi', `Odanızın kullanıcı limiti **${limit === 0 ? 'Sınırsız' : limit}** olarak güncellendi.`)] });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [errorEmbed('Hata', 'Limit güncellenirken bir hata oluştu.')] });
        }
    },
};
