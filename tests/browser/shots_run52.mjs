// Run 52: screenshots of the statement review sheet for the owner's report (not a test). Synthetic data only.
import { launch, openPage, openData, wait, baseSeed, settle, fs, path } from "./lib.mjs";
const OUT = process.env.SHOT_DIR, IMP = process.env.E2E_IMP_DIR; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(IMP, { recursive: true });
const AK = "expense_ledger_v5__accounts";
const pre = eval(`(() => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("${AK}", ${JSON.stringify(JSON.stringify({ version: 1, accounts: [{ id: "a_card01", name: "Unibank Card", kind: "card", opening: { amount: 100, date: "" }, hidden: false }], transfers: [] }))}); } } catch {} })`);
const text = ["12-11-2026 | 09:15 12-11-2026 - 0.60 AZN BAKU METRO / 0.60 AZN", "11-11-2026 | 16:40 Lock - 5.00 AZN KAFE 21 / 5.00 AZN", "11-11-2026 | 14:02 11-11-2026 - 20.00 AZN PAYMENT SERVICE / 20.00 AZN",
  "11-11-2026 | 14:00 11-11-2026 20.00 AZN - M10 WALLET / 20.00 AZN", "10-11-2026 | 10:00 10-11-2026 - 7.50 AZN BRAVO MARKET / 7.50 AZN", "09-11-2026 | 08:00 09-11-2026 3.00 AZN - CASHBACK / 3.00 AZN"].join("\n");
const file = path.join(IMP, "statement.txt"); fs.writeFileSync(file, text);
const browser = await launch();
for (const lang of ["en", "az"]) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [] }), pre, chooseLang: lang, dsf: 2 }); await settle(page); await openData(page);
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForSelector('[data-section="import-statement"]', { timeout: 10000 }); await wait(500);
  await page.evaluate(() => document.querySelector('[data-section="import-statement"]').scrollIntoView({ block: "start" })); await wait(300);
  await page.screenshot({ path: path.join(OUT, `statement-sheet-${lang}.png`) }); await page.close();
}
await browser.close(); console.log("shots saved to " + OUT); process.exit(0);
