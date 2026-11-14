// Run 83 screenshots (not a pass/fail test): Settings rows while pressed, and a fold halfway through closing, on Ivory.
// Synthetic data only. Output goes to the scratchpad given in SHOT_DIR (never a user folder).
import { launch, openPage, baseSeed, tx, wait } from "./lib.mjs";
const out = process.env.SHOT_DIR;
const browser = await launch();
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }), pre: `localStorage.setItem("expense_ledger_v5__theme","ivory");` });
await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click());
await page.waitForSelector(".more-page"); await wait(600);
await page.evaluate(() => document.querySelector('[data-fold-head="look"]').scrollIntoView({ block: "center" })); await wait(300);
await page.screenshot({ path: `${out}/r83_settings.png` });
const head = await page.$('[data-fold-head="look"]');
const box = await head.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down(); await wait(200);
await page.screenshot({ path: `${out}/r83_fold_pressed.png` });
await page.mouse.up(); await wait(700);
await page.screenshot({ path: `${out}/r83_fold_open.png` });
const row = await page.$(".fold-body .list-card > .list-row") || await page.$(".list-card:not(.fold-card) > .list-row");
if (row) { const b = await row.boundingBox(); await page.mouse.move(b.x + 40, b.y + b.height / 2); await page.mouse.down(); await wait(150); await page.screenshot({ path: `${out}/r83_row_pressed.png` }); await page.mouse.up(); }
await page.evaluate(() => (document.querySelector('[data-fold-head="look"]') || document.querySelector("[data-fold-head]")).click()); await wait(120);
await page.screenshot({ path: `${out}/r83_fold_midclose.png` });
await browser.close();
console.log("shots written");
