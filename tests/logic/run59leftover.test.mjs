// Run 59 (owner-approved 12 Nov, NEXT_WORK_PLAN "APPROVED: month-end leftover, exact definitions"): "not spent" per month and since the
// start, per-budget carry of unused budget (off by default, capped, never overspending), and the backup preferences. Expected values are
// worked out by hand below. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { notSpentMonth, notSpentHistory, budgetCarried, cleanBudgetCarry, calcBudgetStatus, calcCategorySpend, cleanPrefs } = H;
reset();
let n = 0;
const E = (date, amount, o = {}) => ({ id: ++n, type: "expense", amount, category: "food", subcategory: "", merchant: "", note: "", date, recurring: false, recurFreq: null, isActive: true, ...o });
const I = (date, amount, category, o = {}) => E(date, amount, { type: "income", category, ...o });
const NOW = new Date(2026, 10, 13, 12, 0, 0);   // 13 Nov 2026

section("R59-1. Money not spent in a month: in minus out, each thing counted once and in the right place");
const list = [
  E("2026-07-15", 10),                                                     // July: out 10, in 0 -> -10
  // August: nothing -> 0
  I("2026-09-05", 1000, "salary"), E("2026-09-10", 300),                   // September: 1000 - 300 = 700
  I("2026-10-05", 1000, "salary"),                                         // October in: 1000
  I("2026-10-06", 200, "savout"),                                          //   money taken from savings: NOT income
  E("2026-10-07", 400), I("2026-10-08", 50, "refund", { refundFor: "food" }),   //   food 400 lowered by its refund 50 -> 350
  E("2026-10-10", 600, { category: "shopping", spread: 6 }),               //   a cost spread over 6 months counts 600 once, in October
  E("2026-10-12", 100, { category: "shopping", reimb: { amt: 40, who: "A" } }), //   own share only: 60
  E("2026-10-14", 150, { category: "finance", loan: { interest: 20 } }),  //   loan instalment: only the interest 20 is spending
  E("2026-10-15", 70, { category: "finance", debtLink: { debtId: "d_1", paymentId: "p_1" } }),   // debt repayment: left out of every spending view
  I("2026-10-16", 30, "refund"),                                           //   a refund not tied to a category lowers spending by 30
  // October out = 350 + 600 + 60 + 20 - 30 = 1000 -> net 0
  I("2026-11-05", 500, "salary"), E("2026-11-10", 100), E("2026-11-20", 50),   // November so far: 500 - 100 = 400 (the 20th has not come yet)
];
const oct = notSpentMonth(list, "2026-10", NOW);
ok(oct.in === 1000 && oct.out === 1000 && oct.net === 0, "October: in 1000 (salary only), out 350 + 600 + 60 + 20 - 30 = 1000, not spent 0", oct);
const sep = notSpentMonth(list, "2026-09", NOW), nov = notSpentMonth(list, "2026-11", NOW);
ok(sep.net === 700 && nov.in === 500 && nov.out === 100 && nov.net === 400, "September 700; November so far 400 (an expense dated later this month is not counted yet)", { sep, nov });
const hst = notSpentHistory(list, NOW);
ok(eq(hst.months.map((r) => [r.mon, r.net]), [["2026-07", -10], ["2026-08", 0], ["2026-09", 700], ["2026-10", 0]]), "running total rows: every finished month from the first entry (July) to last month; an empty August is 0; an overspent July is negative", hst.months.map((r) => [r.mon, r.net]));
ok(hst.total === 690 && hst.current.net === 400 && hst.last.mon === "2026-10", "total = -10 + 0 + 700 + 0 = 690; the unfinished month is kept apart (400)", { total: hst.total, current: hst.current.net });
ok(hst.months.every((r) => { const m = notSpentMonth(list, r.mon, NOW); return m.net === r.net && m.in === r.in && m.out === r.out; }), "each row of the running total equals the month line for that month (one rule)");
const dec = notSpentHistory([I("2025-12-20", 300, "salary"), E("2025-12-21", 100), E("2026-01-02", 50)], new Date(2026, 1, 3));
ok(eq(dec.months.map((r) => [r.mon, r.net]), [["2025-12", 200], ["2026-01", -50]]) && dec.total === 150, "December to January: 200 then -50, total 150", dec.months);
ok(notSpentHistory([], NOW).months.length === 0 && notSpentHistory([E("2026-11-01", 5)], NOW).months.length === 0, "no entries, or entries only this month: no finished month, nothing to total");
ok(JSON.stringify(notSpentHistory(list, NOW)) === JSON.stringify(hst), "budgets play no part: the figure depends only on the entries (same result every time)");

section("R59-2. Carrying unused budget: off by default, only the unused part, capped at one limit, overspending never carried");
const sp = [E("2026-09-08", 250), E("2026-10-08", 380), E("2025-12-10", 20, { category: "health" })];
const budgets = { food: 300, transport: 100, health: 50 };
ok(eq(budgetCarried(sp, budgets, {}, "2026-11", NOW), {}), "nothing is carried unless turned on");
const c = budgetCarried(sp, budgets, { food: "2026-09", transport: "2026-09" }, "2026-11", NOW);
// food: Sep 300 - 250 = 50 into October; October limit 350, spent 380 (overspent) -> 0 into November.
// transport: Sep unused 100 -> 100 into October; October limit 200, unused 200 -> capped at 100 into November.
ok(c.food === 0 && c.transport === 100, "food: overspent in October, so November starts at the plain 300 (no debt carried); transport: capped at one month's limit (100, not 200)", c);
ok(budgetCarried(sp, budgets, { food: "2026-09" }, "2026-10", NOW).food === 50, "food into October: the 50 not used in September");
ok(budgetCarried(sp, budgets, { health: "2025-12" }, "2026-01", new Date(2026, 0, 10)).health === 30, "December to January: 50 - 20 = 30 carried");
ok(budgetCarried(sp, budgets, { food: "2026-11" }, "2026-11", NOW).food === 0, "turned on this month: nothing carried yet (only from next month)");
ok(budgetCarried(sp, { food: 0 }, { food: "2026-09" }, "2026-11", NOW).food === undefined, "a budget without a limit carries nothing");
const st = calcBudgetStatus(budgets, calcCategorySpend(sp, "2026-11", NOW), "2026-11", NOW, c);
const tr = st.find((x) => x.catId === "transport"), fd = st.find((x) => x.catId === "food");
ok(tr.limit === 200 && tr.base === 100 && tr.carried === 100 && fd.limit === 300 && fd.carried === 0, "this month's limit = own limit + carried: transport 100 + 100 = 200; food 300", { tr, fd });
ok(eq(calcBudgetStatus(budgets, {}, "2026-11", NOW).map((x) => x.limit), [300, 100, 50]), "without carry the limits are exactly the budgets, as before");

section("R59-3. Saved choices and old backups");
ok(eq(cleanBudgetCarry({ food: "2026-09", u_abc1: "2026-10", bad: "x", "2X": "2026-01", other: "2026-13" }), { food: "2026-09", u_abc1: "2026-10" }), "only a category id with a real month is kept");
ok(eq(cleanPrefs({ budgetCarry: { food: "2026-09" }, leftoverGoal: true }), { budgetCarry: { food: "2026-09" }, leftoverGoal: true }), "the backup's preferences carry the choices");
const old = cleanPrefs({ theme: "nordic" });
ok(!("budgetCarry" in old) && !("leftoverGoal" in old), "an older backup without them: carrying and the goal offer stay off");
ok(eq(cleanPrefs({ leftoverGoal: "yes", budgetCarry: [] }), {}), "anything but a plain true / a proper map is ignored");
finish("run59leftover");
