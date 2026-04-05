const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { emojis } = require('./config.json');

/**
 * Base embed with default footer and timestamp.
 */
function baseEmbed() {
    return new EmbedBuilder()
        .setFooter(config.embedFooter)
        .setTimestamp();
}

/**
 * Standard info embed.
 */
function infoEmbed(title, description) {
    return baseEmbed()
        .setColor(config.bot.color)
        .setTitle(title)
        .setDescription(description);
}

/**
 * Success embed.
 */
function successEmbed(title, description) {
    return baseEmbed()
        .setColor(config.bot.successColor)
        .setTitle(`${title}`)
        .setDescription(description);
}

/**
 * Error embed.
 */
function errorEmbed(title, description) {
    return baseEmbed()
        .setColor(config.bot.errorColor)
        .setTitle(`${emojis.warning} | ${title}`)
        .setDescription(description);
}

/**
 * Warning embed.
 */
function warnEmbed(title, description) {
    return baseEmbed()
        .setColor(config.bot.warnColor)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description);
}

module.exports = { baseEmbed, infoEmbed, successEmbed, errorEmbed, warnEmbed };
