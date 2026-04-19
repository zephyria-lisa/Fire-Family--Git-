const { QuickDB, SqliteDriver } = require('quick.db');
const path = require('path');

async function test() {
    // Database file path
    const dbPath = path.join(process.cwd(), 'json.sqlite');
    const driver = new SqliteDriver(dbPath);
    const db = new QuickDB({ driver });

    function getYesterdayDate() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const formatter = new Intl.DateTimeFormat('tr-TR', {
            timeZone: 'Europe/Istanbul',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return formatter.format(yesterday);
    }

    const yesterday = getYesterdayDate();
    const testData = {
        "735807653594398742": 10, // Default top user
    };

    console.log(`[TEST] Setting leaderboard data for yesterday: ${yesterday}`);
    await db.set(`daily_message_stats.${yesterday}`, testData);
    
    console.log("[TEST] Data set successfully. Bot will process it in the next 10 seconds.");
}

test().catch(err => {
    console.error(`[TEST] Error: ${err.message}`);
    process.exit(1);
});
