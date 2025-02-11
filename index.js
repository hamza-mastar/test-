const cron = require('node-cron');
const moment = require('moment-timezone');
const { performScraping } = require('./index');

function isMarketOpen() {
    const now = moment().tz('America/New_York');
    const dayOfWeek = now.isoWeekday(); // Monday = 1, Sunday = 7
    const hour = now.hour();

    return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 22; // Monday-Friday, 9 AM - 10 PM
}

cron.schedule('* * * * *', async () => {
    if (isMarketOpen()) {
        console.log(`⏳ Running scheduled scraping at ${moment().tz('America/New_York').format()}`);
        await performScraping();
    } else {
        console.log(`⏸️ Market closed. Skipping scraping at ${moment().tz('America/New_York').format()}`);
    }
});

console.log('✅ Scraper scheduler started. It will run every minute from Monday to Friday (9 AM - 10 PM New York Time).');
