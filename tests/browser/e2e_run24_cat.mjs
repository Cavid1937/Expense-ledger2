// Run 24: picking a category in Transactions shows its all-time total and a total for each month. Synthetic data only; amounts worked out by hand.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const KEY = "expense_ledger_v5";
const seed = (language) => baseSeed({ language, transactions: [
  tx({ merchant: "A", amount: 12.5, category: "food", date: "2026-10-31" }), tx({ merchant: "B", amount: 7.5, category: "food", date: "2026-10-02" }),
  tx({ merchant: "C", amount: 20, category: "food", date: "2026-09-15" }), tx({ merchant: "D", amount: 99, category: "transport", date: "2026-10-05" })] });
const goLedger = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500); };
const totals = (page) => page.evaluate(() => { const e = document.querySelector('[data-section="tx-cat-totals"]'); return e ? e.innerText : null; });
// Picking the category goes through the app's own category sheet; the first sheet row that is not "All" and mentions food in any language.
const pickFood = async (page) => {
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /categor|kateqoriya|категор/i.test((x.getAttribute("aria-label") || "") + " " + x.innerText)); if (b) b.click(); }); await wait(400);
  await page.evaluate(() => { const o = [...document.querySelectorAll(".sheet button")].find((x) => /food|yemək|qida|еда|продукт/i.test(x.innerText)); if (o) o.click(); }); await wait(500);
};

section("R24-CT1. All-time and monthly totals appear with a category chosen (en)");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page); await goLedger(page);
  ok((await totals(page)) === null, "no totals block while no category is chosen");
  const ledger = await page.evaluate((k) => localStorage.getItem(k), KEY);
  await pickFood(page);
  const t = await totals(page);
  ok(!!t && /All time/.test(t) && /40/.test(t) && /3 entries/.test(t), "All time: 12.50 + 7.50 + 20.00 = 40.00 in 3 entries", t);
  const months = await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-cat-totals"] [data-month]')].map((e) => e.dataset.month + "|" + e.innerText));
  ok(months.length === 2 && months[0].startsWith("2026-10|") && /20/.test(months[0]) && months[1].startsWith("2026-09|") && /20/.test(months[1]), "October 20.00 and September 20.00, newest first", months);
  ok((await page.evaluate((k) => localStorage.getItem(k), KEY)) === ledger, "the ledger is byte-for-byte unchanged");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-CT2. az and ru");
for (const [l, re] of [["az", /Bütün dövr/], ["ru", /За всё время/]]) {
  const page = await openPage(browser, { seed: seed(l) }); await settle(page); await goLedger(page); await pickFood(page);
  const t = await totals(page);
  ok(!!t && re.test(t), `${l}: totals shown`, t);
  await page.close();
}
await finish("e2e_run24_cat", browser);
