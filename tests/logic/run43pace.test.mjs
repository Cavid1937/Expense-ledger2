// Run 43: "at your usual pace this may run out around day N". Expected values are worked out by hand. Synthetic data only.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcRunOutDay } = H;
reset();
const now = new Date(2026, 9, 20, 12, 0, 0);   // 20 October 2026; days remaining including today = 12 (20..31)
const ds = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const days = [];   // 22 Sep .. 19 Oct = the 28 days before today, 10 spent on each
for (let i = 28; i >= 1; i--) days.push(ds(new Date(2026, 9, 20 - i)));
const steady = days.map((d, i) => T({ id: 100 + i, type: "expense", category: "food", amount: 10, date: d }));

section("R43P-1. The estimate");
// usual daily spend = 10; 50 left -> covers 5 days -> money gone around day 20 + 5 = 25
let r = calcRunOutDay(steady, [], 50, 12, now);
ok(r.show && r.day === 25 && r.usualDaily === 10 && r.cover === 5, "50 left at 10 a day: around day 25", r);
r = calcRunOutDay(steady, [], 99, 12, now);
ok(r.show && r.day === 29, "99 left: covers 9.9 days, around day 29", r);
r = calcRunOutDay(steady, [], 100, 12, now);
ok(!r.show, "100 left covers 10 of the 12 days: within 2 days of the month end, so no warning", r);
r = calcRunOutDay(steady, [], 150, 12, now);
ok(!r.show, "150 left covers more than the month: nothing shown");

section("R43P-2. When nothing is shown");
ok(!calcRunOutDay(steady, [], 0, 12, now).show && !calcRunOutDay(steady, [], -20, 12, now).show, "no money left or already over: this line stays quiet (the card already says so)");
ok(!calcRunOutDay(steady, [], 50, 0, now).show, "no days remaining: nothing");
ok(!calcRunOutDay(steady, [], 50, 12, new Date(2026, 9, 3, 12)).show, "before the 5th of the month: too early to say");
ok(!calcRunOutDay(steady.slice(-3), [], 50, 12, now).show, "only 3 days of history: not enough to estimate");
ok(!calcRunOutDay([], [], 50, 12, now).show && !calcRunOutDay(null, null, 50, 12, now).show && !calcRunOutDay(steady, [], NaN, 12, now).show, "empty list, null input and NaN do not fail and show nothing");

section("R43P-3. One big purchase or a bill does not make a scare");
const big = T({ id: 900, type: "expense", category: "shopping", amount: 400, date: "2026-10-01" });
const rent = T({ id: 901, type: "expense", category: "bills", amount: 500, date: "2026-10-02", recurring: true, recurFreq: "monthly" });
r = calcRunOutDay([...steady, big, rent], [], 50, 12, now);
ok(r.show && r.day === 25 && r.usualDaily === 10, "a 400 purchase (over 5x the typical purchase) and a recurring 500 are left out of the usual pace: still 10 a day, day 25", r);

finish("run43pace");
