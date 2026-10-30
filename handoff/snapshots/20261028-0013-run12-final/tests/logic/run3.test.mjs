// Run 3 (2026-10-27): ChatGPT Review Run 2 R3 / Run 1 R2: actual-to-date vs future-dated entries, and small-sample claims.
// Today is Tue 13 Oct 2026 throughout (unless set otherwise). Expected values are worked out by hand in the comments.
// Metric meanings (decided in Run 3, see the report):
//   "spent / income this month" (Home, Analytics, Monthly, budgets, insights) = what happened up to today; entries dated later
//   this month are PLANNED and shown separately. Past months = the whole month. A future month = everything is planned.
//   Safe to Spend keeps counting expenses entered ahead of time (they are money already committed) — unchanged.
import { H, ok, section, setNow, reset, T, finish } from "./lib.mjs";
const { calcMonthSummary, calcCategorySpend, calcTxnStats, calcPatterns, calcSafeToSpend, calcWhatChanged, calcBudgetStatus } = H;
let uid = 9000; const id = () => ++uid;
const X = (date, amount, o = {}) => T({ id: id(), date, amount, ...o });
const INC = (date, amount) => T({ id: id(), type: "income", category: "salary", amount, date });
const NOW = () => new Date(globalThis.__NOW);

section("F1. Month totals: actual to date vs planned later this month");
reset();
const oct = [X("2026-10-05", 20), X("2026-10-28", 670, { category: "housing", merchant: "Landlord" }), INC("2026-10-02", 2000), INC("2026-10-25", 300)];
let s = calcMonthSummary(oct, "2026-10", "2026-09", NOW());
ok(s.curExp === 20 && s.plannedExp === 670 && s.totalExp === 690, "spent this month = 20 (to date); 670 dated 28 Oct is planned; whole month 690", s);
ok(s.curInc === 2000 && s.plannedInc === 300 && s.totalInc === 2300, "income = 2000 received; 300 dated 25 Oct is expected later", s);
ok(s.surplusRate === 99, "surplus rate uses what happened: (2000−20)/2000 = 99%", s.surplusRate);
s = calcMonthSummary([X("2026-09-28", 100), X("2026-09-03", 5)], "2026-09", "2026-08", NOW());
ok(s.curExp === 105 && s.plannedExp === 0, "a past month counts the whole month (105), nothing planned", s);
s = calcMonthSummary([X("2026-11-04", 40)], "2026-11", "2026-10", NOW());
ok(s.curExp === 0 && s.plannedExp === 40, "a future month: nothing has happened yet (0), 40 planned", s);
s = calcMonthSummary([X("2026-10-13", 7)], "2026-10", "2026-09", NOW());
ok(s.curExp === 7 && s.plannedExp === 0, "an entry dated today counts as happened", s);

section("F2. Category spend, budgets and statistics follow 'to date'");
const cat = calcCategorySpend(oct, "2026-10", NOW());
ok(cat.food === 20 && !cat.housing, "category spend this month: food 20; housing 670 (dated 28 Oct) not yet spent", cat);
const b = calcBudgetStatus({ housing: 500 }, cat, "2026-10", NOW());
ok(b[0].spent === 0 && !b[0].over, "a housing budget of 500 is not 'over' on 13 Oct because of a payment dated 28 Oct", b[0]);
ok(calcTxnStats(oct, "2026-10", NOW()).count === 1, "transaction count this month = 1 (the future-dated one is not counted)");
ok(calcCategorySpend([X("2026-09-28", 100, { category: "housing" })], "2026-09", NOW()).housing === 100, "a past month's category spend is unchanged");

section("F3. Safe to Spend still treats an expense entered ahead of time as committed money (unchanged)");
const with670 = calcSafeToSpend(oct, { savingsTarget: 0 }, [], NOW()), without = calcSafeToSpend(oct.filter((t) => t.amount !== 670), { savingsTarget: 0 }, [], NOW());
ok(with670.curExp === 690 && Math.abs(with670.remaining - (without.remaining - 670)) < 1e-9, "the 670 dated 28 Oct still reduces Safe to Spend by 670", { with: with670.remaining, without: without.remaining });

section("F4. Insights and 'what changed' use only what has happened");
const five = [1, 2, 5, 6, 7].map((d) => X(`2026-10-0${d}`, 10, { merchant: "Cafe" }));
let p = calcPatterns([...five, X("2026-10-28", 670, { category: "housing", merchant: "Landlord" })], "₼", NOW());
ok(!p.insights.some((i) => /670|93%|Landlord/.test(i.text)) && p.insights.some((i) => i.id === "catconc" && /100%/.test(i.text)),
  "concentration is about money actually spent: food 100%, not 'housing 93%' from a payment dated 28 Oct", p.insights.map((i) => i.text));
const hist = Array.from({ length: 10 }, (_, i) => X(`2026-08-${String(i + 1).padStart(2, "0")}`, 10));
p = calcPatterns([...hist, X("2026-10-01", 10), X("2026-10-02", 10), X("2026-10-03", 10), X("2026-10-04", 10), X("2026-10-28", 100)], "₼", NOW());
ok(p.anomalies.length === 0, "a large expense dated 28 Oct is not reported as an 'unusual transaction this month' on 13 Oct", p.anomalies);
p = calcPatterns([...hist, X("2026-10-01", 10), X("2026-10-02", 10), X("2026-10-03", 10), X("2026-10-04", 10), X("2026-10-12", 100)], "₼", NOW());
ok(p.anomalies.length === 1 && p.anomalies[0].amount === 100, "…the same expense dated 12 Oct (already happened) is reported", p.anomalies);
const wc = calcWhatChanged([X("2026-09-10", 50, { merchant: "Shop" }), X("2026-10-28", 300, { merchant: "Planned" })], "2026-10", "2026-09", NOW());
ok(!JSON.stringify(wc).includes("Planned"), "'what changed vs last month' does not list a merchant whose only entry is dated 28 Oct", wc.merchantChanges);

section("F5. Small samples: a one-month spike is a fact, not a trend");
const monthly = (vals) => vals.map((v, i) => X(`2026-0${4 + i}-15`, v));
p = calcPatterns([...monthly([100, 100, 100, 100, 100, 500]), ...[2, 3, 4, 5, 6].map((d) => X(`2026-10-0${d}`, 3))], "₼", NOW());
let tr = p.insights.find((i) => i.id === "trend-food");
ok(tr && /\+400%/.test(tr.text) && !/over recent months/i.test(tr.text), "100,100,100,100,100 then 500: states '+400% last month' but does not claim a trend 'over recent months'", tr && tr.text);
p = calcPatterns([...monthly([100, 130, 160, 200, 250, 320]), ...[2, 3, 4, 5, 6].map((d) => X(`2026-10-0${d}`, 3))], "₼", NOW());
tr = p.insights.find((i) => i.id === "trend-food");
ok(tr && /over recent months/i.test(tr.text) && /\+28%/.test(tr.text), "a steady rise 100→320 over six months is still described as increasing over recent months (+28% last month)", tr && tr.text);
p = calcPatterns([...monthly([500, 100, 100, 100, 100, 100]), ...[2, 3, 4, 5, 6].map((d) => X(`2026-10-0${d}`, 3))], "₼", NOW());
ok(!p.insights.some((i) => i.id === "trend-food"), "one old spike (500 then 100s) with no change last month → no trend claim", p.insights.map((i) => i.text));
// Concentration and same-day claims (reviewed, kept): concentration states a share of money actually spent — one large purchase
// genuinely is that share, so it is a fact, not a pattern. Same-day pairs already need ≥ 8 spending days and the pair on ≥ 3 days.
const oneDay = [1, 1, 1, 2, 2, 2, 3, 3].map((d, i) => X(`2026-10-0${d}`, 5, { category: i % 2 ? "transport" : "food" }));
p = calcPatterns(oneDay, "₼", NOW());
ok(!p.insights.some((i) => i.id === "same-day"), "food and transport together on only 3 days (of 3 spending days) → no 'often on the same day' claim", p.insights.map((i) => i.text));
finish("run3");
