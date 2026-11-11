// Run 51: two screenshots for the owner's report (not a test: no checks, not run by run-browser.mjs). Synthetic data only.
// Usage: same environment as a single browser test, plus SHOT_DIR (where the pictures go).
import { launch, openPage, openSettings, openData, wait, baseSeed, tx, settle, fs, path, TODAY } from "./lib.mjs";
const OUT = process.env.SHOT_DIR, IMP = process.env.E2E_IMP_DIR; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(IMP, { recursive: true });
const AK = "expense_ledger_v5__accounts";
const A = (id, name, kind, amount) => ({ id, name, kind, opening: { amount, date: "" }, hidden: false });
const accSeed = (data) => eval(`(() => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("${AK}", ${JSON.stringify(JSON.stringify({ version: 1, ...data }))}); } } catch {} })`);
const browser = await launch();
for (const lang of ["en", "az"]) {
  const data = { accounts: [A("a_card01", "ABB Card", "card", 100), A("a_cash01", lang === "az" ? "Nağd" : "Cash", "cash", 50)], transfers: [{ id: "t_one111", from: "a_card01", to: "a_cash01", amount: 30, date: TODAY, note: "" }] };
  let page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [tx({ merchant: "Bravo", amount: 12, account: "a_card01" }), tx({ note: "Metro", amount: 0.6, account: "a_card01" }), tx({ merchant: "Cafe", amount: 5, account: "a_cash01" })] }), pre: accSeed(data), chooseLang: lang, dsf: 2 });
  await settle(page); await openSettings(page);
  await page.evaluate(() => document.querySelectorAll('[data-account="a_card01"] > div:nth-child(2) button')[1].click()); await wait(400);
  await page.evaluate(() => document.querySelector('[data-section="acc-remove-confirm"]').scrollIntoView({ block: "center" })); await wait(300);
  await page.screenshot({ path: path.join(OUT, `remove-account-${lang}.png`) }); await page.close();

  page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [tx({ id: 101, note: "Metro", amount: 0.6 }), tx({ id: 102, merchant: "Bravo", amount: 12.5 }), tx({ id: 103, merchant: "Cafe", amount: 8 })] }), pre: accSeed({ accounts: [A("a_bbbbbb", "ABB Card", "card", 100)], transfers: [] }), chooseLang: lang, dsf: 2 });
  await settle(page); await openData(page);
  const file = path.join(IMP, "phone-backup.json");
  fs.writeFileSync(file, JSON.stringify({ version: 10, transactions: [tx({ id: 901, note: "8 Noyabr Metro", amount: 0.6, category: "transport", account: "a_pppppp" }), tx({ id: 902, merchant: "Bravo", subcategory: "Groceries", amount: 12.5, account: "a_pppppp" }), tx({ id: 903, merchant: "Cafe", amount: 8 }), tx({ id: 904, merchant: "Pharmacy", amount: 7, account: "a_pppppp" })], accounts: [A("a_pppppp", "abb card", "card", 250)], transfers: [] }));
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForSelector('[data-section="import-merge-plan"]', { timeout: 5000 }); await wait(500);
  await page.evaluate(() => document.querySelector('[data-section="import-merge-plan"]').scrollIntoView({ block: "center" })); await wait(300);
  await page.screenshot({ path: path.join(OUT, `merge-sheet-${lang}.png`) }); await page.close();
}
await browser.close(); console.log("shots saved to " + OUT); process.exit(0);
