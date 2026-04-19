function isNightTime() {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        hour: 'numeric',
        hour12: false // 24 saatlik formata (0-23) zorluyoruz
    });

    const currentHour = parseInt(formatter.format(now), 10);

    if (currentHour >= 22 || currentHour < 9) {
        return true;
    }

    return false;
}

function getTodayDate() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return formatter.format(now); // "04.03.2026"
}

function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    let days = Math.floor(duration / (1000 * 60 * 60 * 24));

    let res = [];
    if (days > 0) res.push(`${days}g`);
    if (hours > 0) res.push(`${hours}s`);
    if (minutes > 0) res.push(`${minutes}d`);
    if (seconds > 0 || res.length === 0) res.push(`${seconds}sn`);

    return res.join(' ');
}

function getTodayStartTimestamp() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const dateStr = formatter.format(now); // "2024-03-04"

    return new Date(`${dateStr}T00:00:00+03:00`).getTime();
}

function getMidnightRemainingTime() {
    const now = Date.now();
    const todayStart = getTodayStartTimestamp();
    const tomorrowStart = todayStart + (24 * 60 * 60 * 1000);

    let remaining = tomorrowStart - now;
    if (remaining < 0) remaining = 0;

    return msToTime(remaining);
}

function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formatter = new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return formatter.format(yesterday); // "03.03.2026"
}

module.exports = { isNightTime, getTodayDate, getYesterdayDate, msToTime, getTodayStartTimestamp, getMidnightRemainingTime };