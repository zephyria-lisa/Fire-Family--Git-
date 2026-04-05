const { successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        customId: 'secure_btn_',
        startsWith: true,
        userOnly: true // <--- The central framework now handles the check!
    },

    async execute(interaction) {
        await interaction.reply({
            embeds: [successEmbed('Access Granted', 'You successfully clicked the secure button!')],
            ephemeral: true
        });
    },
};
