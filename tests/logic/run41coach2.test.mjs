// Run 41: coach facts "lifestyle" (income up, spending took the extra) and "incomeHill" (a much bigger income month). Hand-computed.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcCoach } = H;
reset();
const NOW = new Date(2026, 9, 20, 12); // 20 Oct 2026: completed months are Sep..Apr
const get = (r, id) => r.find((c) => c.id === id);
const MONTHS = ["2026-09", "2026-08", "2026-07", "2026-06", "2026-05", "2026-04"]; // newest first
const build = (inc, sp, skip = null) => MONTHS.flatMap((m, i) => (m === skip ? [] : [
  T({ id: "i" + i, type: "income", category: "salary", amount: inc[i], date: m + "-01" }),
  T({ id: "e" + i, type: "expense", category: "food", amount: sp[i], date: m + "-10" })]));

section("R41-L. Lifestyle");
let c = get(calcCoach(build([1150, 1150, 1150, 1000, 1000, 1000], [690, 690, 690, 600, 600, 600]), null, NOW), "lifestyle");
ok(!!c && c.inc === 15 && c.spend === 15 && c.share === 60, "income +15%, spending +15%: 270 of the extra 450 = 60%", c);
ok(!get(calcCoach(build([1150, 1150, 1150, 1000, 1000, 1000], [672, 672, 672, 600, 600, 600]), null, NOW), "lifestyle"), "spending took 48% of the extra: below half, no card");
c = get(calcCoach(build([1150, 1150, 1150, 1000, 1000, 1000], [675, 675, 675, 600, 600, 600]), null, NOW), "lifestyle");
ok(!!c && c.share === 50, "exactly half of the extra income counts", c);
ok(!get(calcCoach(build([1040, 1040, 1040, 1000, 1000, 1000], [900, 900, 900, 600, 600, 600]), null, NOW), "lifestyle"), "income up only 4%: no card");
ok(!get(calcCoach(build([1000, 1000, 1000, 1000, 1000, 1000], [900, 900, 900, 600, 600, 600]), null, NOW), "lifestyle"), "income flat: no card");
ok(!get(calcCoach(build([1150, 1150, 1150, 1000, 1000, 1000], [500, 500, 500, 600, 600, 600]), null, NOW), "lifestyle"), "spending fell: no card");
ok(!get(calcCoach(build([1150, 1150, 1150, 1000, 1000, 1000], [690, 690, 690, 600, 600, 600], "2026-05"), null, NOW), "lifestyle"), "a month with no entries: no card");

section("R41-H. Income hill");
c = get(calcCoach(build([1500, 1000, 1000, 1000, 1000, 1000], [10, 10, 10, 10, 10, 10]), null, NOW), "incomeHill");
ok(!!c && c.pct === 50, "1500 against an average of 1000 = +50%", c);
ok(!get(calcCoach(build([1499, 1000, 1000, 1000, 1000, 1000], [10, 10, 10, 10, 10, 10]), null, NOW), "incomeHill"), "+49.9%: no card");
const few = [T({ id: "a", type: "income", category: "salary", amount: 1000, date: "2026-07-01" }), T({ id: "b", type: "income", category: "salary", amount: 1000, date: "2026-08-01" }), T({ id: "c", type: "income", category: "salary", amount: 3000, date: "2026-09-01" })];
ok(!get(calcCoach(few, null, NOW), "incomeHill"), "only two earlier months: no card");
const gift = build([1000, 1000, 1000, 1000, 1000, 1000], [10, 10, 10, 10, 10, 10]);
gift.push(T({ id: "g", type: "income", category: "refund", amount: 5000, date: "2026-09-05" }));
ok(!get(calcCoach(gift, null, NOW), "incomeHill"), "a refund is not earned income: no card");
finish();
