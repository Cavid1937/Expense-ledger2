// Run 25: the first thing in the add form is WHAT you record: four equal tiles (expense, income, loan, debt). Synthetic data only.
import { launch, openPage, tab, openAdd, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const tiles = (page) => page.evaluate(() => [...document.querySelectorAll('[data-section="add-type-picker"] .type-pick')].map((b) => ({ t: b.innerText.trim(), on: b.classList.contains("active"), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) })));

section("R25-TP1. Four tiles, expense chosen first");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page); await wait(300);
  const t = await tiles(page);
  ok(t.map((x) => x.t).join("|") === "Expense|Income|Loan|Debt", "Expense, Income, Loan, Debt in that order", t);
  ok(t[0].on && !t[1].on && !t[2].on && !t[3].on, "Expense is the one selected at first");
  ok(t.every((x) => x.h >= 44 && x.w >= 44), "every tile is at least 44 px (easy to tap)", t);
  ok(Math.max(...t.map((x) => x.w)) - Math.min(...t.map((x) => x.w)) <= 1, "all four tiles are the same width");
  await page.evaluate(() => document.querySelectorAll('[data-section="add-type-picker"] .type-pick')[1].click()); await wait(200);
  const t2 = await tiles(page); ok(t2[1].on && !t2[0].on, "tapping Income selects it and clears Expense", t2);
  ok(/record income/i.test(await page.evaluate(() => document.querySelector(".add-foot .btn-primary").innerText)), "the Save button now says Record income");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "no horizontal scroll");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R25-TP2. Loan and Debt open the Debts page; editing offers only the two entry types");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page); await wait(300);
  await page.evaluate(() => document.querySelector('[data-section="add-other-loans"]').click()); await wait(700);
  ok(!(await page.$(".add-overlay")) && !!(await page.$('[data-section="debts-page"]')), "Loan closes the form and opens the Debts and loans page");
  await page.close();
  const p2 = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 1790001000001, merchant: "Shop", amount: 9 })] }) }); await tab(p2, "Ledger"); await settle(p2);
  await p2.evaluate(() => document.querySelector(".txn-row").click()); await wait(400);
  await p2.evaluate(() => [...document.querySelectorAll(".sheet button")].find((b) => /^\s*edit\s*$/i.test(b.innerText)).click()); await wait(500);
  const t = await tiles(p2); ok(t.length === 2 && t[0].t === "Expense" && t[1].t === "Income", "editing an entry shows just Expense and Income", t);
  await p2.close();
}
section("R25-TP3. az and ru, and a small phone with large text");
for (const lang of ["az", "ru"]) {
  const page = await openPage(browser, { width: 320, height: 640, seed: baseSeed({ language: lang }) }); await settle(page); await openAdd(page); await wait(300);
  const t = await tiles(page);
  ok(t.length === 4 && t.every((x) => x.t.length > 2 && !/add\./.test(x.t)), `${lang}: four translated tiles`, t);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${lang}: no horizontal scroll at 320 px`);
  await page.close();
}
await finish("e2e_run25_typepicker", browser);
