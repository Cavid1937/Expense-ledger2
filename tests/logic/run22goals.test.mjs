// Run 22 formula audit part 4: goals, expected values worked out by hand (today = 20 Oct 2026; one payment on the 1st of each month).
import { H, ok, section, reset, setNow, finish } from "./lib.mjs";
const { calcGoalProgress, goalRequiredMonthly } = H;
reset(); setNow(2026, 9, 20);
const now = new Date(2026, 9, 20);
section("R22-G1. Months needed (rounded up, in whole cents)");
let g = calcGoalProgress({ target: 1000, saved: 100, monthlyTarget: 300 }, now);
ok(g.monthsNeeded === 3 && g.remaining === 900 && g.pct === 10, "900 left at 300 a month = 3 payments (1 Nov, 1 Dec, 1 Jan); 10% done", [g.monthsNeeded, g.remaining, g.pct]);
ok(g.estDate.getFullYear() === 2027 && g.estDate.getMonth() === 0 && g.estDate.getDate() === 1, "estimated finish is the 1st of the month after the last payment: 1 Jan 2027", String(g.estDate));
g = calcGoalProgress({ target: 0.3, saved: 0, monthlyTarget: 0.1 }, now);
ok(g.monthsNeeded === 3, "0.30 at 0.10 a month is exactly 3, not 4 (floating-point trap 0.3/0.1 = 2.9999999999999996 or 3.0000000000000004)", g.monthsNeeded);
g = calcGoalProgress({ target: 500, saved: 500, monthlyTarget: 50 }, now);
ok(g.complete && g.remaining === 0 && g.pct === 100 && g.monthsNeeded === null, "a finished goal has nothing left and no months needed");
g = calcGoalProgress({ target: 500, saved: 800 }, now);
ok(g.pct === 100 && g.remaining === 0, "saving more than the target is capped at 100%");
section("R22-G2. Required monthly amount for a deadline");
let r = goalRequiredMonthly({ target: 1000, saved: 0, targetDate: "2027-01-31" }, now);
ok(r.periods === 3 && r.perMonth === 333.34, "1000 by Jan 2027: payments Nov, Dec, Jan = 3; 333.34 rounded UP so 3 x amount is never short", [r.periods, r.perMonth]);
finish("run22goals");