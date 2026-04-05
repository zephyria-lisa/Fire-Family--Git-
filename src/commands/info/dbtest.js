const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dbtest')
        .setDescription('Test the quick.db storage')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a value in the database')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('The key to store')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The value to store')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('get')
                .setDescription('Get a value from the database')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('The key to retrieve')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a value from the database')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('The key to delete')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const key = interaction.options.getString('key');

        if (subcommand === 'set') {
            const value = interaction.options.getString('value');
            await db.set(key, value);

            await interaction.reply({
                embeds: [successEmbed('Database Set', `Stored **${value}** under key **${key}**`)]
            });
        } else if (subcommand === 'get') {
            const value = await db.get(key);

            if (value === null || value === undefined) {
                return interaction.reply({
                    embeds: [errorEmbed('Error', `No value found for key **${key}**`)],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [successEmbed('Database Get', `Value for **${key}**: \n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``)]
            });
        } else if (subcommand === 'delete') {
            await db.delete(key);

            await interaction.reply({
                embeds: [successEmbed('Database Delete', `Deleted key **${key}**`)]
            });
        }
    },
};
