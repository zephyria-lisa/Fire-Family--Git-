const { EmbedBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { baseEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const config = require('../../utils/config.json');
const { isNightTime } = require('../../utils/time');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message, client) {
        if (!message.guild || message.author?.bot) return;

        Logger.info(`Message deleted: ${message.content} in ${message.guild.name}`);

        if (message.member && message.member.permissions.has('Administrator')) return;

        const messageMentions = message.mentions;

        const timeLabel = isNightTime() ? "Gece" : "Gündüz";
    },
};