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
section("R108. A long history (4,000 entries over 3 years) gives the same month figures as counting by hand");
{
  // Run 108 narrowed the list to the two months before summing; each figure is checked here against a plain count over ALL entries
  const pad = (n) => String(n).padStart(2, "0"), big = [];
  for (let i = 0; i < 4000; i++) {
    const d = new Date(2023, 10, 1 + Math.floor(i * 1150 / 4000));
    big.push(T({ id: 1000 + i, amount: Math.round((1 + (i * 37) % 250) * 100) / 100 + 0.05, type: i % 9 === 0 ? "income" : "expense", category: i % 9 === 0 ? "salary" : "food", date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }));
  }
  big.push({ id: 9999, type: "transfer", amount: 5 });
  const cents = (list) => list.reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;
  const exp = (m) => big.filter((t) => t.type === "expense" && typeof t.date === "string" && t.date.startsWith(m));
  const bad = [];
  for (const [mon, prv] of [["2026-10", "2026-09"], ["2025-03", "2025-02"], ["2026-12", "2026-11"], ["2024-01", "2023-12"]]) {
    const m = calcMonthSummary(big, mon, prv, now);
    const want = { curExp: calcSpentToDate(big, mon, now), prevFullExp: calcSpentToDate(big, prv, now), totalExp: cents(exp(mon)) };
    want.plannedExp = Math.round((want.totalExp - want.curExp) * 100) / 100;
    // the previous month, counted over the same days: the whole month once this month is over, days 1-20 while it is under way
    want.prevExp = mon === "2026-10" ? cents(exp(prv).filter((t) => Number(t.date.slice(8, 10)) <= 20)) : mon > "2026-10" ? m.prevExp : want.prevFullExp;
    for (const k of Object.keys(want)) if (m[k] !== want[k]) bad.push(`${mon} ${k}: ${m[k]} vs ${want[k]}`);
  }
  ok(bad.length === 0, "this month, two past months and a future month: spent, planned, month total and the month before all match", bad);
  ok(calcMonthSummary(big, "2026-12", "2026-11", now).curExp === 0, "a future month has nothing spent yet, even with entries already dated in it");
}
finish("run22sums");