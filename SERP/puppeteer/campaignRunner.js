// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
// const fs = require('fs');

// puppeteer.use(StealthPlugin());
// puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// const keywordsRaw = process.argv[2];
// const targetDomain = process.argv[3].toLowerCase();
// const searchEngine = process.argv[4]?.toLowerCase() || 'google';
// const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// const keywords = keywordsRaw.split(' ').map(k => k.trim()).filter(Boolean);
// const report = [];

// const getSearchUrl = (keyword, page) => {
//     const encoded = encodeURIComponent(keyword);
//     switch (searchEngine) {
//         case 'google': return `https://www.google.com/search?q=${encoded}&start=${page * 10}`;
//         case 'bing': return `https://www.bing.com/search?q=${encoded}&first=${page * 10 + 1}`;
//         case 'duckduckgo': return `https://duckduckgo.com/?q=${encoded}&s=${page * 30}`;
//         case 'yahoo': return `https://search.yahoo.com/search?p=${encoded}&b=${page * 10 + 1}`;
//         default: return `https://www.google.com/search?q=${encoded}&start=${page * 10}`;
//     }
// };

// const getSelector = () => {
//     switch (searchEngine) {
//         case 'google': return 'div#search a[href^="http"]:not([href*="google"])';
//         case 'bing': return 'li.b_algo h2 a[href^="http"]:not([href*="bing"])';
//         case 'duckduckgo': return 'a[data-testid="result-title-a"]';
//         case 'yahoo': return 'div.algo h3.title a[href^="http"]';
//         default: return 'a[href^="http"]';
//     }
// };

// const extractDomain = (url) => {
//     try {
//         return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
//     } catch {
//         return null;
//     }
// };

// const cleanBingRedirect = (url) => {
//     try {
//         const parsed = new URL(url);
//         if (parsed.hostname.includes('bing.com') && parsed.searchParams.has('r')) {
//             return parsed.searchParams.get('r');
//         }
//         return url;
//     } catch {
//         return url;
//     }
// };

// const delay = (ms) => new Promise(res => setTimeout(res, ms));
// const randomDelay = () => delay(Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000);

// const autoScroll = async (page) => {
//     await page.evaluate(async () => {
//         await new Promise(resolve => {
//             let totalHeight = 0;
//             const distance = 50;
//             const timer = setInterval(() => {
//                 window.scrollBy(0, distance);
//                 totalHeight += distance;
//                 if (totalHeight >= document.body.scrollHeight) {
//                     clearInterval(timer);
//                     resolve();
//                 }
//             }, 200);
//         });
//     });
// };

// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false,
//         executablePath: chromePath,
//         defaultViewport: null,
//         args: ['--start-maximized']
//     });

//     const [page] = await browser.pages();
//     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

//     for (const keyword of keywords) {
//         for (let run = 1; run <= 2; run++) {
//             let found = false, foundPage = null, foundPosition = null;

//             for (let i = 0; i < 5 && !found; i++) {
//                 try {
//                     const url = getSearchUrl(keyword, i);
//                     console.log(`\n🔍 Searching '${keyword}' on ${searchEngine} (page ${i + 1})`);

//                     await delay(2000); // 👈 Added realistic delay before navigation
//                     await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

//                     await autoScroll(page);
//                     await delay(3000);

//                     const selector = getSelector();
//                     await page.waitForSelector(selector, { timeout: 10000 });

//                     const links = await page.evaluate((sel, se) => {
//                         const isValidResult = (href) => {
//                             try {
//                                 const url = new URL(href);
//                                 return href.startsWith("http") && !url.hostname.includes(se) && !href.includes('/maps');
//                             } catch {
//                                 return false;
//                             }
//                         };
//                         return [...document.querySelectorAll(sel)]
//                             .map(el => el.href)
//                             .filter(href => isValidResult(href));
//                     }, selector, searchEngine);

//                     const parsed = links.map((href, idx) => {
//                         const cleanedUrl = searchEngine === 'bing' ? cleanBingRedirect(href) : href;
//                         return {
//                             href: cleanedUrl,
//                             host: extractDomain(cleanedUrl),
//                             domIndex: idx
//                         };
//                     }).filter(link => link.host);

//                     const targetIndex = parsed.findIndex(link => link.host === targetDomain);

//                     if (targetIndex !== -1) {
//                         found = true;
//                         foundPage = i + 1;
//                         foundPosition = targetIndex + 1;

//                         const previous = targetIndex > 0 ? parsed[targetIndex - 1] : null;
//                         const target = parsed[targetIndex];

//                         let refreshedElements = await page.$$(selector);

//                         if (previous && previous.host !== target.host) {
//                             console.log(`👉 Clicking previous domain: ${previous.href}`);
//                             const prevElement = refreshedElements[previous.domIndex];
//                             if (prevElement) {
//                                 await prevElement.evaluate(el => el.removeAttribute('target'));
//                                 await Promise.all([
//                                     page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
//                                     prevElement.click()
//                                 ]);
//                                 await delay(4000);
//                                 await page.goBack({ waitUntil: 'domcontentloaded' });
//                                 await delay(3000);
//                             }
//                         }

//                         refreshedElements = await page.$$(selector);
//                         const targetElement = refreshedElements[target.domIndex];
//                         if (targetElement) {
//                             console.log(`🎯 Clicking target domain: ${target.href}`);
//                             await targetElement.evaluate(el => el.removeAttribute('target'));
//                             await Promise.all([
//                                 page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
//                                 targetElement.click()
//                             ]);
//                             await delay(10000);
//                             console.log(`✅ '${targetDomain}' opened for '${keyword}'`);
//                         }

//                         break;
//                     }
//                 } catch (err) {
//                     console.log(`⚠️ Error: ${err.message}`);
//                 }
//             }

//             report.push({
//                 keyword,
//                 status: found ? 'Found' : 'Not Found',
//                 page: found ? `Page ${foundPage}, Position ${foundPosition}` : '-'
//             });

//             await randomDelay();
//         }
//     }

//     const csvLines = ['Keyword,Found/Not Found,Page and Position'];
//     report.forEach(row => {
//         csvLines.push(`${row.keyword},"${row.status}","${row.page}"`);
//     });
//     fs.writeFileSync('search_report.csv', csvLines.join('\n'), 'utf-8');
//     console.log('📝 Report saved as search_report.csv');

//     await browser.close();
// })();






const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const keyword = process.argv[2];
const targetDomain = process.argv[3];
const searchEngine = process.argv[4]?.toLowerCase() || 'google';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const getSearchUrl = (start) => {
    const encoded = encodeURIComponent(keyword);
    switch (searchEngine) {
        case 'google': return `https://www.google.com/search?q=${encoded}&start=${start}`;
        case 'bing': return `https://www.bing.com/search?q=${encoded}&first=${start + 1}`;
        case 'duckduckgo': return `https://duckduckgo.com/?q=${encoded}&s=${start}`;
        case 'yahoo': return `https://search.yahoo.com/search?p=${encoded}&b=${start + 1}`;
        default: return `https://www.google.com/search?q=${encoded}&start=${start}`;
    }
};

const getSelector = () => {
    switch (searchEngine) {
        case 'google': return 'a[href^="http"]';
        case 'bing': return 'li.b_algo h2 a';
        case 'duckduckgo': return 'a.result__a';
        case 'yahoo': return 'div.dd.algo.algo-sr h3.title > a';
        default: return 'a[href^="http"]';
    }
};

const autoScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
};

(async () => {
    console.log(`🔍 Searching for: "${keyword}" on ${searchEngine}`);
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        defaultViewport: null,
        args: ['--start-maximized'],
    });

    const [page] = await browser.pages();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    const maxPages = 5;
    let found = false;

    for (let i = 0; i < maxPages && !found; i++) {
        const url = getSearchUrl(i * 10);
        console.log(`📄 Opening: ${url}`);

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch (err) {
            console.error(`❌ Failed to load page: ${err.message}`);
            continue;
        }

        await autoScroll(page);
        const selector = getSelector();

        let links = [];
        try {
            await page.waitForSelector(selector, { timeout: 60000 });
            links = await page.$$eval(selector, anchors =>
                anchors.map(el => {
                    try {
                        const href = el.href;
                        const host = new URL(href).hostname.replace('www.', '').toLowerCase();
                        return { url: href, host };
                    } catch {
                        return null;
                    }
                }).filter(Boolean)
            );
        } catch (err) {
            console.error(`❌ Error fetching links: ${err.message}`);
        }

        console.log(`Found ${links.length} links on page ${i + 1}:`);
        links.forEach(link => console.log(`- ${link.url}`));

        // ✅ FIXED LOGIC: Only exact match for targetDomain
        const index = links.findIndex(link => link.host === targetDomain);

        if (index !== -1) {
            found = true;
            const target = links[index];
            const previous = index > 0 ? links[index - 1] : null;

            if (previous) {
                try {
                    console.log(`➡️ Opening previous domain in same tab: ${previous.url}`);
                    await page.goto(previous.url, { waitUntil: 'networkidle2', timeout: 60000 });
                    await page.waitForTimeout(4000);
                } catch (err) {
                    console.error(`❌ Failed to open previous domain: ${err.message}`);
                }
            } else {
                console.log(`⚠️ No previous domain (target is first in list).`);
            }

            try {
                console.log(`🎯 Opening target domain in same tab: ${target.url}`);
                await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
                await page.waitForTimeout(10000);
            } catch (err) {
                console.error(`❌ Failed to open target domain: ${err.message}`);
            }

            break;
        } else {
            console.log(`🔄 Domain not found on page ${i + 1}. Searching next page...`);
        }
    }

    if (!found) {
        console.log(`❌ '${targetDomain}' not found in top ${maxPages * 10} results.`);
    }

    console.log("🛑 Done. Close the browser manually if needed.");
})();
