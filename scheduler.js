const cron = require('node-cron');
const moment = require('moment-timezone');
const { performScraping } = require('./index');
const { PrismaClient } = require('@prisma/client');
const express = require('express');

const app = express();
const prisma = new PrismaClient();
let isScrapingActive = false;

// Heroku requires the app to listen on $PORT
const PORT = process.env.PORT || 4000;

// Dummy route to keep Heroku dyno alive
app.get('/', (req, res) => {
    res.send('Scraper is running');
});

// Keep the app running on Heroku
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Check if the stock market is open
function isMarketOpen() {
    const now = moment().tz('America/New_York');
    const dayOfWeek = now.isoWeekday(); // Monday = 1, Sunday = 7
    const hour = now.hour();
    const minute = now.minute();

    return (
        dayOfWeek >= 1 && dayOfWeek <= 5 && // Monday to Friday
        ((hour === 9 && minute >= 30) || (hour > 9 && hour < 16)) // 9:30 AM to 4:00 PM
    );
}

// // Delete old stock data
// async function deleteOldData() {
//     if (isMarketOpen()) {
//         console.log(`🗑️ Deleting old data at ${moment().tz('America/New_York').format()}`);

//         try {
//             const allRecords = await prisma.stock.findMany({
//                 orderBy: { timestamp: 'desc' },
//             });

//             if (allRecords.length > 10) {
//                 const idsToDelete = allRecords.slice(10).map(record => record.id);

//                 await prisma.stock.deleteMany({
//                     where: { id: { in: idsToDelete } },
//                 });

//                 console.log(`✅ Deleted ${idsToDelete.length} old records, keeping only the latest 10.`);
//             } else {
//                 console.log("ℹ️ Less than 10 records in the database, no deletion needed.");
//             }
//         } catch (error) {
//             console.error("❌ Error deleting old records:", error);
//         }
//     } else {
//         console.log("⏸️ Market is closed. Data deletion skipped.");
//     }
// }

// Run scraping every minute
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

// // Run deletion every 20 minutes
// cron.schedule('*/20 * * * *', async () => {
//     await deleteOldData();
// });

// Ensure Prisma disconnects when the process exits
process.on('SIGINT', async () => {
    console.log("👋 Shutting down gracefully...");
    await prisma.$disconnect();
    process.exit();
});

console.log('✅ Scraper scheduler started. It will run every minute from Monday to Friday (9:30 AM - 4:00 PM New York Time).');
console.log('✅ Old data cleanup will run every 20 minutes when the market is open.');
