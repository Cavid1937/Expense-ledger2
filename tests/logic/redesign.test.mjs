// Redesign (2026-10-27): the new figures shown on Home (spending ring) and Analytics (spending trend). Expected values are
// worked out by hand below, not taken from the app.
import { H, ok, section, eq, setNow, reset, finish } from "./lib.mjs";
const { pctShares, donutSlices, cumulativeByDay, greetingKey, calcMonthSummary, calcCategorySpend } = H;
const ex = (date, amount, category = "food", o = {}) => ({ id: Math.random(), type: "expense", amount, category, date, ...o });

section("1. Ring percentages always add up to 100");
ok(eq(pctShares([1, 1, 1]), [34, 33, 33]), "three equal parts → 34 / 33 / 33 (largest remainder; ties go to the first)", pctShares([1, 1, 1]));
ok(eq(pctShares([50, 25, 25]), [50, 25, 25]), "exact shares stay exact", pctShares([50, 25, 25]));
ok(eq(pctShares([0.01, 999.99]), [0, 100]), "a tiny part rounds to 0, the total is still 100", pctShares([0.01, 999.99]));
ok(eq(pctShares([]), []) && eq(pctShares([0, 0]), []), "nothing spent → no percentages (no division by zero)");
const many = [123.45, 67.8, 9.99, 250, 31, 0.6, 77.77]; const ps = pctShares(many);
ok(ps.reduce((s, x) => s + x, 0) === 100 && ps.every((x) => Number.isInteger(x) && x >= 0), "seven uneven amounts → whole numbers summing to exactly 100", ps);

section("2. Ring slices: five largest categories, the rest combined");
const cs = { food: 300, transport: 200, shopping: 100, health: 50, edu: 30, travel: 15, gifts: 5 };
const sl = donutSlices(cs);
ok(sl.length === 6 && eq(sl.slice(0, 5).map((s) => s.id), ["food", "transport", "shopping", "health", "edu"]) && sl[5].id === "_rest" && sl[5].amt === 20, "7 categories → 5 largest in order + 'all other' = 15 + 5", sl.map((s) => [s.id, s.amt]));
ok(sl.reduce((s, x) => s + x.amt, 0) === 700 && sl.reduce((s, x) => s + x.pct, 0) === 100, "slices keep the whole total (700) and their percentages add to 100", sl.map((s) => s.pct));
ok(donutSlices({ food: 10, transport: 0 }).length === 1, "a category with 0 is not drawn");
ok(donutSlices({}).length === 0, "no spending → no slices (the ring is not shown)");

section("3. Spending trend: a running total that ends at the month's 'Spent' figure");
setNow(2026, 9, 15);
const txns = [ex("2026-10-01", 10), ex("2026-10-01", 5.5), ex("2026-10-03", 20), ex("2026-10-15", 4.5), ex("2026-10-20", 100), // 20th is later this month
  { id: 1, type: "income", amount: 2000, category: "salary", date: "2026-10-01" }, ex("2026-09-30", 7), ex("2026-09-02", 3)];
const c = cumulativeByDay(txns, "2026-10");
ok(c.length === 31 && c[0] === 15.5 && c[1] === 15.5 && c[2] === 35.5 && c[14] === 40 && c[15] === null && c[30] === null,
  "Oct (today 15th): day1 15.50, day2 15.50, day3 35.50, day15 40.00, days after today empty; income and the 20th's planned 100 not counted", { d1: c[0], d3: c[2], d15: c[14], d16: c[15] });
const ms = calcMonthSummary(txns, "2026-10", "2026-09");
ok(c[14] === ms.curExp, "the trend's last point equals the month's 'Spent' figure (40.00)", { trend: c[14], spent: ms.curExp });
const p = cumulativeByDay(txns, "2026-09");
ok(p.length === 30 && p[0] === 0 && p[1] === 3 && p[29] === 10 && p.every((v) => v !== null), "a past month (Sep) has all 30 days; ends at 10.00");
ok(cumulativeByDay(txns, "2026-11").every((v) => v === null), "a future month has no points");
const cents = cumulativeByDay([ex("2026-10-01", 0.1), ex("2026-10-01", 0.2), ex("2026-10-02", 0.7)], "2026-10");
ok(cents[0] === 0.3 && cents[1] === 1, "cents add up exactly (0.1 + 0.2 = 0.30, + 0.7 = 1.00 — no 0.30000000000000004)", cents.slice(0, 2));
const ring = donutSlices(calcCategorySpend(txns, "2026-10"));
ok(ring.reduce((s, x) => s + x.amt, 0) === ms.curExp, "the ring's slices add up to the same 'Spent' figure");

section("4. Greeting by time of day");
const g = (h) => greetingKey(new Date(2026, 9, 15, h, 0));
ok(g(4) === "home.greet.evening" && g(5) === "home.greet.morning" && g(11) === "home.greet.morning" && g(12) === "home.greet.afternoon" && g(17) === "home.greet.afternoon" && g(18) === "home.greet.evening",
  "04:00 evening, 05:00–11:59 morning, 12:00–17:59 afternoon, 18:00 evening");
reset();
finish("redesign");
