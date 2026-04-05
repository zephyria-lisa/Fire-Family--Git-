# 🤖 Redavolistan Bot

Advanced Discord.js v14 bot framework with modular slash-command architecture.

---

## 📁 Project Structure

```
src/
├── index.js                         # Entry point
├── config.js                        # Bot-wide configuration
│
├── commands/                        # Slash commands (auto-loaded)
│   ├── general/
│   │   ├── ping.js
│   │   └── help.js
│   ├── info/
│   │   ├── serverinfo.js
│   │   └── userinfo.js
│   └── moderation/
│       ├── kick.js
│       └── ban.js
│
├── events/                          # Discord events (auto-loaded)
│   ├── client/
│   │   └── ready.js
│   └── interaction/
│       └── interactionCreate.js
│
├── components/                      # Message component handlers
│   ├── buttons/
│   ├── modals/
│   └── selectMenus/
│
├── handlers/                        # File loaders for commands, events, components
│   ├── commandHandler.js
│   ├── eventHandler.js
│   ├── buttonHandler.js
│   ├── modalHandler.js
│   └── selectMenuHandler.js
│
└── utils/                           # Shared helpers
    ├── logger.js
    ├── embeds.js
    ├── permissions.js
    └── deploy-commands.js
```

---

## 🚀 Getting Started

### 1. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```env
DISCORD_TOKEN=your-bot-token-here
CLIENT_ID=your-client-id-here
GUILD_ID=your-guild-id-here
```

### 2. Deploy slash commands

```bash
# To a specific guild (instant, good for development)
npm run deploy

# Globally (takes up to 1 hour to propagate)
npm run deploy -- global
```

### 3. Start the bot

```bash
npm start

# Or with auto-restart on file changes
npm run dev
```

---

## 🛠 Adding New Commands

Create a new `.js` file inside `src/commands/<category>/`:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mycommand')
        .setDescription('Does something cool'),

    cooldown: 5,     // optional, seconds
    devOnly: false,  // optional, restricts to developer IDs in config.js

    async execute(interaction, client) {
        await interaction.reply('Hello!');
    },

    // Optional: autocomplete handler
    async autocomplete(interaction, client) {
        // ...
    },
};
```

Then re-run `npm run deploy` to register it with Discord.

---

## 🔘 Adding Buttons / Modals / Select Menus

Place handler files in the matching `src/components/` sub-folder.  
Each file exports `{ data: { customId }, execute }`.

See the `.gitkeep.js` files in each folder for examples.

---

## 📝 License

ISC
