const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, warnEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('çıkar')
        .setDescription('Bir kullanıcıyı özel odanızdan çıkarırsınız.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Çıkarılacak kullanıcı').setRequired(true)),

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

        // Check if user has access
        const permissions = channel.permissionOverwrites.cache.get(targetUser.id);
        if (!permissions || !permissions.allow.has(PermissionsBitField.Flags.ViewChannel)) {
            return interaction.editReply({ embeds: [warnEmbed('Hata', 'Bu kullanıcının zaten odanıza erişimi bulunmuyor.')] });
        }

        try {
            await channel.permissionOverwrites.edit(targetUser.id, {
                ViewChannel: false
            });
            return interaction.editReply({ embeds: [successEmbed('Kullanıcı Çıkarıldı', `${targetUser} kullanıcısının oda erişimi kaldırıldı.`)] });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [errorEmbed('Hata', 'Kullanıcı çıkarılırken bir hata oluştu.')] });
        }
    },
};
