// Run 24: coach boundary cases. Expected values worked out by hand; they failed with the raw decimal arithmetic. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { calcCoach } = H;
reset();
const now = new Date(2026, 9, 31);   // 31 Oct 2026
const e = (date, amount, category = "food", type = "expense") => ({ id: date + amount + category + type, date, amount, category, type });

section("R24-CO1. Spent more than recorded income is never reported as exactly 100%");
const days = Array.from({ length: 18 }, (_, i) => e("2026-10-" + String(10 + i), 55.78));   // 18 x 55.78 = 1004.04
const r1 = calcCoach([e("2026-10-03", 1000, "salary", "income"), ...days], { debts: [], loans: [] }, now);
const over = r1.find((x) => x.id === "over");
ok(!!over && over.pct === 101, "1004.04 spent of 1000.00 income (100.4%) is 'over' and shown as 101%, not 100%", r1);
const r1b = calcCoach([e("2026-10-03", 1004.04, "salary", "income"), ...days], { debts: [], loans: [] }, now);
const kept = r1b.find((x) => x.id === "spent");
ok(!!kept && kept.pct === 100 && kept.kept === 0, "exactly equal to income is 'spent', 100%, kept 0%", r1b);

section("R24-CO2. A category rising to exactly 50% above its 3-month average is reported");
// Jul 39.90, Aug 40.10, Sep 40.00: sum 120.00, average 40.00; October 60.00 is exactly 1.5 x and exactly 20.00 above.
const hist = [e("2026-07-10", 39.9), e("2026-08-10", 40.1), e("2026-09-10", 40), e("2026-10-10", 60)];
const r2 = calcCoach(hist, { debts: [], loans: [] }, now);
const up = r2.find((x) => x.id === "catUp");
ok(!!up && up.cat === "food" && up.pct === 50, "food +50% is reported at the exact boundary (60.00 vs average 40.00)", r2);
const below = calcCoach([e("2026-07-10", 39.9), e("2026-08-10", 40.1), e("2026-09-10", 40), e("2026-10-10", 59.99)], { debts: [], loans: [] }, now);
ok(!below.some((x) => x.id === "catUp"), "59.99 is just below the boundary: nothing is reported", below);
const smallDiff = calcCoach([e("2026-07-10", 10), e("2026-08-10", 10), e("2026-09-10", 10), e("2026-10-10", 29.99)], { debts: [], loans: [] }, now);
ok(!smallDiff.some((x) => x.id === "catUp"), "a 200% rise that is under 20.00 in money is too small to mention");
finish("run24coach");
