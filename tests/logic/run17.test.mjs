// Run 17 (2026-10-30): (a) the month-end forecast and (b) the profile name. Written BEFORE the code (test-first).
// Forecast = spent so far + entries already dated later this month + bills still unpaid + days left x the usual daily spend.
// "Usual daily spend" = the 28 days ending yesterday, without bills/recurring entries (they are counted on their own) and without
// unusually large single purchases (more than 5x the median purchase). Needs at least 7 days of history.
// The range (+/- one standard deviation of the daily totals x sqrt(days left)) is shown only when the same method, run on earlier
// months as of their 10th day, would have contained the real total in at least 2 of 3 months (and at least 2 months were testable).
// Every expected value is worked out by hand in the comments. Harness clock: 13 Oct 2026, 12:00 (18 days left after today).
import { H, ok, section, eq, setNow, reset, T, finish } from "./lib.mjs";
const { calcMonthEndForecast, cleanProfileName, PROFILE_NAME_MAX } = H;
reset();
let uid = 9000; const id = () => ++uid;
const NOW = () => new Date(globalThis.__NOW);
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = (y, m, d) => dstr(new Date(y, m - 1, d));
const X = (date, amount, o = {}) => T({ id: id(), date, amount, ...o });
const steady = (fromY, fromM, fromD, toY, toM, toD, amt = 10) => { const out = []; for (let d = new Date(fromY, fromM - 1, fromD); d <= new Date(toY, toM - 1, toD); d.setDate(d.getDate() + 1)) out.push(X(dstr(d), amt)); return out; };
const near = (a, b) => Math.abs(a - b) < 0.006;

section("R17-F1. The function exists");
ok(typeof calcMonthEndForecast === "function", "calcMonthEndForecast is defined");
if (typeof calcMonthEndForecast !== "function") { console.log("  (remaining forecast checks skipped: not written yet)"); }
else {
  section("R17-F2. Steady spending: 10 a day for 28 days (15 Sep to 12 Oct)");
  // spent so far: 1-12 Oct = 12 days x 10 = 120. usual daily = 280 / 28 = 10, no variation. 120 + 18 x 10 = 300.
  let f = calcMonthEndForecast(steady(2026, 9, 15, 2026, 10, 12), [], NOW());
  ok(f.available && near(f.spentSoFar, 120) && near(f.usualDaily, 10) && f.daysLeft === 18 && near(f.point, 300), "120 spent + 18 days x 10 = 300", f);
  ok(near(f.plannedLater, 0) && near(f.commitments, 0), "nothing planned and no bills");
  ok(f.rangeShown === false, "only 28 days of history: no earlier month can be tested, so no range is shown", f.backtest);

  section("R17-F3. A large one-off early in the month does not inflate the forecast");
  // The old method: 820 / 13 days x 31 = 1955.38. Here: 700 on 3 Oct is more than 5x the median purchase (10), so it is not "usual".
  // spent so far = 12 x 10 + 700 = 820; usual daily = 280/28 = 10 (the 700 is left out); 820 + 180 = 1000.
  f = calcMonthEndForecast([...steady(2026, 9, 15, 2026, 10, 12), X("2026-10-03", 700)], [], NOW());
  ok(near(f.spentSoFar, 820) && near(f.usualDaily, 10) && near(f.point, 1000), "820 spent + 18 x 10 = 1000 (the old daily-average method gave 1955.38)", f);

  section("R17-F4. Entries already dated later this month count once");
  f = calcMonthEndForecast([...steady(2026, 9, 15, 2026, 10, 12), X("2026-10-20", 40)], [], NOW());
  ok(near(f.plannedLater, 40) && near(f.spentSoFar, 120) && near(f.point, 340), "40 dated 20 Oct: 120 + 40 + 180 = 340", f);

  section("R17-F5. A monthly bill not yet paid this month is added once, and is not part of the usual spend");
  // 'Internet' 25, recurring monthly, last paid 20 Sep, nothing in October yet: due 20 Oct (upcoming). 120 + 25 + 180 = 325.
  f = calcMonthEndForecast([...steady(2026, 9, 15, 2026, 10, 12), X("2026-09-20", 25, { recurring: true, recurFreq: "monthly", merchant: "Internet", category: "digital" })], [], NOW());
  ok(near(f.commitments, 25) && near(f.usualDaily, 10) && near(f.point, 325), "bill 25 added once; usual daily stays 10", f);
  // Once paid in October (dated 5 Oct) it is part of spent so far and no longer a commitment: 120 + 25 = 145 spent, 145 + 180 = 325.
  f = calcMonthEndForecast([...steady(2026, 9, 15, 2026, 10, 12), X("2026-09-20", 25, { recurring: true, recurFreq: "monthly", merchant: "Internet", category: "digital" }), X("2026-10-05", 25, { recurring: true, recurFreq: "monthly", merchant: "Internet", category: "digital" })], [], NOW());
  ok(near(f.commitments, 0) && near(f.spentSoFar, 145) && near(f.point, 325), "paid on 5 Oct: spent 145, no commitment left, same total 325", f);

  section("R17-F6. Not enough history says so instead of guessing");
  f = calcMonthEndForecast(steady(2026, 10, 10, 2026, 10, 12), [], NOW());
  ok(f.available === false && f.reason === "history", "3 days of history: not available (reason: history)", f);
  f = calcMonthEndForecast([], [], NOW());
  ok(f.available === false, "no entries at all: not available");
  f = calcMonthEndForecast(steady(2026, 10, 1, 2026, 10, 12), [], NOW());
  ok(f.available === true && near(f.usualDaily, 10), "12 days of history is enough (at least 7): usual daily = 120 / 12 = 10", f);

  section("R17-F7. Income and other months are ignored");
  f = calcMonthEndForecast([...steady(2026, 9, 15, 2026, 10, 12), X("2026-10-02", 5000, { type: "income", category: "salary" })], [], NOW());
  ok(near(f.point, 300), "a 5,000 salary changes nothing", f);

  section("R17-F8. Uneven days widen the range (alternating 20 and 0)");
  // 20 on every second day starting 15 Sep: 14 days of 20 in the 28-day window. Mean 10, population std dev 10.
  // Days with 20 in October: 1 Oct is day index 16 (even) ... 12 Oct is 27: indexes 16,18,20,22,24,26 = 6 days = 120 spent so far.
  // point = 120 + 18 x 10 = 300. half-range = 10 x sqrt(18) = 42.43 -> 257.57 to 342.43.
  const alt = []; for (let i = 0; i < 28; i++) if (i % 2 === 0) alt.push(X(dstr(new Date(2026, 8, 15 + i)), 20));
  f = calcMonthEndForecast(alt, [], NOW());
  ok(near(f.spentSoFar, 120) && near(f.usualDaily, 10) && near(f.point, 300) && near(f.low, 257.57) && near(f.high, 342.43), "300, range 257.57 to 342.43", f);

  section("R17-F9. The range is shown only when earlier months prove the method");
  // Steady 10 a day from 1 Jun to 12 Oct. As of day 10 of Sep, Aug and Jul the forecast is exactly the real total (300, 310, 300): 3 of 3.
  const steadyLong = steady(2026, 6, 1, 2026, 10, 12);
  f = calcMonthEndForecast(steadyLong, [], NOW());
  ok(f.backtest.months === 3 && f.backtest.hits === 3 && f.rangeShown === true && near(f.point, 300), "3 earlier months tested, 3 hits: range shown", f.backtest);
  // Add one 1,000 spree on 25 Aug and 25 Sep (never forecastable): Sep and Aug miss, Jul hits: 1 of 3 -> no range.
  f = calcMonthEndForecast([...steadyLong, X("2026-08-25", 1000), X("2026-09-25", 1000)], [], NOW());
  ok(f.backtest.months === 3 && f.backtest.hits === 1 && f.rangeShown === false && near(f.point, 300), "1 of 3 hits: only the single figure is shown, and the 1,000 sprees are not 'usual'", f.backtest);
  ok(f.low <= f.point && f.point <= f.high, "low and high still bracket the single figure; the screen shows them only when rangeShown is true");

  section("R17-F10. Last day of the month and rounding");
  setNow(2026, 9, 31);
  f = calcMonthEndForecast([...steady(2026, 10, 1, 2026, 10, 30, 10.005)], [], NOW());
  ok(f.daysLeft === 0 && near(f.point, f.spentSoFar) && Math.abs(f.point * 100 - Math.round(f.point * 100)) < 1e-6, "no days left: the forecast is what is spent; cents only", f.point);
  reset();
}

section("R17-P1. Profile name cleaning");
ok(typeof cleanProfileName === "function" && PROFILE_NAME_MAX === 30, "cleanProfileName exists and the limit is 30");
if (typeof cleanProfileName === "function") {
  ok(cleanProfileName("  Aysel   Məmmədova ") === "Aysel Məmmədova", "trims and collapses spaces");
  ok(cleanProfileName("a\u0000b\tc\nd") === "a b c d", "control characters become spaces");
  ok(cleanProfileName("x".repeat(80)).length === 30, "cut to 30 characters");
  ok(cleanProfileName("😀".repeat(40)) === "😀".repeat(30), "cut by characters, never in the middle of an emoji");
  ok(cleanProfileName(null) === "" && cleanProfileName(5) === "" && cleanProfileName(undefined) === "" && cleanProfileName({}) === "", "non-text becomes empty");
  ok(cleanProfileName("   ") === "", "only spaces becomes empty");
  const st = H.migrateAndLoad();
  ok(st && (st.profileName === "" || st.profileName === undefined), "a fresh install has no name");
  globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [], language: "en", profileName: "  Nigar  " }));
  ok(H.migrateAndLoad().profileName === "Nigar", "a saved name is read back cleaned");
  globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [], language: "en", profileName: 123 }));
  ok(H.migrateAndLoad().profileName === "", "a damaged saved name is ignored");
  globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [], language: "en" }));
  ok(H.migrateAndLoad().profileName === "", "data saved before this version has no name");
}
finish("run17");
