// Run 88 (owner: "when user selects any date range ... app must tell them their statistics during that range"). Synthetic entries only;
// every expected figure worked out by hand.
import { H, ok, section, finish, eq, setNow } from "./lib.mjs";
const { rangeStats, rangePreset } = H;
// a refund counts only once its day has come, so "today" is fixed after it
setNow(2026, 10, 15);
const e = (id, date, amount, category = "food", type = "expense", extra = {}) => ({ id, date, amount, category, type, subcategory: "", merchant: "", note: "", ...extra });
const list = [
  e("e1", "2026-11-02", 10), e("e2", "2026-11-10", 5.5), e("e3", "2026-10-30", 100),
  e("i1", "2026-11-05", 500, "salary", "income"), e("i2", "2026-11-06", 40, "transferin", "income"), e("i3", "2026-11-07", 3, "refund", "income"),
];

section("R88-R1. Totals for a chosen range");
const a = rangeStats(list, "2026-11-01", "2026-11-14");
ok(a.spent === 15.5, "spent 10.00 + 5.50 = 15.50 (the 100.00 on 30 Oct is outside)", a);
ok(a.earned === 500 && a.other === 43, "earned 500.00 (salary); other money in 40.00 transfer + 3.00 refund = 43.00, kept apart", a);
ok(a.net === 527.5 && a.days === 14 && a.perDay === 1.11, "left over 543.00 - 15.50 = 527.50; 14 days; 15.50 / 14 = 1.107 -> 1.11 a day", a);
const b = rangeStats([...list, e("r1", "2026-11-12", 2, "refund", "income", { refundFor: "food" })], "2026-11-01", "2026-11-14");
ok(b.spent === 13.5, "a 2.00 refund for food lowers the food spending it refunds: 15.50 - 2.00 = 13.50 (the app's own rule)", b);
const c = rangeStats(list, "2026-11-03", "");
ok(c.spent === 5.5 && c.days === 0 && c.perDay === 0, "an open end: from 3 Nov on, 5.50 spent; no day count", c);
ok(eq(rangeStats([], "2026-11-01", "2026-11-14"), { spent: 0, earned: 0, other: 0, net: 0, days: 14, perDay: 0 }), "nothing in the range gives zeros, not an error");

section("R88-R2. Ready-made ranges (today: Sunday 15 Nov 2026)");
const now = new Date(2026, 10, 15, 12, 0);
ok(eq(rangePreset("week", now), { from: "2026-11-09", to: "2026-11-15" }), "this week starts on Monday 9 Nov");
ok(eq(rangePreset("month", now), { from: "2026-11-01", to: "2026-11-15" }) && eq(rangePreset("lastMonth", now), { from: "2026-10-01", to: "2026-10-31" }), "this month to today; last month whole");
ok(eq(rangePreset("d30", now), { from: "2026-10-17", to: "2026-11-15" }) && eq(rangePreset("year", now), { from: "2026-01-01", to: "2026-11-15" }), "last 30 days counts today; this year from 1 Jan");
ok(eq(rangePreset("lastMonth", new Date(2026, 0, 10)), { from: "2025-12-01", to: "2025-12-31" }), "in January, last month is December of the year before");
finish("run88range");
