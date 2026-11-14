// Run 88 in the real bundled app (owner: "when user selects any date range ... tell them their statistics during that range; if it's expenses
// then expenses, if income then income, if both then both"). Synthetic entries only; figures worked out by hand.
import { launch, openPage, tab, ok, section, finish, baseSeed, tx, wait, daysAgo, TODAY } from "./lib.mjs";
const browser = await launch();
const seed = baseSeed({ language: "en", transactions: [
  tx({ merchant: "Shop A", amount: 12, date: TODAY }), tx({ merchant: "Shop B", amount: 8, date: daysAgo(2) }), tx({ merchant: "Old", amount: 100, date: daysAgo(40) }),
  tx({ type: "income", category: "salary", amount: 300, merchant: "Work", date: daysAgo(1) }), tx({ type: "income", category: "transferin", amount: 50, merchant: "Friend", date: TODAY }),
] });
const stats = (page) => page.evaluate(() => { const c = document.querySelector('[data-section="tx-range-stats"]'); if (!c) return null; const g = (k) => { const e = c.querySelector(`[data-stat="${k}"]`); return e ? e.innerText : ""; }; return { spent: g("spent"), earned: g("earned"), other: g("other"), net: g("net") }; });

section("R88-E1. A ready-made range and what happened in it");
{
  const page = await openPage(browser, { seed }); await tab(page, "Transactions"); await wait(300);
  ok(!(await stats(page)), "no totals card before a range is chosen");
  await page.evaluate(() => [...document.querySelectorAll(".chip")].find((b) => /Date/.test(b.innerText)).click()); await wait(450);
  ok(!!(await page.$('[data-section="tx-range-quick"] [data-range="d30"]')), "the date filter offers ready-made ranges");
  await page.evaluate(() => document.querySelector('[data-range="d30"]').click()); await wait(500);
  const s = await stats(page);
  ok(s && /Spent: 20\.00/.test(s.spent) && /0\.67 ₼ a day \(30 days\)/.test(s.spent), "last 30 days: spent 12 + 8 = 20.00 (the 100.00 from 40 days ago is outside), about 0.67 a day", s);
  ok(s && /Earned: 300\.00/.test(s.earned) && /50\.00/.test(s.other) && /Left over: 330\.00/.test(s.net), "earned 300.00, other money in 50.00 kept apart, left over 350 - 20 = 330.00", s);
  ok((await page.evaluate(() => document.querySelector('[data-range="d30"]').getAttribute("aria-pressed"))) === "true", "the chosen range is marked");
  await page.evaluate(() => [...document.querySelectorAll(".chip")].find((b) => b.innerText.trim() === "Expenses").click()); await wait(450);
  const e = await stats(page);
  ok(e && /20\.00/.test(e.spent) && !e.earned && !e.net, "Expenses chosen: only the spending is told", e);
  await page.evaluate(() => [...document.querySelectorAll(".chip")].find((b) => b.innerText.trim() === "Income").click()); await wait(450);
  const i = await stats(page);
  ok(i && !i.spent && /300\.00/.test(i.earned) && /50\.00/.test(i.other) && !i.net, "Income chosen: only the money in is told", i);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run88_range");
