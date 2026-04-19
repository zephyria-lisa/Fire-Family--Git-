const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, warnEmbed, infoEmbed } = require('../../utils/embeds');
const config = require('../../utils/config.json');
const Logger = require('../../utils/logger');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('oluştur')
        .setDescription('Bir kullanıcı için özel bir oda oluşturur.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Oda oluşturulacak kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('isim').setDescription('Odanın adı').setRequired(true)),

    async execute(interaction) {
        const guild = interaction.guild;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.roles.cache.has(config.roles.management_team) &&
            (interaction.member.user.id !== config.userids.melisa)) {
            return interaction.reply({ embeds: [errorEmbed('Yetki Yetersiz', 'Bu komutu kullanmak için `Yönetici` yetkisine veya `Yönetim Ekibi` rolüne sahip olmalısınız.')], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('kullanıcı');
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ embeds: [errorEmbed('Hata', 'Belirtilen kullanıcı sunucuda bulunamadı.')], ephemeral: true });
        }

        // Required permissions for the bot to create and set overwrites
        const botRequiredPerms = [
            { flag: PermissionsBitField.Flags.ManageChannels, name: 'Kanalları Yönet' },
            { flag: PermissionsBitField.Flags.ManageRoles, name: 'Rolleri Yönet' },
            { flag: PermissionsBitField.Flags.ViewChannel, name: 'Kanalları Görüntüle' },
            { flag: PermissionsBitField.Flags.MoveMembers, name: 'Üyeleri Taşı' },
            { flag: PermissionsBitField.Flags.DeafenMembers, name: 'Üyeleri Sağırlaştır' },
            { flag: PermissionsBitField.Flags.MuteMembers, name: 'Üyeleri Sustur' },
            { flag: PermissionsBitField.Flags.SendMessages, name: 'Mesaj Gönder' },
            { flag: PermissionsBitField.Flags.ManageMessages, name: 'Mesajları Yönet' },
            { flag: PermissionsBitField.Flags.AttachFiles, name: 'Dosya Ekle' },
            { flag: PermissionsBitField.Flags.EmbedLinks, name: 'Bağlantı Yerleştir' }
        ];

        const missingPerms = botRequiredPerms.filter(p => !guild.members.me.permissions.has(p.flag));

        if (missingPerms.length > 0) {
            const missingList = missingPerms.map(p => `• ${p.name}`).join('\n');
            return interaction.reply({
                embeds: [errorEmbed('Bot Yetkisi Eksik', `İşlemi gerçekleştirebilmem için sunucu genelinde şu yetkilere sahip olmam gerekiyor:\n\n${missingList}`)],
                ephemeral: true
            });
        }

        // Check if user already has a room data
        const existingRoom = await db.get(`private_rooms.${guild.id}.${targetUser.id}`);
        if (existingRoom) {
            const existingChannel = guild.channels.cache.get(existingRoom.channelId);
            // Check if existing channel is still valid
            if (existingChannel) {
                return interaction.reply({ embeds: [warnEmbed('Zaten Oda Var', `Bu kullanıcının zaten özel bir odası bulunuyor (<#${existingChannel.id}>).`)], ephemeral: true });
            }
            // If it is not valid, clear old data and proceed
            await db.delete(`private_rooms.${guild.id}.${targetUser.id}`);
            await db.delete(`bound_channels.${guild.id}.${existingRoom.channelId}`);
        }

        await interaction.deferReply();

        let channel;
        const channelName = interaction.options.getString('isim');

        try {
            // Attempt to create a room
            channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                        ],
                    },
                    {
                        id: targetUser.id,
                        allow: [
                            PermissionsBitField.Flags.DeafenMembers,
                            PermissionsBitField.Flags.MuteMembers,
                            PermissionsBitField.Flags.MoveMembers,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ManageMessages,
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.AttachFiles,
                            PermissionsBitField.Flags.EmbedLinks,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak,
                            PermissionsBitField.Flags.UseEmbeddedActivities,
                            PermissionsBitField.Flags.UseVAD,
                            PermissionsBitField.Flags.PrioritySpeaker,
                            PermissionsBitField.Flags.AddReactions,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.SendVoiceMessages,
                            PermissionsBitField.Flags.UseApplicationCommands,
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.Stream,
                            281474976710656n, // UseExternalSounds permission (if applicable in specific context)
                            562949953421312n, // Voice Permission (if applicable)
                            PermissionsBitField.Flags.SendTTSMessages,
                            PermissionsBitField.Flags.UseExternalEmojis,
                            PermissionsBitField.Flags.UseExternalStickers,
                            PermissionsBitField.Flags.UseSoundboard,
                            PermissionsBitField.Flags.UseExternalSounds
                        ],
                    }
                ],
                parent: config.private_rooms.category_id
            });

            // Bind in DB
            await db.set(`private_rooms.${guild.id}.${targetUser.id}`, { channelId: channel.id, userId: targetUser.id });
            await db.set(`bound_channels.${guild.id}.${channel.id}`, targetUser.id);

            // Information Embed
            const infoMsgEmbed = new EmbedBuilder()
                .setTitle('✨ Oda Bilgilendirmesi')
                .setDescription(`Merhaba ${targetUser}, özel odanız başarıyla oluşturuldu! Odadınızı yönetmek için aşağıdaki komutları kullanabilirsiniz:`)
                .addFields(
                    {
                        name: '🚀 Kullanılabilir Komutlar',
                        value: [
                            `**\` /ekle \`** - Bir kullanıcıyı sesli kanalınıza eklersiniz.`,
                            `**\` /çıkar \`** - Bir kullanıcıyı sesli kanalınızdan çıkarırsınız.`,
                            `**\` /at \`** - Bir kullanıcıyı sesli kanalınızdan atar (bağlantısını koparır).`,
							`**\` /liste \`** - Odanıza ekli kullanıcıları gösterir.`,
							`**\` /limit \`** - Odanızın üye limitini ayarlarsınız.`
                        ].join('\n')
                    }
                )
                .setColor('#c934eb')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            const infoMessage = await channel.send({ content: `${targetUser}`, embeds: [infoMsgEmbed] });

            return interaction.editReply({
                embeds: [successEmbed('Oda Oluşturuldu', `${channel} odası başarıyla ${targetUser} kullanıcısı için oluşturuldu.`)]
            });
        } catch (error) {
            console.error(error);
            if (channel) {
                try { await channel.delete(); } catch (e) { }
            }
            // Rollback DB
            await db.delete(`private_rooms.${guild.id}.${targetUser.id}`);
            if (channel && channel.id) await db.delete(`bound_channels.${guild.id}.${channel.id}`);

            return interaction.editReply({ embeds: [errorEmbed('Hata', 'Oda oluşturulurken bir hata oluştu. Lütfen doğru yetkilere sahip olduğumdan emin olun.')] });
        }
    },
};
