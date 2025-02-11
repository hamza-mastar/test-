
require('dotenv').config();
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function login(page, username, password) {
    try {
        await page.goto('https://finabase.io/auth', { timeout: 60000 });
        await page.waitForSelector('[placeholder="Enter Your Email"]', { visible: true });

        await page.type('[placeholder="Enter Your Email"]', username);
        await page.type('[placeholder="Enter Your Password"]', password);
        await page.keyboard.press('Enter');

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        console.log('✅ Login successful.');
        return true;
    } catch (e) {
        console.log('❌ Login failed:', e);
        return false;
    }
}

async function scrapeWatchlist(page) {
    try {
        await page.goto('https://finabase.io/i/watchlist/1', { timeout: 60000 });
        await page.waitForSelector('.table-fixed', { visible: true, timeout: 60000 });

        console.log('📊 Scraping watchlist data...');
        const stocks = await page.evaluate(() => {
            const rows = document.querySelectorAll('.table-fixed tbody tr');
            const data = [];
            rows.forEach((row) => {
                const columns = row.querySelectorAll('td');
                if (columns.length >= 5) {
                    const symbol = columns[0].innerText.trim();
                    const price = parseFloat(columns[3].innerText.replace(/,/g, '').trim());
                    const change = parseFloat(columns[4].innerText.replace(/,/g, '').trim());
                    if (!isNaN(price) && !isNaN(change)) {
                        data.push({ symbol, price, change, timestamp: new Date() });
                    }
                }
            });
            return data;
        });

        console.log('✅ Data scraping complete.');
        return stocks;
    } catch (e) {
        console.log('❌ Error encountered while scraping:', e);
        return [];
    }
}

async function saveToDatabase(stockData) {
    if (!stockData || stockData.length === 0) {
        console.log('No data scraped; nothing to save.');
        return;
    }
    try {
        await prisma.stock.updateMany({ data: { step: { increment: 1 } } });

        for (const data of stockData) {
            const { symbol, price, change } = data;
            const timestamp = new Date(); // ✅ Ensure timestamp is a Date object

            const percentageChange = price ? (change / price) * 100 : 0.0;

            const previousRecord = await prisma.stock.findFirst({
                where: { symbol: symbol },
                orderBy: { timestamp: 'desc' },
            });

            let realChange = previousRecord ? parseFloat((price - previousRecord.price).toFixed(2)) : change;
            let status = realChange >= 0 ? 'Gainer' : 'Loser';

            await prisma.stock.create({
                data: { symbol, price, change, realChange, percentageChange, timestamp, status, step: 1 },
            });
        }

        console.log('✅ Data saved to database.');
    } catch (error) {
        console.error('❌ Error saving stock data:', error);
    }
}

async function performScraping() {
    const username = process.env.USER_NAME || "al_0210@yahoo.com";
    const password = process.env.PASS_WORD || "Lucky720@";
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
        ],
        // executablePath:
        //     process.env.NODE_ENV === "production"
        //         ? process.env.PUPPETEER_EXECUTABLE_PATH
        //         : puppeteer.executablePath(),
    });
    const page = await browser.newPage();
    await page.setUserAgent(faker.internet.userAgent());

    try {
        if (username && password && (await login(page, username, password))) {
            const stockData = await scrapeWatchlist(page);
            await saveToDatabase(stockData);
        } else {
            console.log('❌ Login failed or missing credentials.');
        }
    } finally {
        await browser.close();
        await prisma.$disconnect();
        console.log('🛑 Browser session closed and database disconnected.');
    }
}

(async () => {
    await performScraping();
})();
