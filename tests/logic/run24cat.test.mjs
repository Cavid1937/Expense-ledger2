// Run 24: one category's all-time total and per-month totals. Expected values are worked out by hand, not by the code. Synthetic data only.
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { catTotals } = H;
reset();
const e = (date, amount, category, type = "expense") => ({ id: date + amount + category, date, amount, category, type });

section("R24-K1. All-time and per-month totals, newest month first");
const list = [e("2026-10-31", 12.5, "food"), e("2026-10-02", 7.5, "food"), e("2026-09-15", 20, "food"), e("2026-10-05", 99, "transport"), e("2026-08-01", 0.1, "food")];
const r = catTotals(list, "food");
ok(r.total === 40.1 && r.n === 4, "food: 12.50 + 7.50 + 20.00 + 0.10 = 40.10 in 4 entries", r);
ok(r.months.length === 3 && r.months[0].month === "2026-10" && r.months[0].total === 20 && r.months[0].n === 2, "October: 12.50 + 7.50 = 20.00 (2 entries), listed first");
ok(r.months[1].month === "2026-09" && r.months[1].total === 20 && r.months[2].month === "2026-08" && r.months[2].total === 0.1, "September 20.00, then August 0.10");

section("R24-K2. Whole cents, other categories, bad input");
const tenth = Array.from({ length: 10 }, (_, i) => e("2026-10-" + String(i + 1).padStart(2, "0"), 0.1, "fun"));
ok(catTotals(tenth, "fun").total === 1 && catTotals(tenth, "fun").months[0].total === 1, "ten entries of 0.10 are exactly 1.00 (not 0.9999999999999999)");
ok(catTotals(list, "nothing").total === 0 && catTotals(list, "nothing").n === 0 && catTotals(list, "nothing").months.length === 0, "a category with no entries is empty");
ok(catTotals(null, "food").n === 0 && catTotals([null, { category: "food", amount: "x", date: "bad" }], "food").months.length === 0, "null list, junk entries and a bad date do not break it or invent a month");
section("R24-K3. Income categories work the same");
const inc = catTotals([e("2026-10-01", 1000, "salary", "income"), e("2026-09-01", 1000, "salary", "income")], "salary");
ok(inc.total === 2000 && inc.months.length === 2, "salary income: 2,000.00 over 2 months");
finish("run24cat");
