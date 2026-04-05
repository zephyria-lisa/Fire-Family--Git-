/**
 * Event: interactionCreate
 * Central router for all interaction types:
 *   - Slash commands (+ subcommands)
 *   - Autocomplete
 *   - Buttons
 *   - Modals
 *   - Select menus
 *   - Context menus
 */

const { Collection } = require('discord.js');
const Logger         = require('../../utils/logger');
const config         = require('../../config');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(interaction, client) {
        // ═══════════════════════════════════════════════════════
        //  SLASH COMMANDS & CONTEXT MENUS
        // ═══════════════════════════════════════════════════════
        if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                Logger.warn(`Unknown command: ${interaction.commandName}`);
                return;
            }

            // ── Cooldown logic ──────────────────────────────────
            const cooldownAmount = (command.cooldown ?? config.defaultCooldown) * 1000;

            if (!client.cooldowns.has(command.data.name)) {
                client.cooldowns.set(command.data.name, new Collection());
            }

            const timestamps = client.cooldowns.get(command.data.name);
            const now = Date.now();

            if (timestamps.has(interaction.user.id)) {
                const expiresAt = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expiresAt) {
                    const remaining = ((expiresAt - now) / 1000).toFixed(1);
                    const prefix = interaction.isChatInputCommand() ? '/' : '';
                    return interaction.reply({
                        embeds: [errorEmbed('Cooldown', `Please wait **${remaining}s** before using \`${prefix}${command.data.name}\` again.`)],
                        ephemeral: true,
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            // ── Developer-only check ────────────────────────────
            if (command.devOnly && !config.developers.includes(interaction.user.id)) {
                return interaction.reply({
                    embeds: [errorEmbed('Restricted', 'This command is restricted to bot developers.')],
                    ephemeral: true,
                });
            }

            // ── Execute ─────────────────────────────────────────
            try {
                Logger.command(interaction);
                await command.execute(interaction, client);
            } catch (error) {
                Logger.error(`Error executing /${interaction.commandName}:`, error);

                const reply = {
                    embeds: [errorEmbed('Error', 'Something went wrong while executing this command.')],
                    ephemeral: true,
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        // ═══════════════════════════════════════════════════════
        //  AUTOCOMPLETE
        // ═══════════════════════════════════════════════════════
        else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                Logger.error(`Autocomplete error for /${interaction.commandName}:`, error);
            }
        }

        // ═══════════════════════════════════════════════════════
        //  BUTTONS
        // ═══════════════════════════════════════════════════════
        else if (interaction.isButton()) {
            let button = client.buttons.get(interaction.customId);

            if (!button) {
                // Check for dynamic IDs (e.g. "ticket_close_12345")
                button = client.buttons.find((b) =>
                    b.data.startsWith && interaction.customId.startsWith(b.data.customId)
                );
            }

            if (!button) return;

            // ─── Automated User-Only Check ───────────────────────
            if (button.data.userOnly) {
                const parts = interaction.customId.split('_');
                const ownerId = parts[parts.length - 1]; // Assume owner ID is the last segment

                if (interaction.user.id !== ownerId) {
                    return interaction.reply({
                        embeds: [errorEmbed('Restricted', 'Only the person who started this interaction can use this button.')],
                        ephemeral: true,
                    });
                }
            }

            try {
                await button.execute(interaction, client);
            } catch (error) {
                Logger.error(`Button error (${interaction.customId}):`, error);
            }
        }

        // ═══════════════════════════════════════════════════════
        //  MODALS
        // ═══════════════════════════════════════════════════════
        else if (interaction.isModalSubmit()) {
            let modal = client.modals.get(interaction.customId);

            if (!modal) {
                // Check for dynamic IDs (e.g. "report_modal_...")
                modal = client.modals.find((m) =>
                    m.data.startsWith && interaction.customId.startsWith(m.data.customId)
                );
            }

            if (!modal) return;

            // ─── Automated User-Only Check ───────────────────────
            if (modal.data.userOnly) {
                const parts = interaction.customId.split('_');
                const ownerId = parts[parts.length - 1];

                if (interaction.user.id !== ownerId) {
                    return interaction.reply({
                        embeds: [errorEmbed('Restricted', 'Only the person who started this interaction can submit this modal.')],
                        ephemeral: true,
                    });
                }
            }

            try {
                await modal.execute(interaction, client);
            } catch (error) {
                Logger.error(`Modal error (${interaction.customId}):`, error);
            }
        }

        // ═══════════════════════════════════════════════════════
        //  SELECT MENUS
        // ═══════════════════════════════════════════════════════
        else if (interaction.isAnySelectMenu()) {
            const menu = client.selectMenus.get(interaction.customId);

            if (!menu) return;

            try {
                await menu.execute(interaction, client);
            } catch (error) {
                Logger.error(`SelectMenu error (${interaction.customId}):`, error);
            }
        }
    },
};
