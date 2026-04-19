const { SlashCommandBuilder, EmbedBuilder, OverwriteType, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { baseEmbed, errorEmbed } = require('../../utils/embeds');
const { emojis } = require('../../utils/config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('liste')
        .setDescription('Özel odanıza ekli olan kişileri listeler.'),

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

        const overwrites = channel.permissionOverwrites.cache.filter(o => 
            o.type === OverwriteType.Member && 
            o.id !== interaction.client.user.id && 
            o.id !== interaction.user.id
        );

        if (overwrites.size === 0) {
            const emptyEmbed = baseEmbed()
                .setTitle(`${emojis.member} | Oda Üye Listesi`)
                .setAuthor({
                    name: `${interaction.user.tag} - Özel Oda`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription('Odanıza henüz kimse eklenmemiş.')
                .setColor('#639fff');
            
            return interaction.reply({ embeds: [emptyEmbed] });
        }

        await interaction.deferReply();

        const addedUsers = [];
        for (const [id, overwrite] of overwrites) {
            // Check if ViewChannel is explicitly allowed
            if (overwrite.allow.has(PermissionsBitField.Flags.ViewChannel)) {
                const member = await guild.members.fetch(id).catch(() => null);
                if (member && !member.user.bot) {
                    addedUsers.push(`${emojis.green_dot} ${member} (\`${member.user.tag}\`)`);
                }
            }
        }

        if (addedUsers.length === 0) {
            const emptyListEmbed = baseEmbed()
                .setTitle(`${emojis.member} | Oda Üye Listesi`)
                .setAuthor({
                    name: `${interaction.user.tag} - Özel Oda`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription('Odanıza henüz kimse (botlar hariç) eklenmemiş.')
                .setColor('#639fff');

            return interaction.editReply({ embeds: [emptyListEmbed] });
        }

        const embed = baseEmbed()
            .setTitle(`${emojis.member} | Oda Üye Listesi`)
            .setAuthor({
                name: `${interaction.user.tag} - Özel Oda`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`Aşağıda odanıza erişimi olan kullanıcılar listelenmiştir:\n\n${addedUsers.join('\n')}`)
            .setColor('#639fff')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

        return interaction.editReply({ embeds: [embed] });
    },
};
