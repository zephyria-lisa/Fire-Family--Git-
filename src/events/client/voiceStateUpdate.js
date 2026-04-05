const db = require('../../database/db');
const config = require('../../utils/config.json');
const { addXP } = require('../../utils/level');
const { baseEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        if (!oldState.channelId && newState.channelId) {
            await db.set(`voice_join_time_${member.id}`, Date.now());
            return;
        }

        if (oldState.channelId && !newState.channelId) {
            Logger.info(`${member.user.tag} sesli kanaldan ayrıldı.`);
        }
    },
};
