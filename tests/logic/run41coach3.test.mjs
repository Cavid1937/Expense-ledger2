// Run 41: coach facts "windfall" (a one-off income) and "monthLeft" (unspent income near month end). Hand-computed.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcCoach } = H;
reset();
const get = (r, id) => r.find((c) => c.id === id);
const inc = (id, amount, date, category = "salary", o = {}) => T({ id, type: "income", category, amount, date, ...o });
const ex = (id, amount, date) => T({ id, type: "expense", category: "food", amount, date });
const NOW = new Date(2026, 9, 20, 12);

section("R41-F1. Windfall");
let c = get(calcCoach([inc("a", 500, "2026-10-18", "giftin")], null, NOW), "windfall");
ok(!!c && c.amount === 50000 && c.cat === "giftin", "a gift of 500 two days ago", c);
c = get(calcCoach([inc("a", 100, "2026-10-18", "income"), inc("b", 300, "2026-10-19", "sales")], null, NOW), "windfall");
ok(!!c && c.amount === 30000 && c.cat === "sales", "the largest one is shown", c);
ok(!get(calcCoach([inc("a", 500, "2026-10-12", "giftin")], null, NOW), "windfall"), "8 days old: no card");
ok(get(calcCoach([inc("a", 500, "2026-10-13", "giftin")], null, NOW), "windfall"), "exactly 7 days old: shown");
ok(!get(calcCoach([inc("a", 500, "2026-10-18", "salary")], null, NOW), "windfall"), "salary is regular income: no card");
ok(!get(calcCoach([inc("a", 500, "2026-10-18", "giftin", { recurring: true, recurFreq: "monthly" })], null, NOW), "windfall"), "a recurring entry is not a surprise: no card");
ok(!get(calcCoach([inc("a", 500, "2026-10-18", "giftin", { billId: "b1" })], null, NOW), "windfall"), "tied to a bill: no card");
ok(!get(calcCoach([inc("a", 500, "2026-10-18", "refund")], null, NOW), "windfall"), "a refund is not a windfall");
ok(!get(calcCoach([inc("a", 500, "2026-10-25", "giftin")], null, NOW), "windfall"), "dated later: not received yet");

section("R41-F2. Month end");
const END = new Date(2026, 9, 29, 12);   // 29 Oct: 2 days before the end
const L = [inc("s", 2000, "2026-10-01"), ex("e", 1500, "2026-10-10")];
c = get(calcCoach(L, null, END), "monthLeft");
ok(!!c && c.amount === 50000, "2000 in, 1500 out near the end: 500 left", c);
ok(!get(calcCoach(L, null, new Date(2026, 9, 28, 12)), "monthLeft"), "28 Oct is 3 days before the end: not yet");
ok(!!get(calcCoach(L, null, new Date(2026, 9, 31, 12)), "monthLeft"), "31 Oct: shown");
ok(!get(calcCoach([inc("s", 2000, "2026-10-01"), ex("e", 1995.5, "2026-10-10")], null, END), "monthLeft"), "only 4.50 left: below 10, no card");
ok(!!get(calcCoach([inc("s", 2000, "2026-10-01"), ex("e", 1990, "2026-10-10")], null, END), "monthLeft"), "exactly 10 left: shown");
ok(!get(calcCoach([inc("s", 2000, "2026-10-01"), ex("e", 2500, "2026-10-10")], null, END), "monthLeft"), "overspent: no card");
ok(!get(calcCoach([inc("s", 2000, "2026-10-01", "refund"), ex("e", 100, "2026-10-10")], null, END), "monthLeft"), "a refund is not earned income: no card");
ok(!get(calcCoach([ex("e", 100, "2026-10-10")], null, END), "monthLeft"), "no income this month: no card");
finish();
