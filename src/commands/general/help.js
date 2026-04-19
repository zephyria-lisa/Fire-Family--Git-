const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardım')
        .setDescription('Tüm komutların interaktif yardım menüsünü görüntüler'),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const embed = infoEmbed(
            '🤖 Fire Family Botu Yardım Menüsü',
            'Aşağıdaki açılır menüden bir komut kategorisi seçerek size sunulan belirli komutları görebilirsiniz.\n\n' +
            '**Kategoriler:**\n' +
            '🌍 **Genel:** Temel bot komutları\n' +
            'ℹ️ **Bilgi:** Sunucu ve kullanıcı bilgileri\n' +
            '🛡️ **Moderasyon:** Sunucuyu güvende tutmak için araçlar'
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Bir kategori seçin...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Genel Komutlar')
                    .setDescription('Genel bot komutlarını görüntüler')
                    .setValue('help_general')
                    .setEmoji('🌍'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Bilgi Komutları')
                    .setDescription('Sunucu ve kullanıcı bilgilerini görüntüler')
                    .setValue('help_info')
                    .setEmoji('ℹ️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Moderasyon Komutları')
                    .setDescription('View administrative commands')
                    .setValue('help_moderation')
                    .setEmoji('🛡️')
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({ embeds: [embed], components: [row] });
    },
};
