const { infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        customId: 'help_menu',
    },
    async execute(interaction, client) {
        const value = interaction.values[0];
        let embed;

        if (value === 'help_general') {
            embed = infoEmbed(
                '🌍 Genel Komutlar',
                '`/yardım` — Yardım menüsünü görüntüler\n' +
                '`/ping` — Botun gecikmesini kontrol eder'
            );
        } else if (value === 'help_info') {
            embed = infoEmbed(
                'ℹ️ Bilgi Komutları',
                '`/sunucu-bilgi` — Sunucu bilgilerini görüntüler\n' +
                '`/kullanıcı-bilgi` — Kullanıcı bilgilerini görüntüler'
            );
        } else if (value === 'help_moderation') {
            embed = infoEmbed(
                '🛡️ Moderasyon Komutları',
                '`/at` — Bir üyeyi sunucudan atar\n' +
                '`/yasakla` — Bir üyeyi sunucudan yasaklar\n' +
                '`/sustur` — Bir üyeyi susturur\n' +
                '`/susturma-kaldır` — Bir üyenin susturmasını kaldırır\n' +
                '`/üyeyi-incele` — Bir üyenin bilgilerini görüntüler'
            );
        } else {
            embed = infoEmbed('Unknown Category', 'Could not load this category.');
        }

        // We update the message to swap out the embed, keeping the select menu intact.
        await interaction.update({ embeds: [embed] });
    },
};
