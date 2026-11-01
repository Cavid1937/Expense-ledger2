// Run 5 (2026-10-27): ChatGPT Review Run 4 R2 — the meaning of a future-dated expense, proved as a before/after pair.
// Rule (decided in Run 3, kept by both reviews): "spent" and every actuals-based figure = what happened up to today;
// Safe to Spend also subtracts expenses the user has already entered for later this month (committed money), and the card
// says how much of its "Recorded expenses" is dated later (laterExp), so it is not mistaken for money already spent.
// Today is Tue 13 Oct 2026. Expected values are worked out by hand in the comments.
import { H, ok, section, setNow, reset, T, finish } from "./lib.mjs";
const { calcMonthSummary, calcCategorySpend, calcTxnStats, calcPatterns, calcSafeToSpend, calcSpentToDate, calcWhatChanged } = H;
let uid = 52000; const id = () => ++uid;
const X = (date, amount, o = {}) => T({ id: id(), date, amount, ...o });
const INC = (date, amount) => T({ id: id(), type: "income", category: "salary", amount, date });
const NOW = () => new Date(globalThis.__NOW);
const close = (a, b) => Math.abs(a - b) < 1e-9;

reset(); setNow(2026, 9, 13);
// Base month: income 2000 on 2 Oct; food 10 on five past days (50) and one transport 40 on 9 Oct → spent to date 90.
const base = [INC("2026-10-02", 2000), ...[1, 2, 5, 6, 7].map((d) => X(`2026-10-0${d}`, 10, { merchant: "Cafe" })), X("2026-10-09", 40, { category: "transport", merchant: "Taxi" }),
  X("2026-09-10", 30, { merchant: "Shop" })];
const later = X("2026-10-20", 300, { category: "housing", merchant: "Landlord" });   // dated 20 Oct (later this month)
const today = X("2026-10-13", 300, { category: "housing", merchant: "Landlord" });   // control: dated today
const snap = (txns) => ({
  m: calcMonthSummary(txns, "2026-10", "2026-09", NOW()), cat: calcCategorySpend(txns, "2026-10", NOW()), stats: calcTxnStats(txns, "2026-10", NOW()),
  spent: calcSpentToDate(txns, "2026-10", NOW()), pat: calcPatterns(txns, "₼", NOW()), wc: calcWhatChanged(txns, "2026-10", "2026-09", NOW()),
  safe: calcSafeToSpend(txns, { savingsTarget: 0 }, [], NOW()),
});
const B = snap(base), L = snap([...base, later]), D = snap([...base, today]);

section("R5-1. Base month (hand-worked)");
ok(B.m.curExp === 90 && B.m.plannedExp === 0 && B.safe.curExp === 90 && close(B.safe.remaining, 1910) && B.safe.laterExp === 0,
  "spent to date 90; nothing dated later; Safe to Spend = 2000 − 90 = 1,910", { m: B.m, remaining: B.safe.remaining, laterExp: B.safe.laterExp });

section("R5-2. Adding 300 dated 20 Oct: planned, committed — not spent");
ok(L.m.curExp === 90 && L.m.plannedExp === 300 && L.m.totalExp === 390, "month summary: spent to date stays 90; planned later rises by 300; whole month 390", L.m);
ok(JSON.stringify(L.cat) === JSON.stringify(B.cat) && !L.cat.housing, "category spend to date unchanged (no housing yet)", L.cat);
ok(L.stats.count === B.stats.count, "transaction count to date unchanged", { before: B.stats.count, after: L.stats.count });
ok(JSON.stringify(L.spent) === JSON.stringify(B.spent), "calcSpentToDate unchanged", { before: B.spent, after: L.spent });
ok(JSON.stringify(L.pat) === JSON.stringify(B.pat), "insights, anomalies and patterns are identical with and without the later-dated entry");
ok(JSON.stringify(L.wc) === JSON.stringify(B.wc), "'what changed vs last month' identical with and without it");
ok(L.safe.curExp === 390 && close(L.safe.remaining, B.safe.remaining - 300), "Safe to Spend: Recorded expenses 390; discretionary remaining 1,910 → 1,610 (the commitment is set aside)", { curExp: L.safe.curExp, remaining: L.safe.remaining });
ok(L.safe.laterExp === 300, "Safe to Spend reports that 300 of the 390 is dated later this month (shown on the card as 'set aside, not spent yet')", L.safe.laterExp);

section("R5-3. Control: the same 300 dated today has happened");
ok(D.m.curExp === 390 && D.m.plannedExp === 0, "month summary: spent to date 90 → 390; nothing planned", D.m);
ok(D.cat.housing === 300 && D.stats.count === B.stats.count + 1, "category spend now has housing 300; count +1", D.cat);
ok(D.safe.curExp === 390 && close(D.safe.remaining, L.safe.remaining) && D.safe.laterExp === 0,
  "Safe to Spend is the same 1,610 whether the 300 is dated today or later; only the 'dated later' part differs (0 here)", { remaining: D.safe.remaining, laterExp: D.safe.laterExp });

section("R5-4. A recurring bill is set aside exactly once, recorded ahead or not");
// Monthly rent 500 on the 20th, recorded for 20 Sep. Case A: October's not yet entered → it is an upcoming commitment.
// Case B: October's already entered for 20 Oct → it is a recorded (later-dated) expense and NOT also an upcoming one.
const rent = (date) => X(date, 500, { category: "housing", merchant: "Rent Co", recurring: true, recurFreq: "monthly" });
const A = calcSafeToSpend([...base, rent("2026-09-20")], { savingsTarget: 0 }, [], NOW());
const Bc = calcSafeToSpend([...base, rent("2026-09-20"), rent("2026-10-20")], { savingsTarget: 0 }, [], NOW());
ok(A.futureCommitments === 500 && A.curExp === 90 && A.laterExp === 0, "not yet entered: 500 counted once as an upcoming payment", { fc: A.futureCommitments, curExp: A.curExp });
ok(Bc.futureCommitments === 0 && Bc.curExp === 590 && Bc.laterExp === 500, "entered ahead for 20 Oct: 500 counted once as a recorded expense dated later, not again as upcoming", { fc: Bc.futureCommitments, curExp: Bc.curExp, laterExp: Bc.laterExp });
ok(close(A.remaining, Bc.remaining) && close(A.remaining, 1410), "either way Safe to Spend = 2000 − 90 − 500 = 1,410", { A: A.remaining, B: Bc.remaining });

section("R5-5. Later-dated income is still not counted (Run 3 rule unchanged)");
const I = calcSafeToSpend([...base, INC("2026-10-25", 1000)], { savingsTarget: 0 }, [], NOW());
ok(I.curInc === 2000 && I.expectedInc === 1000 && close(I.remaining, B.safe.remaining), "1000 dated 25 Oct is 'expected', and Safe to Spend stays 1,910", { curInc: I.curInc, expectedInc: I.expectedInc, remaining: I.remaining });
finish("run5");
