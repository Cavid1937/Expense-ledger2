// Run 83 screenshots (not pass/fail): holding an entry, then selection mode, on Ivory. Synthetic data only; output to SHOT_DIR.
import { launch, openPage, baseSeed, tx, wait, settle } from "./lib.mjs";
const out = process.env.SHOT_DIR;
const browser = await launch();
const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "Bazar", amount: 12.4, date: "2026-11-12" }), tx({ merchant: "Bolt", amount: 6, date: "2026-11-13" }), tx({ merchant: "Araz", amount: 31.9, date: "2026-11-13" })] });
const page = await openPage(browser, { seed, pre: `localStorage.setItem("expense_ledger_v5__theme","ivory");` }); await settle(page);
await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
const b = await page.evaluate(() => { const r = document.querySelector(".txn-row").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(b.x, b.y); await page.mouse.down(); await wait(380);
await page.screenshot({ path: `${out}/r83_hold.png` });
await wait(400); await page.mouse.up(); await wait(600);
await page.screenshot({ path: `${out}/r83_selected.png` });
await browser.close();
console.log("shots written");
