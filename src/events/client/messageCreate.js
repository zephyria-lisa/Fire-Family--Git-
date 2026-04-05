const Logger = require('../../utils/logger');
const db = require('../../database/db');
const config = require('../../utils/config.json');
const { addXP } = require('../../utils/level');
const { baseEmbed } = require('../../utils/embeds');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getTodayDate } = require('../../utils/time');

async function checkMessageMentions(message, client) {
    const messageMentions = message.mentions;
    Logger.info(`Message ${message.id} has ${messageMentions.users.size} mentions`);

    if (messageMentions.users.size > 0) {
        for (const user of messageMentions.users.values()) {
            if (user.id === message.author.id) continue;
            if (user.id === client.user.id) continue;
            if (user.bot) continue;

            Logger.info(`User ${user.tag} was mentioned in message ${message.id}`);

            const member = message.guild.members.cache.get(user.id) || await message.guild.members.fetch(user.id).catch(() => null);
            if (member) {
                Logger.info(`Member ${member.user.tag} was found`);
                const memberPingDMsOn = await db.get(`ping_dms_on_${member.id}`);

                if (memberPingDMsOn) {
                    const embed = baseEmbed();
                    embed.setTitle("Etiketlendin!")
                    embed.setDescription(`${message.author} seni ${message.guild.name} sunucusunda ${message.channel} kanalında etiketledi.`);
                    embed.addFields(
                        { name: 'Sunucu', value: message.guild.name, inline: true },
                        { name: 'Kanal', value: message.channel.name, inline: true },
                        { name: 'Mesaj', value: `[Mesaja Git](${message.url})`, inline: true }
                    );
                    embed.setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() })
                    embed.setColor("#ffffff");
                    embed.setThumbnail(message.author.displayAvatarURL());

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`turn_pings_off`)
                                .setLabel("Etiketleri Kapat")
                                .setStyle(ButtonStyle.Danger)
                        );

                    try {
                        await member.send({ embeds: [embed], components: [row] });
                    } catch (error) {
                        Logger.error(`Failed to send DM to ${member.user.tag}: ${error.message}`);
                    }
                }
            }
        }
    }
}

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, client) {
        if (!message.guild || message.author?.bot) return;

        const todaysDate = getTodayDate();
        await db.add(`messages_${todaysDate}`, 1);
    },
};