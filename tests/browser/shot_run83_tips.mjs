// Run 83 screenshots (not a pass/fail test): an info tip closed and open in Settings and in the add form, on Ivory.
// Synthetic data only. Output goes to the scratchpad given in SHOT_DIR (never a user folder).
import { launch, openPage, openAdd, baseSeed, tx, wait } from "./lib.mjs";
const out = process.env.SHOT_DIR;
const browser = await launch();
let page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }), pre: `localStorage.setItem("expense_ledger_v5__theme","ivory");` });
await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await wait(300);
await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click());
await page.waitForSelector(".more-page"); await wait(500);
await page.evaluate(() => { const h = document.querySelector('[data-fold-head="money"]'); if (h.getAttribute("aria-expanded") === "false") h.click(); }); await wait(600);
await page.evaluate(() => document.querySelector('[data-tip="work"]').scrollIntoView({ block: "center" })); await wait(300);
await page.screenshot({ path: `${out}/r83_tip_closed.png` });
await page.evaluate(() => document.querySelector('[data-tip-btn="work"]').click()); await wait(500);
await page.screenshot({ path: `${out}/r83_tip_open.png` });
await page.close();
page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), pre: `localStorage.setItem("expense_ledger_v5__theme","ivory");` });
await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await wait(300);
await openAdd(page); await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(500);
await page.evaluate(() => document.querySelector('[data-tip="reimb"]').scrollIntoView({ block: "center" })); await wait(300);
await page.evaluate(() => document.querySelector('[data-tip-btn="reimb"]').click()); await wait(500);
await page.screenshot({ path: `${out}/r83_tip_add.png` });
await browser.close();
console.log("shots written");
