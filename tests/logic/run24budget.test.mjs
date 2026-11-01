// Run 24: budget warning when a new expense crosses 80% or 100% of its category's monthly limit. Expected values worked out by hand.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { budgetCrossing } = H;
reset();
const e = (date, amount, category = "food", type = "expense") => ({ id: date + amount + category, date, amount, category, type });
const B = { food: 100 };
const now = new Date(2026, 9, 31);   // 31 Oct 2026

section("R24-B1. Crossing 80% and 100%");
const base = [e("2026-10-01", 70)];
let r = budgetCrossing(base, [...base, e("2026-10-02", 10)], B, e("2026-10-02", 10), now);
ok(r && r.kind === "near" && r.pct === 80, "70 + 10 = 80 of 100 -> 'near' at exactly 80%", r);
r = budgetCrossing(base, [...base, e("2026-10-02", 9.99)], B, e("2026-10-02", 9.99), now);
ok(r === null, "79.99 of 100 is still quiet", r);
const near = [e("2026-10-01", 85)];
r = budgetCrossing(near, [...near, e("2026-10-02", 15)], B, e("2026-10-02", 15), now);
ok(r === null, "exactly 100.00 of 100 is not 'over' (limit not exceeded) and was already past 80%", r);
r = budgetCrossing(near, [...near, e("2026-10-02", 15.01)], B, e("2026-10-02", 15.01), now);
ok(r && r.kind === "over" && r.pct === 100, "100.01 of 100 -> 'over'", r);

section("R24-B2. Only the crossing is reported, and only the right entries");
const over = [e("2026-10-01", 120)];
ok(budgetCrossing(over, [...over, e("2026-10-02", 5)], B, e("2026-10-02", 5), now) === null, "already over: next entry stays quiet");
ok(budgetCrossing(base, [...base, e("2026-10-02", 50, "transport")], B, e("2026-10-02", 50, "transport"), now) === null, "a category without a budget is quiet");
ok(budgetCrossing(base, [...base, e("2026-10-02", 50, "food", "income")], B, e("2026-10-02", 50, "food", "income"), now) === null, "income never warns");
r = budgetCrossing(base, [...base, e("2026-09-02", 90)], B, e("2026-09-02", 90), now);
ok(r && r.kind === "near" && r.pct === 90, "a September entry is judged against September only (90 of 100), not October's 70", r);
section("R24-B3. Cents and junk");
const t10 = Array.from({ length: 9 }, (_, i) => e("2026-10-0" + (i + 1), 0.1));
r = budgetCrossing(t10, [...t10, e("2026-10-10", 0.1)], { food: 1 }, e("2026-10-10", 0.1), now);
ok(r === null, "ten x 0.10 = exactly 1.00 of 1.00 is not over (no float error)", r);
ok(budgetCrossing(null, null, null, null, now) === null && budgetCrossing([], [], B, e("bad", 5), now) === null, "junk input is quiet");
finish("run24budget");
