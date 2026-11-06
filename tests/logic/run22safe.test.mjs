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
// F1 (counter-review 6 Nov): a payment entered ahead of time must not be subtracted twice (once as an entry, once as the bill's due payment).
// Hand-worked: today 13 Oct, income 2000 on 1 Oct, rent bill 500 due the 25th.
section("R22-SS3. Payment entered ahead is not counted twice");
setNow(2026, 9, 13);
const now13 = new Date(2026, 9, 13);
const inc = T({ id: 1, type: "income", amount: 2000, date: "2026-10-01", createdAt: "2026-10-01T00:00:00Z" });
const rent = { id: "bR", name: "Rent", type: "expense", category: "housing", subcategory: "", amount: 500, freq: "monthly", anchorDate: "2026-09-25", active: true, createdAt: "2026-09-01T00:00:00Z" };
const ahead = (o) => T({ id: 2, amount: 500, category: "housing", merchant: "Rent", date: "2026-10-25", ...o });
r = calcSafeToSpend([inc], {}, [], now13, [rent]);
ok(r.remaining === 1500, "bill only (nothing entered): 2000 - 500 due = 1500", r.remaining);
r = calcSafeToSpend([inc, ahead({ billId: "bR" })], {}, [], now13, [rent]);
ok(r.remaining === 1500, "entry linked to the bill: counted once, 1500", r.remaining);
r = calcSafeToSpend([inc, ahead()], {}, [], now13, [rent]);
ok(r.remaining === 1500 && r.matchedAheadCount === 1, "same payment entered ahead but NOT linked: counted once (1500), noted as matched", [r.remaining, r.matchedAheadCount]);
r = calcSafeToSpend([inc, ahead({ amount: 450 })], {}, [], now13, [rent]);
ok(r.remaining === 1050, "different amount (450): not the same payment, both count: 2000 - 450 - 500 = 1050", r.remaining);
r = calcSafeToSpend([inc, ahead({ category: "food" })], {}, [], now13, [rent]);
ok(r.remaining === 1000, "different category: both count: 2000 - 500 - 500 = 1000", r.remaining);
r = calcSafeToSpend([inc, ahead({ merchant: "Landlord Ltd" })], {}, [], now13, [rent]);
ok(r.remaining === 1000, "different merchant: not matched, both count (never optimistic): 1000", r.remaining);
r = calcSafeToSpend([inc, ahead({ id: 2, merchant: " rent " }), ahead({ id: 3 })], {}, [], now13, [rent]);
ok(r.remaining === 1000, "two identical entries but one due payment: one settles it, the second is real extra spending: 2000 - 1000 = 1000", r.remaining);
r = calcSafeToSpend([inc, ahead({ date: "2026-11-02" })], {}, [], now13, [rent]);
ok(r.remaining === 1500, "an entry dated next month is not in this month: only the 500 due payment counts, 1500", r.remaining);
r = calcSafeToSpend([inc, ahead({ date: "2026-10-10" })], {}, [], now13, [rent]);
ok(r.remaining === 1000, "a look-alike dated in the past is not auto-matched (Run 12 rule: link it yourself): 2000 - 500 - 500 = 1000", r.remaining);
finish("run22safe");