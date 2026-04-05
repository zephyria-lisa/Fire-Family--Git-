/**
 * Colour-coded console logger with timestamps.
 */

const colours = {
    reset:   '\x1b[0m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m',
    grey:    '\x1b[90m',
};

function timestamp() {
    return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

module.exports = {
    info:  (...args) => console.log(`${colours.grey}[${timestamp()}]${colours.reset} ${colours.cyan}[INFO]${colours.reset} `, ...args),
    success: (...args) => console.log(`${colours.grey}[${timestamp()}]${colours.reset} ${colours.green}[OK]${colours.reset}   `, ...args),
    warn:  (...args) => console.warn(`${colours.grey}[${timestamp()}]${colours.reset} ${colours.yellow}[WARN]${colours.reset} `, ...args),
    error: (...args) => console.error(`${colours.grey}[${timestamp()}]${colours.reset} ${colours.red}[ERR]${colours.reset}  `, ...args),
    debug: (...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`${colours.grey}[${timestamp()}]${colours.reset} ${colours.magenta}[DBG]${colours.reset}  `, ...args);
        }
    },
    command: (interaction) => {
        const guild = interaction.guild ? interaction.guild.name : 'DM';
        const prefix = interaction.isChatInputCommand() ? '/' : '';
        console.log(
            `${colours.grey}[${timestamp()}]${colours.reset} ${colours.blue}[CMD]${colours.reset}  ` +
            `${colours.green}${prefix}${interaction.commandName}${colours.reset} ` +
            `by ${colours.cyan}${interaction.user.tag}${colours.reset} ` +
            `in ${colours.yellow}${guild}${colours.reset}`
        );
    },

};
