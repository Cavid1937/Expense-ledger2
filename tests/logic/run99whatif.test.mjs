// Run 99: "What if I buy something?" (whatIfSpend). A hypothetical on a figure the app already shows; nothing is saved.
// Every expected figure is worked out by hand in the comment beside it.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { whatIfSpend } = H;
reset();
const near = (a, b) => Math.abs(a - b) < 1e-9;
section("R99-Q1. On Safe to Spend (divides as that card does)");
{
  // 300.00 left, 15 days, buy 60.00 -> 240.00; 300/15 = 20.00 a day before, 240/15 = 16.00 after
  const r = whatIfSpend(60, "safe", 300, 15);
  ok(r.ok && r.before === 300 && r.after === 240 && r.covers === true && r.short === 0 && r.perDayBefore === 20 && r.perDayAfter === 16 && r.days === 15, "300 - 60 = 240; 20.00 a day becomes 16.00", r);
  // 100.00 left, 7 days, buy 33.33 -> 66.67; 66.67 / 7 = 9.524285...
  const q = whatIfSpend(33.33, "safe", 100, 7);
  ok(q.after === 66.67 && near(q.perDayAfter, 66.67 / 7) && near(q.perDayBefore, 100 / 7), "100 - 33.33 = 66.67; 9.52 a day (66.67 / 7)", q);
  // 0.30 - 0.10 = 0.20 exactly (no floating-point crumbs)
  ok(whatIfSpend(0.1, "safe", 0.3, 1).after === 0.2, "0.30 - 0.10 is exactly 0.20");
}
section("R99-Q2. On 'until your next income' (per day rounded down)");
{
  // 170.00 left, 3 days, buy 20.00 -> 150.00; before 17000/3 = 5666.6 -> 56.66; after 15000/3 = 50.00
  const r = whatIfSpend(20, "until", 170, 3);
  ok(r.ok && r.after === 150 && r.perDayBefore === 56.66 && r.perDayAfter === 50, "170 - 20 = 150; 56.66 a day becomes 50.00", r);
  // 100.00 left, 3 days, buy 0.01 -> 99.99; 9999/3 = 3333 -> 33.33
  ok(whatIfSpend(0.01, "until", 100, 3).perDayAfter === 33.33 && whatIfSpend(0.01, "until", 100, 3).after === 99.99, "99.99 over 3 days: 33.33 a day");
}
section("R99-Q3. More than what is left, exactly what is left, already short");
{
  // 50.00 left, buy 80.00 -> short by 30.00; no per-day figure
  const r = whatIfSpend(80, "safe", 50, 10);
  ok(r.ok && r.after === -30 && r.covers === false && r.short === 30 && r.perDayAfter === 0 && r.perDayBefore === 5, "50 - 80: short by 30.00, nothing per day", r);
  const e = whatIfSpend(50, "until", 50, 4);
  ok(e.after === 0 && e.covers === true && e.short === 0 && e.perDayAfter === 0, "exactly what is left: 0.00 left, covered, nothing per day", e);
  // already 10.00 short, buy 5.00 -> 15.00 short
  const n = whatIfSpend(5, "safe", -10, 6);
  ok(n.after === -15 && n.short === 15 && n.covers === false && n.perDayBefore === 0, "already short by 10: short by 15.00 after", n);
  ok(whatIfSpend(10, "until", 100, 0).perDayAfter === 0 && whatIfSpend(10, "until", 100, 0).days === 0 && whatIfSpend(10, "until", 100, 0).after === 90, "no days: the amount left is still given, no per-day figure");
}
section("R99-Q4. Not valid: no answer");
{
  const bad = [0, -5, NaN, "abc", null, undefined, 1e9, Infinity];
  ok(bad.every((a) => whatIfSpend(a, "safe", 100, 5).ok === false), "zero, negative, not a number, missing, absurdly large: no answer");
  ok(whatIfSpend(10, "other", 100, 5).ok === false && whatIfSpend(10, "safe", NaN, 5).ok === false && whatIfSpend(10, "safe", undefined, 5).ok === false, "unknown figure or no figure to work from: no answer");
  ok(whatIfSpend("12.50", "safe", 100, 5).after === 87.5, "an amount given as text is read: 100 - 12.50 = 87.50");
}
finish("run99whatif");
