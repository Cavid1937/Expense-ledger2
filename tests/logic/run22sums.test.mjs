// Run 22 formula audit part 2: totals are exact to the cent (floating-point drift confirmed before the fix: ten entries of 0.10 summed to
// 0.9999999999999999). Expected values worked out by hand. Synthetic data only.
import { H, ok, section, eq, reset, T, setNow, finish } from "./lib.mjs";
const { calcMonthSummary, calcCategorySpend, calcSpentToDate } = H;
reset(); setNow(2026, 9, 20);
const now = new Date(2026, 9, 20);
section("R22-S1. Ten entries of 0.10 are exactly 1.00");
const l = Array.from({ length: 10 }, (_, i) => T({ id: i + 1, amount: 0.1, date: "2026-10-05" }));
const s = calcMonthSummary(l, "2026-10", "2026-09", now);
ok(s.curExp === 1 && s.totalExp === 1, "month expenses are exactly 1", [s.curExp, s.totalExp]);
ok(calcCategorySpend(l, "2026-10", now).food === 1, "category total is exactly 1");
ok(calcSpentToDate(l, "2026-10", now) === 1, "spent to date is exactly 1");
section("R22-S2. Mixed amounts, income and later (planned) entries");
const m = [T({ id: 1, amount: 0.1 }), T({ id: 2, amount: 0.2 }), T({ id: 3, type: "income", amount: 1000.1, date: "2026-10-02" }), T({ id: 4, amount: 7.35, date: "2026-10-25" })].map((x, i) => (i === 3 ? x : { ...x, date: "2026-10-05" }));
const r = calcMonthSummary(m, "2026-10", "2026-09", now);
ok(r.curExp === 0.3, "0.1 + 0.2 = exactly 0.30 (entries up to today)", r.curExp);
ok(r.plannedExp === 7.35 && r.totalExp === 7.65, "later entry 7.35 is planned; month total 7.65", [r.plannedExp, r.totalExp]);
ok(r.curInc === 1000.1, "income 1000.10 is kept exactly", r.curInc);
ok(r.surplusRate === 100, "surplus rate (1000.10 - 0.30) / 1000.10 rounds to 100%", r.surplusRate);
finish("run22sums");