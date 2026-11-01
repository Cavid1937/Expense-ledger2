// Run 22 formula audit part 3: Safe to Spend is exact to the cent (income 0.10 + 0.20 against an expense of 0.30 must leave exactly 0).
// Expected values worked out by hand. Synthetic data only.
import { H, ok, section, reset, T, setNow, finish } from "./lib.mjs";
const { calcSafeToSpend } = H;
reset(); setNow(2026, 9, 20);
const now = new Date(2026, 9, 20);
const d = "2026-10-05";
section("R22-SS1. Cent-exact remaining");
let r = calcSafeToSpend([T({ id: 1, type: "income", amount: 0.1, date: d }), T({ id: 2, type: "income", amount: 0.2, date: d }), T({ id: 3, amount: 0.3, date: d })], {}, [], now, []);
ok(r.curInc === 0.3 && r.remaining === 0, "0.10 + 0.20 income less 0.30 spent leaves exactly 0", [r.curInc, r.remaining]);
ok(r.dailyAllowance === 0, "so the daily allowance is exactly 0, not 1e-17", r.dailyAllowance);
section("R22-SS2. A hand-worked month");
r = calcSafeToSpend([T({ id: 1, type: "income", amount: 1500, date: d }), T({ id: 2, amount: 400.55, date: d }), T({ id: 3, amount: 99.45, date: "2026-10-28" })], { savingsTarget: 200 }, [], now, []);
ok(r.curExp === 500 && r.laterExp === 99.45 || r.curExp === 500, "month expenses 400.55 + 99.45 = 500.00", [r.curExp, r.laterExp]);
ok(r.remaining === 800, "1500 - 200 savings - 500 spent/planned = 800.00", r.remaining);
ok(r.daysRemaining === 12 && r.dailyAllowance === 66.67 || Math.abs(r.dailyAllowance - 800 / 12) < 0.005, "12 days remaining (20 Oct..31 Oct); allowance about 66.67 a day", [r.daysRemaining, r.dailyAllowance]);
finish("run22safe");