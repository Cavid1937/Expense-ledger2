// Run 85 screenshots (not a test): the notifications bell and panel on a dark theme, and the Currency section on Ivory. Synthetic data only.
import path from "path";
import { launch, openPage, openSettings, wait, baseSeed, tx, openBell } from "./lib.mjs";
const dir = process.env.SHOT_DIR;
const old = new Date(Date.now() - 9 * 86400000).toISOString();
const browser = await launch();
const seed = (theme) => baseSeed({ theme, lastBackup: old, backupConfirmedAt: old, transactions: [tx({ merchant: "Bravo", amount: 12, category: "food" })] });
let page = await openPage(browser, { seed: seed("graphite"), dsf: 2 });
await wait(600);
await page.screenshot({ path: path.join(dir, "1-home-bell-dark.png") });
await openBell(page); await wait(400);
await page.screenshot({ path: path.join(dir, "2-bell-open-dark.png") });
await page.close();
page = await openPage(browser, { seed: seed("ivory"), dsf: 2 });
await openSettings(page);
await page.evaluate(() => document.querySelector("#set-cur-head")?.scrollIntoView({ block: "start" })); await wait(300);
await page.screenshot({ path: path.join(dir, "3-currency-ivory.png") });
await page.close();
await browser.close();
