// Run 84 screenshots (not a pass/fail test): Settings > Appearance with every theme as an equal card, on a phone with no saved theme.
// Synthetic data only. Output goes to the scratchpad given in SHOT_DIR (never a user folder).
import { launch, openPage, baseSeed, tx, wait } from "./lib.mjs";
const out = process.env.SHOT_DIR;
const browser = await launch();
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }) });
await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await wait(300);
await page.screenshot({ path: `${out}/r84_home.png` });
await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click());
await page.waitForSelector(".more-page"); await wait(400);
await page.evaluate(() => { const h = document.querySelector('[data-fold-head="look"]'); if (h.getAttribute("aria-expanded") === "false") h.click(); }); await wait(600);
await page.evaluate(() => document.querySelector('[data-section="theme-chips"]').scrollIntoView({ block: "center" })); await wait(300);
await page.screenshot({ path: `${out}/r84_themes.png` });
await browser.close();
console.log("shots written");
