const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const config = require('../../utils/config.json');
const Logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Özel kanallara yeni komutlarla ilgili duyuru mesajı gönderir (sadece Melisa).'),

    async execute(interaction) {
        // 1) Permission check: Only Melisa can use this command
        if (interaction.user.id !== config.userids.melisa) {
            return interaction.reply({
                embeds: [errorEmbed('Yetki Yetersiz', 'Bu komutu sadece **Melisa** kullanabilir.')],
                ephemeral: true
            });
        }

        // 2) Defer the reply as the process might take some time
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const categoryId = config.private_rooms.category_id;

        try {
            // 3) Fetch channels and filter for those under the private rooms category
            // We fetch to ensure we have the most up-to-date list
            const allChannels = await guild.channels.fetch();
            const privateChannels = allChannels.filter(c => c.parentId === categoryId);

            if (privateChannels.size === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed('Hata', 'Duyuru gönderilecek herhangi bir özel oda bulunamadı.')]
                });
            }

            // 4) Design the hard-coded (example) embed
            const announcementEmbed = new EmbedBuilder()
                .setTitle('✨ Özel Oda Güncellemesi!')
                .setDescription('Merhaba! Özel odalarınız için yeni özellikler ve komutlar yayında. Artık odanızı daha kolay yönetebilirsiniz.')
                .addFields(
                    {
                        name: '🚀 Yeni Komutlar',
                        value: [
                            `**\`/liste\`** - Odanızdaki kişileri listeler.`,
                            `**\`/limit\`** - Oda kapasitesini ayarlar.`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '💡 Bilgilendirme',
                        value: 'Odanızla ilgili herhangi bir sorun yaşarsanız yetkililere bildirmekten çekinmeyin.\n\n➤ Melisa tarafında gönderildi ✨',
                        inline: false
                    }
                )
                .setColor('#c934eb')
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Fire Family • Duyuru Sistemi', iconURL: interaction.client.user.displayAvatarURL() });

            // 5) Iterate through channels and send the embed one-by-one
            let successCount = 0;
            let failCount = 0;

            for (const [id, channel] of privateChannels) {
                try {
                    // Voice channels in Discord now have a text chat feature
                    // We attempt to send the message directly to the channel
                    await channel.send({ embeds: [announcementEmbed] });
                    successCount++;
                } catch (error) {
                    Logger.error(`Kanalda duyuru gönderilemedi (${channel.name || id}):`, error);
                    failCount++;
                }
            }

            // 6) Final response to Melisa
            return interaction.editReply({
                embeds: [successEmbed('Duyuru İşlemi Tamamlandı', `Duyuru mesajı özel odalara gönderildi.\n\n✅ **Başarılı:** ${successCount}\n❌ **Hatalı:** ${failCount}`)]
            });

        } catch (error) {
            Logger.error('Duyuru komutunda beklenmedik hata:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Hata', 'İşlem sırasında beklenmedik bir hata oluştu.')]
            });
        }
    },
};
