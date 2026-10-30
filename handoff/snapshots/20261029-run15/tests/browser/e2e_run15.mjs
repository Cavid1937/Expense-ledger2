// Run 15 (2026-10-29) in the real bundled app: no repeated sections across Home / Analytics / Goals, and the required monthly amount.
// Uses the language-independent data-section markers, never translated headings, so the same checks run in en, az and ru.
// Written BEFORE the Home / Analytics / Goals changes (test-first). Synthetic data only.
import { launch, openPage, tab, openGoals, wait, ok, section, finish, tx, baseSeed, bodyText, settle } from "./lib.mjs";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const DAY = pad(Math.min(d.getDate() - 1, 27) || 1);
// A deadline on the 1st of the month 8 months ahead: exactly 8 month-starts after today whatever today's date is.
const dl = new Date(d.getFullYear(), d.getMonth() + 8, 1); const DEADLINE = `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-01`;
let n = 1790000900000; const T = (o) => tx({ id: ++n, ...o });
const txns = [T({ type: "income", category: "salary", amount: 2450, merchant: "Employer", date: `${ym(0)}-01` }), T({ type: "income", category: "salary", amount: 2450, merchant: "Employer", date: `${ym(-1)}-01` }),
  T({ category: "food", amount: 18.4, merchant: "Bravo", subcategory: "Groceries", date: `${ym(0)}-${DAY}` }), T({ category: "food", amount: 7.5, merchant: "Coffee House", date: `${ym(0)}-02` }),
  T({ category: "transport", amount: 0.6, merchant: "BakiKart", date: `${ym(0)}-02` }), T({ category: "shopping", amount: 80, merchant: "Shop", date: `${ym(0)}-05` }), T({ category: "food", amount: 64.2, merchant: "Bazar", date: `${ym(-1)}-09` })];
const goals = [{ id: "g1", name: "Trip", target: 1500, saved: 300, monthlyTarget: 100, targetDate: DEADLINE }, { id: "g2", name: "Laptop", target: 2400, saved: 600, monthlyTarget: 200, targetDate: null }];
const seed = (lang) => baseSeed({ transactions: txns, goals, language: lang, budgets: { food: 20, transport: 80, shopping: 150 }, safeToSpend: { enabled: true, savingsTarget: 200 } });
const sections = (page) => page.evaluate(() => [...document.querySelectorAll("[data-section]")].map((e) => e.dataset.section));
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const text = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.innerText.replace(/\s+/g, " ")).join(" | "), sel);
const eqs = (a, b) => JSON.stringify(a) === JSON.stringify(b);

section("R15-B1. Home is the quick answer, not a second ledger (en)");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  const s = await sections(page);
  ok(["home-safe", "home-month", "home-breakdown", "home-coach", "home-see-all"].every((x) => s.includes(x)), "Home has Safe to Spend, this month, the spending breakdown, the coach and one route to Transactions", s);
  ok(!s.includes("home-empty"), "no empty state when there are entries", s);
  ok((await count(page, ".goal-card")) === 0, "no goal cards on Home");
  ok((await count(page, ".budget-item")) === 0, "no budget list on Home");
  ok((await count(page, ".txn-row")) === 0 && (await count(page, ".txn-group")) === 0, "no transaction rows on Home");
  const cards = await page.evaluate(() => [...document.querySelectorAll('[data-section="home-coach"] .helper-card')].map((e) => e.innerText.replace(/\s+/g, " ")));
  const tripCard = cards.find((c) => /Trip/.test(c)) || "";
  ok(!/Laptop/.test(await bodyText(page)), "a goal without a deadline needs no alert and does not appear on Home", cards);
  ok(!!tripCard && !/\d/.test(tripCard.replace(/Trip/g, "")), "the goal alert names the goal and repeats no amount or date (those are on the Goals tab)", tripCard);
  ok(cards.length <= 4, "the coach stays short", cards.length);
  ok(/budget/i.test(await text(page, '[data-section="home-coach"]')), "an over-budget category (food, limit 20) is still raised by the coach on Home");
  await page.evaluate(() => document.querySelector('[data-section="home-see-all"] button').click()); await wait(250);
  const cur = await page.evaluate(() => [...document.querySelectorAll(".tab-btn")].findIndex((b) => b.getAttribute("aria-current") === "page"));
  ok(cur === 1 && (await count(page, ".txn-row")) > 0, "'See all transactions' opens the Transactions tab, which lists the entries", cur);
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: [], goals: [], budgets: {}, language: "en" }) }); await settle(page);
  const s = await sections(page);
  ok(s.includes("home-empty") && !s.includes("home-see-all"), "a brand-new ledger still shows the empty state with its button, not the 'see all' route", s);
  await page.close();
}

section("R15-B2. Analytics keeps aggregates and drops the repeated lists (en)");
{
  const page = await openPage(browser, { seed: seed("en") }); await tab(page, "Monthly"); await settle(page);
  const s = await sections(page);
  ok(["an-month", "an-summary", "an-trend", "an-category", "an-merchant", "an-trends"].every((x) => s.includes(x)), "Analytics still has the month, summary, trend, categories, merchants and the trends block", s);
  ok((await count(page, ".txn-row")) === 0 && (await count(page, ".txn-group")) === 0, "no transaction rows on Analytics (they live in Transactions)");
  ok(!/Top Expenses|All Transactions/i.test(await bodyText(page)), "no 'Top Expenses' or 'All Transactions' lists");
  ok(s.filter((x) => x === "an-budget").length <= 1, "at most one budget block, and it follows the selected month", s);
  await page.close();
}

section("R15-B3. Goals: the required monthly amount first, optional what-if second (en)");
{
  const page = await openPage(browser, { seed: seed("en") }); await openGoals(page, "goals"); await settle(page);
  ok((await count(page, '[data-section="goal-card"]')) === 2, "two goal cards");
  const need = await text(page, '[data-section="goal-need"]');
  ok(/Save 150\.00/.test(need) && /8 monthly savings/.test(need) && /1st of each month/.test(need), "Trip (1,200 left, 8 month-starts) says: Save 150.00 a month, 8 monthly savings, counted on the 1st", need);
  ok(/Set a target date/.test(need), "Laptop (no date) asks for a date and invents no amount", need);
  ok(/not an automatic transfer/i.test(need), "says it is a plan, not an automatic transfer", need);
  ok((await count(page, ".goal-milestones")) === 0 && !/What-if scenarios/.test(await bodyText(page)), "the milestone tiles and the fixed what-if rows are gone");
  const closed = await page.evaluate(() => [...document.querySelectorAll(".goal-scenario")].every((x) => !x.open));
  ok(closed && (await count(page, ".goal-scenario")) === 2, "the what-if is a collapsed, optional block on each goal", closed);
  await page.evaluate(() => { document.querySelector(".goal-scenario").open = true; }); await wait(100);
  const type = async (v) => { await page.evaluate((v) => { const el = document.querySelector(".goal-scenario input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v); await wait(120); };
  await type("100"); let out = await text(page, ".goal-scenario-out");
  ok(/12 months/.test(out) && /after the target date/i.test(out) && /estimate, not a guarantee/i.test(out), "100 a month: 12 months, after the target date, labelled an estimate", out);
  await type("150"); out = await text(page, ".goal-scenario-out");
  ok(/8 months/.test(out) && /reaches the target date/i.test(out), "150 a month: 8 months, reaches the target date", out);
  await type("0"); ok((await count(page, ".goal-scenario-out")) === 0, "0 gives no estimate");
  await type("-5"); ok((await count(page, ".goal-scenario-out")) === 0, "a negative amount gives no estimate");
  await type(""); ok((await count(page, ".goal-scenario-out")) === 0, "an empty field gives no estimate");
  await page.evaluate(() => document.querySelector('[aria-label="Hide amounts"]').click()); await wait(200);
  const hidden = await text(page, '[data-section="goal-need"]');
  ok(!/150\.00/.test(hidden), "privacy mode hides the required amount", hidden);
  await page.close();
}

section("R15-B4. The same sections and no missing translations in az and ru");
for (const lang of ["az", "ru"]) {
  const page = await openPage(browser, { seed: seed(lang) }); await settle(page);
  const home = await sections(page);
  ok(["home-safe", "home-month", "home-breakdown", "home-coach", "home-see-all"].every((x) => home.includes(x)) && (await count(page, ".goal-card")) === 0 && (await count(page, ".budget-item")) === 0, `${lang}: Home has the same sections and no goal or budget blocks`, home);
  await openGoals(page, "goals"); await settle(page);
  const need = await text(page, '[data-section="goal-need"]');
  ok(need.length > 20 && !/goals\.need|undefined|NaN|\{/.test(need) && /150[.,]00/.test(need), `${lang}: the required monthly amount renders with real text and 150.00`, need);
  ok(!/goals\.scenario|undefined|NaN/.test(await text(page, ".goal-scenario summary")), `${lang}: the what-if title is translated`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  ok(!overflow, `${lang}: no horizontal overflow on the Goals screen at 390 px`);
  await page.close();
}
await browser.close();
finish("e2e_run15");
