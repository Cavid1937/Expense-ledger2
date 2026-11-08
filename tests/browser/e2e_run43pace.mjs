// Run 43 (2026-11-08): the "may run out around day N" line under Safe to Spend. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const steady = (n) => Array.from({ length: n }, (_, i) => tx({ amount: 10, category: "food", date: ymd(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1 - i)) }));
const first = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
// Only meaningful from the 5th, with several days left; the check adapts to today's date.
const d = new Date().getDate(), left = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - d + 1;
const usable = d >= 5 && left >= 6;
section("R43P-B1. The line under Safe to Spend");
if (!usable) { ok(true, `skipped: today is day ${d} of the month (needs day 5 or later and 6+ days left)`); }
else {
  // money left is about (income - spent this month); choose income so that it covers about half the remaining days at 10 a day
  const spentSoFar = steady(28).filter((x) => x.date >= first).length * 10;
  const income = spentSoFar + Math.round((left / 2) * 10) + 300;   // 300 = the savings target of the base seed
  let page = await openPage(browser, { seed: baseSeed({ language: "en", goals: [], transactions: [...steady(28), tx({ type: "income", category: "salary", amount: income, date: first })] }) }); await phone(page); await settle(page);
  const txt = await page.evaluate(() => (document.querySelector('[data-section="safe-runout"]') || {}).textContent || "");
  ok(/may run out around \d+/.test(txt) && /10\.00/.test(txt), "money covering about half of the days left shows 'may run out around <day>'", txt || await page.evaluate(() => (document.querySelector('[data-section="home-safe"]') || {}).innerText));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
  page = await openPage(browser, { seed: baseSeed({ language: "en", goals: [], transactions: [...steady(28), tx({ type: "income", category: "salary", amount: income + 5000, date: first })] }) }); await phone(page); await settle(page);
  ok(await page.evaluate(() => !document.querySelector('[data-section="safe-runout"]')), "plenty of money: the line is not shown");
  await page.close();
}
await browser.close();
finish("e2e_run43pace");