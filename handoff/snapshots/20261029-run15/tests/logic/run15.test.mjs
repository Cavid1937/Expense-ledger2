// Run 15 (2026-10-29): ONE shared rule for "how much must I save per month to reach this goal by its deadline".
// Written BEFORE the function exists (test-first). Synthetic data only; every expected value is worked out by hand.
// Rule (documented default, owner may change it): one contribution on the 1st of each month. The periods are the month-starts
// strictly after today, up to and including the deadline month; if none is left (deadline later this month or today) it is 1.
// So periods = max(1, whole months between today's month and the deadline month). Money is computed in whole cents (integers)
// and rounded UP so periods x amount is never short of the remaining amount.
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { goalRequiredMonthly, goalScenario, calcHelperCards, fmt } = H;
reset();
const D = (y, m, d, h = 12) => new Date(y, m - 1, d, h);   // local date, month 1-12
const G = (o) => ({ id: "g", name: "Goal", target: 1500, saved: 300, monthlyTarget: 0, targetDate: null, ...o });

section("R15-1. The function exists and is the only place that does this arithmetic");
ok(typeof goalRequiredMonthly === "function", "goalRequiredMonthly is defined in App.jsx");
ok(typeof goalScenario === "function", "goalScenario (the optional what-if) is defined in App.jsx");
if (typeof goalRequiredMonthly !== "function") { console.log("  (remaining checks skipped: the function does not exist yet)"); finish("run15"); }

section("R15-2. Reference cases, worked by hand");
// Today 29 Oct 2026. Month-starts after today: 1 Nov, 1 Dec, 1 Jan, 1 Feb, 1 Mar, 1 Apr, 1 May, 1 Jun => 8 up to 1 Jun 2027.
let r = goalRequiredMonthly(G({ targetDate: "2027-06-01" }), D(2026, 10, 29));
ok(r.state === "active" && r.remaining === 1200 && r.periods === 8 && r.perMonth === 150, "Trip: 1,500 - 300 = 1,200 over 8 month-starts (1 Nov ... 1 Jun) = 150.00 per month", r);
r = goalRequiredMonthly(G({ target: 2000, saved: 600, targetDate: "2027-06-30" }), D(2026, 10, 29));
ok(r.periods === 8 && r.perMonth === 175 && r.remaining === 1400, "the assignment's reference: 2,000 - 600 = 1,400 over 8 periods = 175.00 (deadline 30 Jun: the 1 Jun start still counts)", r);
r = goalRequiredMonthly(G({ target: 2400, saved: 600, targetDate: "2027-07-15" }), D(2026, 10, 29));
ok(r.periods === 9 && r.perMonth === 200, "Laptop: 1,800 over 9 (1 Nov ... 1 Jul) = 200.00", r);

section("R15-3. Date boundaries (frozen dates, no wall clock)");
r = goalRequiredMonthly(G({ targetDate: "2026-10-31" }), D(2026, 10, 13));
ok(r.state === "active" && r.periods === 1 && r.thisMonth === true && r.perMonth === 1200, "deadline later this month: 1 period, the whole remainder, flagged thisMonth", r);
r = goalRequiredMonthly(G({ targetDate: "2026-10-13" }), D(2026, 10, 13, 23));
ok(r.state === "active" && r.periods === 1 && r.perMonth === 1200, "deadline today (even at 23:00): still reachable, 1 period", r);
r = goalRequiredMonthly(G({ targetDate: "2026-10-12" }), D(2026, 10, 13, 0));
ok(r.state === "overdue" && r.perMonth === null && r.remaining === 1200, "deadline yesterday: overdue, no ordinary monthly amount, remaining kept", r);
r = goalRequiredMonthly(G({ targetDate: "2027-02-28" }), D(2027, 1, 31));
ok(r.periods === 1 && r.perMonth === 1200, "31 Jan -> 28 Feb: only 1 Feb is a month-start in range = 1 period", r);
r = goalRequiredMonthly(G({ targetDate: "2027-03-01" }), D(2027, 1, 31));
ok(r.periods === 2, "31 Jan -> 1 Mar: 1 Feb and 1 Mar = 2 periods", r);
r = goalRequiredMonthly(G({ targetDate: "2028-03-01" }), D(2028, 2, 29));
ok(r.periods === 1, "leap day 29 Feb 2028 -> 1 Mar 2028: 1 period", r);
r = goalRequiredMonthly(G({ targetDate: "2028-02-29" }), D(2028, 2, 29));
ok(r.state === "active" && r.periods === 1, "deadline is the leap day itself and today", r);
r = goalRequiredMonthly(G({ targetDate: "2027-01-15" }), D(2026, 12, 15));
ok(r.periods === 1, "year boundary: 15 Dec -> 15 Jan = 1 Jan only = 1 period", r);
r = goalRequiredMonthly(G({ targetDate: "2027-12-31" }), D(2026, 12, 31, 23));
ok(r.periods === 12 && r.perMonth === 100, "31 Dec 2026 23:00 -> 31 Dec 2027: 12 month-starts (1 Jan ... 1 Dec) = 100.00", r);

section("R15-4. Missing, invalid, complete");
r = goalRequiredMonthly(G({ targetDate: null }), D(2026, 10, 13));
ok(r.state === "noDate" && r.perMonth === null && r.remaining === 1200, "no deadline: asks for a date, invents no amount", r);
for (const bad of ["", "2026-02-30", "2026-13-01", "soon", 20261013, {}]) {
  r = goalRequiredMonthly(G({ targetDate: bad }), D(2026, 10, 13));
  ok(r.state === "noDate" && r.perMonth === null && !JSON.stringify(r).includes("NaN"), `invalid date ${JSON.stringify(bad)} behaves like no date, no NaN`, r);
}
for (const bad of [0, -5, "abc", NaN, null, undefined, Infinity]) {
  r = goalRequiredMonthly(G({ target: bad, targetDate: "2027-06-01" }), D(2026, 10, 13));
  ok(r.state === "invalid" && r.perMonth === null && r.remaining === 0 && !JSON.stringify(r).includes("NaN"), `target ${String(bad)}: invalid, no figure, no NaN`, r);
}
r = goalRequiredMonthly(G({ saved: 1500, targetDate: "2027-06-01" }), D(2026, 10, 13));
ok(r.state === "complete" && r.perMonth === 0 && r.remaining === 0, "saved = target: complete, 0 per month", r);
r = goalRequiredMonthly(G({ saved: 2000, targetDate: "2025-01-01" }), D(2026, 10, 13));
ok(r.state === "complete" && r.perMonth === 0 && r.remaining === 0, "saved above target with a passed date: complete, never overdue, never negative", r);
r = goalRequiredMonthly(G({ saved: "x", targetDate: "2027-06-01" }), D(2026, 10, 13));
ok(r.remaining === 1500 && r.state === "active", "malformed saved counts as 0", r);

section("R15-5. Rounding is in whole cents and always up");
r = goalRequiredMonthly(G({ target: 100, saved: 0, targetDate: "2027-01-01" }), D(2026, 10, 13));   // 1 Nov, 1 Dec, 1 Jan = 3
ok(r.periods === 3 && r.perMonth === 33.34 && r.perMonth * 3 >= 100, "100 over 3 = 33.333... rounds UP to 33.34 (3 x 33.34 = 100.02, never short)", r);
r = goalRequiredMonthly(G({ target: 0.08, saved: 0, targetDate: "2027-06-01" }), D(2026, 10, 29));
ok(r.periods === 8 && r.perMonth === 0.01, "8 cents over 8 periods = 0.01", r);
r = goalRequiredMonthly(G({ target: 0.09, saved: 0, targetDate: "2027-06-01" }), D(2026, 10, 29));
ok(r.perMonth === 0.02, "9 cents over 8 periods = 1.125 cents rounds UP to 0.02", r);
r = goalRequiredMonthly(G({ target: 1.1, saved: 0.1, targetDate: "2026-10-31" }), D(2026, 10, 13));
ok(r.perMonth === 1, "binary drift: 1.1 - 0.1 is 1.0000000000000002 in floating point; the answer is 1.00, not 1.01", r);
r = goalRequiredMonthly(G({ target: 10000000, saved: 0, targetDate: "2036-10-01" }), D(2026, 10, 13));
ok(r.periods === 120 && r.perMonth === 83333.34, "large target: 10,000,000 over 120 = 83,333.333... -> 83,333.34", r);

section("R15-6. The optional what-if is user-controlled and uses the same periods");
let s = goalScenario(G({ targetDate: "2027-06-01" }), 150, D(2026, 10, 29));
ok(s.valid && s.months === 8 && s.meetsDeadline === true, "150 per month: 1,200 / 150 = 8 payments, meets a deadline with 8 periods", s);
s = goalScenario(G({ targetDate: "2027-06-01" }), 149.99, D(2026, 10, 29));
ok(s.months === 9 && s.meetsDeadline === false, "149.99 per month: 8.0005 -> 9 payments, misses by one", s);
s = goalScenario(G({ targetDate: "2027-06-01" }), 100, D(2026, 10, 29));
ok(s.months === 12 && s.meetsDeadline === false && /October 2027/.test(s.completion), "100 per month: 12 payments, finishes October 2027 (12th month-start = 1 Oct 2027), after the deadline", s);
s = goalScenario(G({ targetDate: "2027-06-01" }), 5000, D(2026, 10, 29));
ok(s.months === 1 && s.meetsDeadline === true, "an amount above the remainder: 1 payment", s);
s = goalScenario(G({ targetDate: null }), 100, D(2026, 10, 29));
ok(s.valid && s.months === 12 && s.meetsDeadline === null, "no deadline: estimate only, no comparison", s);
for (const bad of [0, -1, "abc", NaN, null, undefined, Infinity]) {
  s = goalScenario(G({ targetDate: "2027-06-01" }), bad, D(2026, 10, 29));
  ok(s.valid === false && !JSON.stringify(s).includes("NaN"), `scenario amount ${String(bad)} is rejected, no NaN`, s);
}
s = goalScenario(G({ saved: 1500 }), 100, D(2026, 10, 29));
ok(s.valid === false && s.reason === "complete", "a complete goal needs no scenario", s);

section("R15-7. One rule everywhere: the user's own plan, the required amount and the Home alert cannot disagree");
const { calcGoalProgress } = H;
const NOW29 = new Date(2026, 9, 29, 12);
// Trip: 1,200 left, deadline 1 Jun 2027 = 8 month-starts => the required amount is exactly 150.00.
// The old projection counted "8 months from today" = 29 Jun 2027 and called a plan of exactly 150 "behind schedule".
let p = calcGoalProgress(G({ monthlyTarget: 150, targetDate: "2027-06-01" }), NOW29);
ok(p.behindSchedule === false && p.onTrack === true && p.monthsNeeded === 8, "saving exactly the required 150.00 a month is ON TRACK (8 payments, the 8th on 1 Jun 2027)", p);
p = calcGoalProgress(G({ monthlyTarget: 149.99, targetDate: "2027-06-01" }), NOW29);
ok(p.behindSchedule === true && p.monthsNeeded === 9, "149.99 a month needs a 9th payment (1 Jul 2027) and is behind", p);
p = calcGoalProgress(G({ monthlyTarget: 100, targetDate: "2027-06-01" }), NOW29);
ok(p.behindSchedule === true && /October 2027/.test(p.estCompletion), "100 a month: 12 payments, the 12th on 1 Oct 2027, behind", p);
// The Home coach raises a short alert only; it must not repeat the amounts that the Goals tab shows.
globalThis.__NOW = NOW29.getTime();
const behind = G({ id: "gb", name: "Bike", target: 1200, saved: 200, monthlyTarget: 100, targetDate: "2027-05-01" });
const over = G({ id: "go", name: "Camera", target: 500, saved: 100, monthlyTarget: 50, targetDate: "2026-09-01" });
const cards = calcHelperCards([], {}, [behind, over], { enabled: false, savingsTarget: 0 }, "₼", []);
const cb = cards.find((c) => c.id === "goal-gb"), co = cards.find((c) => c.id === "goal-go");
ok(!!cb && /Bike/.test(cb.text) && !/\d/.test(cb.text + cb.impact.replace("Open Goals", "")), "behind goal: a short alert naming the goal, no amount or date repeated", cb);
ok(!!co && /Camera/.test(co.text) && !/\d/.test(co.text + co.impact), "overdue goal: a short alert, no amount or date repeated", co);
ok(cards.filter((c) => /^goal-/.test(c.id)).length === 2, "one alert per goal that needs attention, none for a goal on track", cards.map((c) => c.id));
const ontrack = calcHelperCards([], {}, [G({ id: "gt", target: 1200, saved: 200, monthlyTarget: 150, targetDate: "2027-05-01" })], { enabled: false, savingsTarget: 0 }, "₼", []);
ok(!ontrack.some((c) => c.id === "goal-gt"), "a goal whose own plan meets the deadline raises no alert (150 x 7 payments = 1,050 >= 1,000)", ontrack.map((c) => c.id));

finish("run15");
