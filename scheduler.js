const cron = require('node-cron');
const moment = require('moment-timezone');
const { performScraping } = require('./index');
const { PrismaClient } = require('@prisma/client');
const express = require('express');

const app = express();
const prisma = new PrismaClient();
let isScrapingActive = false;

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    res.send('Scraper is running');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

function isMarketOpen() {
    const now = moment().tz('America/New_York');
    const dayOfWeek = now.isoWeekday();
    const hour = now.hour();
    const minute = now.minute();

    return (
        dayOfWeek >= 1 && dayOfWeek <= 5 &&
        ((hour === 9 && minute >= 30) || (hour > 9 && hour < 16))
    );
}

cron.schedule('* * * * *', async () => {
    if (isMarketOpen()) {
        if (!isScrapingActive) {
            console.log(`✅ Market opened! Starting scraping at ${moment().tz('America/New_York').format()}`);
            isScrapingActive = true;
        }
        console.log(`⏳ Running scheduled scraping at ${moment().tz('America/New_York').format()}`);
        await performScraping();
    } else {
        if (isScrapingActive) {
            console.log(`🛑 Market closed! Stopping scraping at ${moment().tz('America/New_York').format()}`);
            isScrapingActive = false;
        }
        console.log(`⏸️ Market closed. Skipping scraping at ${moment().tz('America/New_York').format()}`);
    }
});

cron.schedule('0 */4 * * *', async () => {
    if (isMarketOpen()) {
        console.log(`🧹 Running cleanup task at ${moment().tz('America/New_York').format()}`);
        try {
            await prisma.stock.deleteMany({ where: { createdAt: { lt: moment().subtract(1, 'day').toDate() } } });
            console.log('✅ Old data cleanup completed.');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    } else {
        console.log(`⏸️ Market closed. Skipping cleanup at ${moment().tz('America/New_York').format()}`);
    }
});

process.on('SIGINT', async () => {
    console.log("👋 Shutting down gracefully...");
    await prisma.$disconnect();
    process.exit();
});

console.log('✅ Scraper scheduler started. It will run every minute from Monday to Friday (9:30 AM - 4:00 PM New York Time).');
console.log('✅ Old data cleanup will run every 4 hours when the market is open.');
