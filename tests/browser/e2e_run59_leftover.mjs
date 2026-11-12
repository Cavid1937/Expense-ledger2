// Run 59 in the real bundled app (owner-approved month-end leftover): the "Not spent" card in Analytics, carrying unused budget (off by
// default, shown as its own line), the goal offer setting, and the one-time hint for people without accounts. Synthetic data only.
import { launch, openPage, openGoals, openSettings, tab, settle, state, ok, section, finish, baseSeed, tx, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const ym = (k) => { const d = new Date(); const x = new Date(d.getFullYear(), d.getMonth() - k, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };
const M1 = ym(1), M2 = ym(2);
const entries = [tx({ type: "income", category: "salary", amount: 1000, date: M2 + "-05", merchant: "Employer" }), tx({ amount: 300, date: M2 + "-10", merchant: "Market" }),
  tx({ type: "income", category: "salary", amount: 800, date: M1 + "-05", merchant: "Employer" }), tx({ amount: 900, date: M1 + "-10", merchant: "Market" }),
  tx({ type: "income", category: "savout", amount: 500, date: M1 + "-12", merchant: "Savings" }),
  tx({ type: "income", category: "salary", amount: 100, date: TODAY.slice(0, 7) + "-01", merchant: "Employer" })];
const card = (page) => page.evaluate(() => { const c = document.querySelector('[data-section="an-notspent"]'); return c ? { text: c.innerText, total: c.querySelector('[data-section="notspent-total"]').innerText, month: (c.querySelector('[data-section="notspent-month"]') || {}).innerText || "" } : null; });

section("R59-B1. Analytics: money not spent, month by month and since the start");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: entries, budgets: { food: 2000 } }) }); await tab(page, "Analytics"); await settle(page);
  let c = await card(page);
  // two months ago: 1000 - 300 = 700; last month: 800 - 900 = -100 (the 500 taken from savings is not income); total 600; this month so far 100
  ok(c && /600\.00/.test(c.total) && !/1,100|1100/.test(c.total), "since the start: 700 - 100 = 600.00 (money taken from savings is not counted as money in; the unused 2,000 budget is not counted)", c && c.total);
  ok(c && /This month so far: 100\.00 ₼ not spent/.test(c.month), "this month is shown apart, as 'so far'", c && c.month);
  await page.evaluate(() => document.querySelector('[data-section="notspent-toggle"]').click()); await wait(450);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-section="notspent-rows"] [data-mon]')].map((r) => [r.getAttribute("data-mon"), r.innerText.replace(/\s+/g, " ")]));
  ok(rows.length === 2 && rows[0][0] === M1 && /−100\.00/.test(rows[0][1]) && /out 900\.00/.test(rows[0][1]) && rows[1][0] === M2 && /700\.00/.test(rows[1][1]), "the working: each finished month with money in, money out and the result, newest first", rows);
  await page.evaluate(() => document.querySelector(".month-nav-btn").click()); await wait(500); await settle(page);
  c = await card(page);
  ok(c && /100\.00 ₼ overspent/.test(c.month) && /600\.00/.test(c.total), "last month's line says it was overspent by 100.00; the total stays 600.00", c && c.month);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R59-B2. Budgets: carrying is off until chosen, and the carried amount is its own line");
{
  const seed = baseSeed({ language: "en", budgets: { food: 300 }, transactions: [tx({ amount: 250, date: M1 + "-10", merchant: "Market" })] });
  let page = await openPage(browser, { seed }); await openGoals(page, "budgets");
  ok(!(await page.$('[data-section="carry-line"]')) && /\/ 300\.00/.test(await page.evaluate(() => document.querySelector(".bud-row .bud-nums").innerText)), "by default the food limit is the plain 300.00 (nothing carried)");
  await page.evaluate(() => [...document.querySelectorAll(".bud-row .btn-sm")].find((b) => /Edit/.test(b.innerText)).click()); await wait(450);
  const tog = await page.evaluate(() => { const l = document.querySelector('[data-section="carry-toggle"]'); return l ? { text: l.innerText, on: l.querySelector("input").checked } : null; });
  ok(tog && !tog.on && /Carry what's left into next month/.test(tog.text) && /Overspending is never carried/.test(tog.text), "editing the budget shows the choice, not ticked, with what it does", tog);
  await page.evaluate(() => document.querySelector('[data-section="carry-toggle"] input').click()); await wait(300);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__budgetcarry") || "{}"));
  ok(saved.food === TODAY.slice(0, 7) && (await state(page)).budgets.food === 300, "ticking it remembers this month as the start; the budget amount itself is unchanged", saved);
  await page.close();
  // Turned on last month: last month's unused 50 (300 - 250) is added to this month, as its own line.
  page = await openPage(browser, { seed, pre: `(() => { try { if (!sessionStorage.getItem("__c")) { sessionStorage.setItem("__c", "1"); localStorage.setItem("expense_ledger_v5__budgetcarry", JSON.stringify({ food: "${M1}" })); } } catch {} })()` });
  await openGoals(page, "budgets");
  const line = await page.evaluate(() => (document.querySelector('[data-section="carry-line"]') || {}).innerText || "");
  ok(/300\.00 ₼ \+ 50\.00 ₼ left from last month/.test(line) && /\/ 350\.00/.test(await page.evaluate(() => document.querySelector(".bud-row .bud-nums").innerText)), "this month: 300.00 + 50.00 left from last month = 350.00", line);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R59-B3. Goals: the month-start leftover offer is a setting, off by default");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await openGoals(page, "goals");
  const s = await page.evaluate(() => { const c = document.querySelector('[data-section="leftover-goal"]'); return c ? { text: c.innerText, on: c.querySelector("input").checked } : null; });
  ok(s && !s.on && /Off by default/.test(s.text), "the setting is there and off", s);
  await page.evaluate(() => document.querySelector('[data-section="leftover-goal"] input').click()); await wait(200);
  ok((await page.evaluate(() => localStorage.getItem("expense_ledger_v5__leftovergoal"))) === "1", "turning it on is remembered");
  await page.close();
}

section("R59-B4. No accounts yet: one gentle hint, once");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await openSettings(page);
  const h = await page.evaluate(() => (document.querySelector('[data-section="acc-leftover-hint"]') || {}).innerText || "");
  ok(/Add your cash or card as an account to see where unused money stays/.test(h), "the hint is shown to someone with entries and no account", h);
  await page.evaluate(() => document.querySelector('[data-section="acc-leftover-hint-ok"]').click()); await wait(300);
  ok(!(await page.$('[data-section="acc-leftover-hint"]')), "'Got it' removes it");
  await page.reload(); await page.waitForSelector(".tabbar"); await openSettings(page);
  ok(!(await page.$('[data-section="acc-leftover-hint"]')), "and it does not come back");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run59_leftover");
