const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database/db');
const config = require('../../utils/config.json');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

/**
 * /anonim-sikayet — Allows users to report issues anonymously to owners.
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anonim-sikayet')
        .setDescription('Yetkililere anonim bir şikayet gönderir')
        .addStringOption(option =>
            option.setName('sikayet')
                .setDescription('Şikayetinizin detaylı açıklaması')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Varsa şikayet edeceğiniz kullanıcı')
                .setRequired(false)),

    async execute(interaction, client) {
        const sikayet = interaction.options.getString('sikayet');
        const targetUser = interaction.options.getUser('kullanıcı');
        const userId = interaction.user.id;
        const cooldownKey = `anonim_cooldown_${userId}`;
        const cooldownTime = 5 * 60 * 1000; // 5 minutes

        const lastReport = await db.get(cooldownKey);
        const now = Date.now();

        // Cooldown check
        if (lastReport && (now - lastReport) < cooldownTime) {
            const remaining = cooldownTime - (now - lastReport);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            return interaction.reply({
                embeds: [errorEmbed('Bekleme Süresi', `Yeni bir şikayet göndermek için **${minutes} dakika ${seconds} saniye** beklemeniz gerekmektedir.`)],
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Defer reply since the DM loop can take more than 3 seconds
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Prepare the report embed for admins
        const adminEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Yeni Anonim Şikayet', iconURL: interaction.guild.iconURL() })
            .setColor('#2F3136')
            .addFields(
                { name: '👤 Şikayet Eden', value: `||${interaction.user.tag} (ID: ${userId})||`, inline: false },
                { name: '🎯 Şikayet Edilen User', value: targetUser ? `${targetUser.tag} (ID: ${targetUser.id})` : 'Belirtilmedi', inline: false },
                { name: '📝 Şikayet Detayı', value: sikayet, inline: false }
            )
            .setColor("#FF0000")
            .setFooter({ text: 'Fire Family - Anonim Şikayet Sistemi' })
            .setTimestamp();

        let sentToAny = false;
        const adminIds = [config.userids.ates, config.userids.melisa].filter(id => id); // Ensure IDs exist

        for (const adminId of adminIds) {
            try {
                const admin = await client.users.fetch(adminId);
                if (admin) {
                    await admin.send({ embeds: [adminEmbed] });
                    sentToAny = true;
                }
            } catch (err) {
                // Silently skip if DM is blocked or user not found
            }
        }

        if (sentToAny) {
            // Success: Start cooldown and notify user
            await db.set(cooldownKey, now);
            return interaction.editReply({
                embeds: [successEmbed('Şikayet İletildi', 'Şikayetiniz başarıyla yetkililere iletildi. Gizliliğiniz korunmaktadır.')]
            });
        } else {
            // Failure: Notify user
            return interaction.editReply({
                embeds: [errorEmbed('Gönderilemedi', 'Şikayetiniz iletilemedi. Yetkililerin DMs kapalı olabilir veya bir sorun oluştu.')]
            });
        }
    },
};
