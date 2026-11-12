// Run 55: screenshot of the entry detail sheet with the history card open (not a test). Synthetic data only.
import { launch, openPage, wait, baseSeed, settle, tx, daysAgo, TODAY, tab, fs, path } from "./lib.mjs";
const OUT = process.env.SHOT_DIR; fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
for (const lang of ["en", "az"]) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [
    tx({ merchant: "Bus/Metro", amount: 0.6, category: "transport", date: daysAgo(12) }), tx({ merchant: "Bus/Metro", amount: 0.6, category: "transport", date: daysAgo(8) }),
    tx({ merchant: "Bus/Metro", amount: 0.6, category: "transport", date: daysAgo(4) }), tx({ merchant: "Bus/Metro", note: "to university", amount: 0.6, category: "transport", date: TODAY })] }), chooseLang: lang, width: 360, height: 900, dsf: 2 });
  await settle(page); await tab(page, "Ledger"); await wait(400);
  await page.evaluate(() => document.querySelector(".txn-row").click()); await page.waitForSelector(".sheet"); await wait(500);
  await page.evaluate(() => document.querySelector('[data-section="detail-history-toggle"]').click()); await wait(500);
  await page.evaluate(() => { const s = document.querySelector(".sheet"); s.style.maxHeight = "none"; });
  const el = await page.$(".sheet"); await el.screenshot({ path: path.join(OUT, `detail-sheet-${lang}.png`) });
  await page.close();
}
await browser.close(); console.log("shots saved to " + OUT); process.exit(0);
