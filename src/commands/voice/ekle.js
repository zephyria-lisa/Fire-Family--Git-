const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ekle')
        .setDescription('Bir kullanıcıyı özel odanıza eklersiniz.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Eklenecek kullanıcı').setRequired(true)),

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
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ embeds: [errorEmbed('Hata', 'Belirtilen kullanıcı sunucuda bulunamadı.')] });
        }

        try {
            await channel.permissionOverwrites.edit(targetUser.id, {
                ViewChannel: true,
                SendMessages: true,
                UseSoundboard: false,
            });

            return interaction.editReply({ embeds: [successEmbed('Kullanıcı Eklendi', `${targetUser} kullanıcısına odanıza erişim izni verildi.`)] });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [errorEmbed('Hata', 'Kullanıcı eklenirken bir hata oluştu.')] });
        }
    },
};
