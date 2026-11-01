// Financial logic: recurring schedules, Safe to Spend, month-aware pace/budget, insights, goals, numeric stability.
// Every expected value below is worked out by hand (comments show the arithmetic), not copied from the code's output.
import { H, ok, section, eq, setNow, reset, T, finish } from "./lib.mjs";
const { buildSchedules, scheduleOccurrences, scheduleMonthStatus, scheduleNextDue, calcSafeToSpend, monthProgress, calcSpendingPace, calcBudgetStatus,
  calcSpentToDate, calcPatterns, calcGoalProgress, calcMonthSummary, fmt, localDateStr, addMonths, parseLocalDate } = H;
let uid = 5000; const id = () => ++uid;
const R = (o) => T({ id: id(), recurring: true, recurFreq: "monthly", category: "digital", amount: 15, ...o });
const X = (date, amount, o = {}) => T({ id: id(), date, amount, ...o });
const INC = (date = "2026-10-02", amount = 2000) => T({ id: id(), type: "income", category: "salary", amount, date });
const NOW = () => new Date(globalThis.__NOW);
const SC = { savingsTarget: 0 };

section("18. Recurring schedules (a schedule is one commitment; its occurrences are the dated payments)");
reset();
let sc = buildSchedules([R({ merchant: "Rent", category: "housing", amount: 450, date: "2026-08-03" }), R({ merchant: "Rent", category: "housing", amount: 450, date: "2026-09-03" }), R({ merchant: "Rent", category: "housing", amount: 450, date: "2026-10-03" })]);
ok(sc.length === 1 && sc[0].occurrences.length === 3 && sc[0].memberIds.length === 3 && sc[0].amount === 450, "rent recorded in 3 months = ONE schedule with 3 occurrences");
sc = buildSchedules([R({ merchant: "Utility", amount: 40, date: "2026-09-10" }), R({ merchant: "Utility", amount: 42, date: "2026-10-10" })]);
ok(sc.length === 1 && sc[0].amount === 42, "a bill whose amount changes stays one schedule; its amount is the latest (42)");
ok(buildSchedules([R({ merchant: "Netflix" }), R({ merchant: "Spotify" })]).length === 2, "same category/amount/frequency but different merchants = 2 schedules");
ok(buildSchedules([R({ merchant: " NETFLIX " }), R({ merchant: "netflix", date: "2026-10-05" })]).length === 1, "merchant matching ignores case and spacing");
ok(buildSchedules([R({ merchant: "Gym", recurFreq: "monthly" }), R({ merchant: "Gym", recurFreq: "weekly" })]).length === 2, "different frequency = different schedule");
ok(buildSchedules([R({ merchant: "Acme" }), R({ merchant: "Acme", type: "income", category: "salary" })]).length === 2, "income and expense are separate schedules");
ok(buildSchedules([R({ merchant: "", note: "", amount: 15 }), R({ merchant: "", note: "", amount: 20 })]).length === 2 && buildSchedules([R({ merchant: "", note: "", amount: 15 }), R({ merchant: "", note: "", amount: 15, date: "2026-10-05" })]).length === 1, "unnamed entries split by amount (two different bills never merge)");
ok(buildSchedules([T({ id: id() }), R({ merchant: "X", recurring: false }), R({ merchant: "Y", recurFreq: "daily" })]).length === 0, "non-recurring and invalid-frequency entries are not schedules");
sc = buildSchedules([R({ merchant: "A", isActive: false, date: "2026-09-01" }), R({ merchant: "A", isActive: false, date: "2026-10-01" })]);
ok(sc.length === 1 && sc[0].isActive === false, "paused (all members inactive) → schedule inactive");

section("19. Safe to Spend");
reset(); setNow(2026, 9, 13);                        // Tue 13 Oct 2026 — 31-day month, 19 days from today on (13…31)
let a = [INC(), R({ merchant: "Netflix", date: "2026-10-05" }), R({ merchant: "Spotify", date: "2026-09-20" })];
let r = calcSafeToSpend(a, SC, []);
ok(r.futureCommitments === 15 && r.upcomingCount === 1 && r.unrecordedCount === 0, "Netflix paid Oct 5; Spotify (anchor Sep 20) still due Oct 20 → 15 committed (was 0: one match hid the other)", [r.futureCommitments, r.upcomingCount]);
r = calcSafeToSpend([INC(), R({ merchant: "Utility", amount: 40, date: "2026-09-10" }), R({ merchant: "Utility", amount: 42, date: "2026-10-10" })], SC, []);
ok(r.futureCommitments === 0, "utility paid this month (42) → last month's 40 is NOT counted again (was 40)", r.futureCommitments);
const gym = (dates) => dates.map(d => R({ merchant: "Gym class", category: "health", amount: 10, recurFreq: "weekly", date: d }));
r = calcSafeToSpend([INC(), ...gym(["2026-10-06"])], SC, []);
ok(r.futureCommitments === 30 && r.upcomingCount === 3, "weekly 10 paid Oct 6 → Oct 13, 20, 27 still to come = 30", [r.futureCommitments, r.upcomingCount]);
r = calcSafeToSpend([INC(), ...gym(["2026-10-06", "2026-10-13"])], SC, []);
ok(r.futureCommitments === 20 && r.upcomingCount === 2, "…paid Oct 6 and 13 → Oct 20, 27 = 20");
r = calcSafeToSpend([INC(), R({ merchant: "Dog walk", amount: 20, recurFreq: "biweekly", date: "2026-10-01" })], SC, []);
ok(r.futureCommitments === 40, "biweekly 20 paid Oct 1 → Oct 15 and Oct 29 = 40", r.futureCommitments);
const rent = ["2026-08-03", "2026-09-03", "2026-10-03"].map(d => R({ merchant: "Rent", category: "housing", amount: 450, date: d }));
r = calcSafeToSpend([INC(), ...rent], SC, []);
ok(r.recurringMonthly === 450 && r.futureCommitments === 0, "rent ×3: typical monthly = 450 (was 1350); nothing still to come", [r.recurringMonthly, r.futureCommitments]);
r = calcSafeToSpend([INC(), R({ merchant: "Netflix", date: "2026-09-05", isActive: false }), R({ merchant: "Netflix", date: "2026-08-05", isActive: false })], SC, []);
ok(r.futureCommitments === 0 && r.scheduleCount === 0, "paused schedule contributes nothing");
r = calcSafeToSpend([INC(), R({ merchant: "Insurance", amount: 120, recurFreq: "yearly", date: "2025-10-20" })], SC, []);
ok(r.futureCommitments === 120, "yearly 120 anniversary Oct 20 → still due this month", r.futureCommitments);
r = calcSafeToSpend([INC(), R({ merchant: "Insurance", amount: 120, recurFreq: "yearly", date: "2025-11-20" })], SC, []);
ok(r.futureCommitments === 0, "yearly with a November anniversary → nothing in October");
r = calcSafeToSpend([INC(), R({ merchant: "Gym", amount: 35, date: "2026-09-05" })], SC, []);
ok(r.futureCommitments === 35 && r.unrecordedCount === 1 && r.upcomingCount === 0 && r.unrecordedCommitments === 35, "monthly gym last seen Sep 5, nothing in Oct → the missed Oct 5 payment is counted (never optimistic) and flagged as unrecorded");
r = calcSafeToSpend([INC(), R({ merchant: "Rent", category: "housing", amount: 450, date: "2026-10-25" })], SC, []);
ok(r.futureCommitments === 0 && r.curExp === 450, "a payment entered ahead of time (Oct 25) is recorded spend, not an extra commitment");
setNow(2026, 1, 10);
const jan31 = (extra = []) => [INC("2026-02-02"), R({ merchant: "Fee", amount: 12, date: "2026-01-31" }), ...extra];
r = calcSafeToSpend(jan31(), SC, []); ok(r.futureCommitments === 12, "monthly from Jan 31, today Feb 10 → expected Feb 28, still to come");
r = calcSafeToSpend(jan31([R({ merchant: "Fee", amount: 12, date: "2026-02-28" })]), SC, []); ok(r.futureCommitments === 0, "…and settled once Feb 28 is recorded");
setNow(2026, 9, 13);
r = calcSafeToSpend([INC(), R({ merchant: "A", amount: 15 }), R({ merchant: "B", amount: 15, category: "health", date: "2026-09-20" }), R({ merchant: "C", amount: 15, date: "2026-09-21" })].map((t, i) => i === 1 ? { ...t, date: "2026-09-20" } : t), SC, []);
ok(r.futureCommitments === 45 && r.scheduleCount === 3, "three different commitments of 15 each → 45 (not merged)", r.futureCommitments);
// identity: remaining = income − reserve − recorded spend − commitments, with hand-computed numbers
r = calcSafeToSpend([INC(), R({ merchant: "Netflix", date: "2026-10-05" }), R({ merchant: "Spotify", date: "2026-09-20" }), X("2026-10-08", 50)], { savingsTarget: 100 }, []);
ok(r.curExp === 65 && r.futureCommitments === 15 && r.remaining === 1820, "2000 − 100 − (15 + 50) − 15 = 1820", { exp: r.curExp, fut: r.futureCommitments, rem: r.remaining });
ok(r.daysRemaining === 19 && Math.abs(r.dailyAllowance - 1820 / 19) < 1e-9, "daily allowance = 1820 ÷ 19 days (Oct 13…31, today included)");
setNow(2026, 9, 31); r = calcSafeToSpend([INC(), X("2026-10-08", 50)], SC, []);
ok(r.daysRemaining === 1 && r.dailyAllowance === r.remaining, "last day of the month: allowance = everything remaining (not 0)");
setNow(2026, 9, 13);
ok(calcSafeToSpend([X("2026-10-08", 50)], SC, []).feasible === false, "no income recorded → not feasible (no figure is presented as safe)");
r = calcSafeToSpend([INC(), R({ merchant: "Employer", type: "income", category: "salary", amount: 2000, date: "2026-09-02" })], SC, []);
ok(r.futureCommitments === 0, "a recurring INCOME schedule is never subtracted as a commitment");
ok(calcSafeToSpend([INC()], SC, [{ target: 1000, saved: 0, monthlyTarget: 300 }]).effectiveSavingsTarget === 300 && calcSafeToSpend([INC()], { savingsTarget: 500 }, [{ target: 1000, saved: 0, monthlyTarget: 300 }]).effectiveSavingsTarget === 500, "reserve = larger of the savings floor and goal contributions");

section("20. Month-aware progress, pace and budgets");
const mp = (y, m, d, mon) => { setNow(y, m, d); return monthProgress(mon, NOW()); };
let p = mp(2026, 1, 14, "2026-02"); ok(p.totalDays === 28 && p.daysPassed === 14 && p.daysLeft === 14 && p.daysRemaining === 15 && p.state === "current", "Feb 2026 (28 days) on the 14th: 14 passed, 15 left incl. today");
p = mp(2028, 1, 29, "2028-02"); ok(p.totalDays === 29 && p.daysLeft === 0 && p.daysRemaining === 1, "Feb 2028 (leap, 29 days) on the 29th: today is the last day");
p = mp(2026, 3, 30, "2026-04"); ok(p.totalDays === 30 && p.daysRemaining === 1, "April (30 days) on the 30th");
p = mp(2026, 4, 1, "2026-04"); ok(p.state === "past" && p.daysPassed === 30 && p.daysRemaining === 0, "April on May 1 → past, fully elapsed");
p = mp(2026, 9, 31, "2026-10"); ok(p.totalDays === 31 && p.daysRemaining === 1, "Oct 31 → last day");
p = mp(2026, 11, 31, "2026-12"); ok(p.daysRemaining === 1 && monthProgress("2027-01", NOW()).state === "future" && monthProgress("2027-01", NOW()).daysRemaining === 31, "Dec 31: Dec has 1 day left, Jan 2027 is future with 31 days to come");
p = mp(2027, 0, 1, "2026-12"); ok(p.state === "past" && p.daysRemaining === 0, "year boundary: on Jan 1, December is past");
setNow(2026, 9, 13);
let pace = calcSpendingPace(300, "2026-09", 600, NOW());
ok(pace.state === "past" && pace.daysPassed === 30 && pace.daysRemaining === 0 && pace.projected === 300 && pace.dailyAvg === 10 && pace.onTrack === true && pace.diff === -300, "a PAST month (Sept, viewed on Oct 13): 30 days passed, projection = actual 300, within the 600 budget (was: day 13)", pace);
ok(calcSpendingPace(700, "2026-09", 600, NOW()).onTrack === false, "past month over its budget → not on track");
pace = calcSpendingPace(0, "2026-12", 600, NOW()); ok(pace.state === "future" && pace.daysPassed === 0 && pace.dailyAvg === 0 && pace.onTrack === null, "a FUTURE month claims no elapsed days and no pace");
pace = calcSpendingPace(130, "2026-10", 310, NOW()); ok(pace.expectedByToday === 130 && pace.onTrack === true, "current: budget 310/31 = 10 a day × 13 days = 130 expected; 130 spent → on track");
ok(calcSpendingPace(136, "2026-10", 310, NOW()).onTrack === true && calcSpendingPace(137, "2026-10", 310, NOW()).onTrack === false, "5% tolerance: 136 ≤ 136.5 on track, 137 is not");
ok(calcSpendingPace(100, "2026-10", 0, NOW()).onTrack === null, "no budget → no on-track claim");
setNow(2026, 9, 10); pace = calcSpendingPace(100, "2026-10", 0, NOW()); ok(pace.dailyAvg === 10 && pace.projected === 310 && pace.projectionReliable === true, "day 10, 100 spent → 10 a day → 310 projected");
setNow(2026, 9, 3); ok(calcSpendingPace(100, "2026-10", 0, NOW()).projectionReliable === false, "day 3 → projection flagged as unreliable");
setNow(2026, 9, 13);
let bs = calcBudgetStatus({ food: 100 }, { food: 60 }, "2026-10", NOW())[0]; ok(bs.pct === 60 && bs.aheadOfPace === true && bs.daysRemaining === 19, "current month: 60% spent vs 42% of month (13/31) → ahead of pace; 19 days left");
bs = calcBudgetStatus({ food: 100 }, { food: 60 }, "2026-09", NOW())[0]; ok(bs.aheadOfPace === false && bs.daysRemaining === 0 && bs.state === "past", "past month: no 'ahead of pace', 0 days left (was 17)");
bs = calcBudgetStatus({ food: 100 }, { food: 60 }, "2026-12", NOW())[0]; ok(bs.aheadOfPace === false && bs.daysRemaining === 31, "future month: 31 days to come, no pace claim");
const tx3 = [X("2026-10-05", 10), X("2026-10-13", 20), X("2026-10-20", 40)];
ok(calcSpentToDate(tx3, "2026-10", NOW()) === 30 && calcSpentToDate(tx3, "2026-09", NOW()) === 0 && calcSpentToDate([X("2026-09-05", 7)], "2026-09", NOW()) === 7 && calcSpentToDate(tx3, "2026-12", NOW()) === 0, "spent-to-date counts entries up to today only (Oct: 10 + 20; the Oct 20 one is planned); past month = all; future = 0");
ok(calcSafeToSpend([INC()], SC, [], NOW()).daysRemaining === monthProgress("2026-10", NOW()).daysRemaining, "Safe to Spend and pace use the same day count");

section("21. Insights are supported by the numbers");
setNow(2026, 9, 13);
const daysBack = (n, f) => { const out = []; for (let i = 0; i < n; i++) { const d = new Date(2026, 9, 13 - i); out.push(f(d, localDateStr(d), [0, 6].includes(d.getDay()))); } return out; };
const flat = daysBack(56, (d, s) => X(s, 10, { merchant: "M" + (d.getDate() % 4) }));
ok(!calcPatterns(flat, "₼", NOW()).insights.some(i => i.id === "weekend"), "IDENTICAL spending every day → NO weekend/weekday claim (the old formula claimed 150% higher)");
const split = daysBack(56, (d, s, we) => X(s, we ? 25 : 10, { merchant: "M" + (d.getDate() % 4) }));
let weDays = 0, wdDays = 0; daysBack(56, (d, s, we) => we ? weDays++ : wdDays++);
let ins = calcPatterns(split, "₼", NOW()).insights.find(i => i.id === "weekend");
ok(weDays === 16 && wdDays === 40, `window holds 16 weekend and 40 weekday days (counted independently)`);
ok(ins && ins.text.includes("150% more") && ins.text.includes("25.00 ₼ vs 10.00 ₼") && ins.text.includes("last 56 days"), "weekends 25/day vs weekdays 10/day → '150% more' (25−10)/10, shown with the per-day amounts", ins && ins.text);
// Several small purchases on weekend days: per-DAY spend is what matters, not per-transaction size.
//   weekdays: 1 × 10 per day  → 10 a day;   weekends: 4 × 5 per day → 20 a day.  Per day: +100%.  Per transaction it would read −50%.
const manySmall = daysBack(56, (d, s, we) => we ? [0, 1, 2, 3].map(() => X(s, 5, { id: id() })) : [X(s, 10, { id: id() })]).flat();
ins = calcPatterns(manySmall, "₼", NOW()).insights.find(i => i.id === "weekend");
ok(ins && ins.text.includes("100% more") && ins.text.includes("20.00 ₼ vs 10.00 ₼"), "weekend = 4 small purchases a day (20/day) vs weekday = 1 purchase (10/day) → '100% more' per day (a per-transaction average would say 50% LESS)", ins && ins.text);
const spendOnlyWeekdays = daysBack(56, (d, s, we) => we ? null : X(s, 10)).filter(Boolean);
ok(!calcPatterns(spendOnlyWeekdays, "₼", NOW()).insights.some(i => i.id === "weekend"), "no spending at all on weekends → no ratio claimed");
const short = daysBack(20, (d, s, we) => X(s, we ? 25 : 10));
ok(!calcPatterns(short, "₼", NOW()).insights.some(i => i.id === "weekend"), "only 20 days of history → too little to claim a weekend pattern");
const thirty = daysBack(30, (d, s, we) => X(s, we ? 25 : 10)); ins = calcPatterns(thirty, "₼", NOW()).insights.find(i => i.id === "weekend");
ok(ins && /last 30 days/.test(ins.text), "history shorter than 56 days: only the days since tracking began are counted", ins && ins.text);
// day-of-week insight needs ≥3 transactions on each compared day
const oct = (dayList, amt) => dayList.map(d => X(`2026-10-${String(d).padStart(2, "0")}`, amt));
ok(!calcPatterns([...oct([1, 2], 100), ...oct([5, 6, 7, 8, 9], 10)], "₼", NOW()).insights.some(i => i.id === "dayofweek"), "weekday comparison ignores days with fewer than 3 transactions");
// MP-7C: one unusual purchase must not create a day-of-week claim. Oct 5 and 12 2026 are Mondays, Oct 6 and 13 are Tuesdays.
const onDay = (date, amts) => amts.map((a) => X(date, a, { id: id() }));
const dow = (mon, tue) => calcPatterns([...onDay("2026-10-05", mon.slice(0, 2)), ...onDay("2026-10-12", mon.slice(2)), ...onDay("2026-10-06", tue.slice(0, 2)), ...onDay("2026-10-13", tue.slice(2))], "₼", NOW()).insights.find(i => i.id === "dayofweek");
ins = calcPatterns([...onDay("2026-10-05", [20, 20, 20]), ...onDay("2026-10-06", [10, 10]), ...onDay("2026-10-13", [10])], "₼", NOW()).insights.find(i => i.id === "dayofweek");
ok(!ins, "all three Monday purchases on ONE Monday → no claim about 'Mondays' (one day is not a weekly pattern)", ins && ins.text);
ins = dow([1000, 5, 5], [5, 5, 5]);
ok(!ins, "Monday 1000+5+5 vs Tuesday 5+5+5: a typical purchase is the same size → NO claim (a per-transaction average said '6633% more')", ins && ins.text);
const pOut = calcPatterns([...onDay("2026-10-05", [1000, 5]), ...onDay("2026-10-12", [5]), ...onDay("2026-10-06", [5, 5]), ...onDay("2026-10-13", [5])], "₼", NOW());
ok(pOut.dayOfWeek.Monday.median === 5 && pOut.dayOfWeek.Monday.avg === 336.67 && pOut.dayOfWeek.Monday.count === 3, "per-weekday data keeps both: Monday median 5 (what the chart draws) and average 336.67", pOut.dayOfWeek.Monday);
ins = dow([20, 20, 20], [10, 10, 10]);
ok(ins && ins.text.includes("100% larger") && ins.text.includes("Mondays") && ins.text.includes("Tuesdays") && ins.text.includes("median of 3 vs 3"), "Monday 20,20,20 vs Tuesday 10,10,10 → a typical transaction '100% larger', with the sample sizes", ins && ins.text);
ins = dow([50, 50, 50], [10, 10, 10]);
ok(ins && ins.text.includes("5.0×") && !/\d{3,}%/.test(ins.text), "a 5-fold difference is stated as '5.0×', not as '400%'", ins && ins.text);
ins = dow([12, 12, 12], [10, 10, 10]);
ok(!ins, "20% difference in the typical transaction is below the 30% threshold → no claim", ins && ins.text);
// Same question for 'average transaction vs last month': one large purchase must not read as a general change.
const sep4 = [1, 2, 3, 4].map((d) => X(`2026-09-0${d}`, 10, { id: id() }));
ins = calcPatterns([...sep4, ...[1000, 10, 10, 10].map((a, i) => X(`2026-10-0${i + 1}`, a, { id: id() }))], "₼", NOW()).insights.find(i => i.id === "avgtxn");
ok(!ins, "September 4 × 10; October 1000 + 3 × 10 → a typical purchase is unchanged → NO 'higher than last month' claim", ins && ins.text);
ins = calcPatterns([...sep4, ...[15, 15, 15, 15].map((a, i) => X(`2026-10-0${i + 1}`, a, { id: id() }))], "₼", NOW()).insights.find(i => i.id === "avgtxn");
ok(ins && ins.text.includes("50% larger") && ins.text.includes("4 vs 4"), "September 4 × 10; October 4 × 15 → a typical transaction '50% larger' than last month, with the sample sizes", ins && ins.text);
// category trend: completed months only
const monthly = (cat, vals) => vals.flatMap((v, i) => v ? [X(`2026-0${4 + i}-15`, v, { category: cat })] : []);
const t1 = [...monthly("food", [100, 100, 100, 100, 100, 200]), ...monthly("shopping", [100, 120, 140, 160, 180, 200]), ...oct([2, 3, 4, 5, 6], 3)];
let pat = calcPatterns(t1, "₼", NOW());
let tr = pat.categoryTrends.find(c => c.catId === "food");
ok(tr && tr.trend === "increasing" && tr.trendPct === 100 && Math.abs(tr.slope - 1500 / 105) < 0.01, "food 100,100,100,100,100,200 → increasing; slope 1500/105 = 14.29; last vs previous = +100%", tr);
ok(pat.insights.some(i => i.id === "trend-food" && /\+100%/.test(i.text)), "…and the insight states +100%");
ok(pat.categoryTrends.find(c => c.catId === "shopping").trendPct === 11 && !pat.insights.some(i => i.id === "trend-shopping"), "steady +20 a month: last vs previous = +11% (below the 20% threshold) → no insight");
const t2 = [...monthly("food", [100, 100, 100, 100, 100, 100]), X("2026-10-02", 5, { category: "food" })];
pat = calcPatterns(t2, "₼", NOW());
ok(!pat.insights.some(i => i.id === "trend-food") && pat.categoryTrends.find(c => c.catId === "food").trend === "stable", "a tiny part-month (5 so far in October) does NOT create a '−95%' trend");
// anomalies: IQR + at least 1.5× median
const hist = Array.from({ length: 10 }, (_, i) => X(`2026-08-${String(i + 1).padStart(2, "0")}`, 10));
pat = calcPatterns([...hist, X("2026-10-05", 100)], "₼", NOW());
ok(pat.anomalies.length === 1 && pat.anomalies[0].amount === 100 && /10\.0× the usual/.test(pat.anomalies[0].reason), "10 × 10 history + one 100 → flagged, '10.0× the usual'", pat.anomalies);
ok(calcPatterns([...hist, X("2026-10-05", 12)], "₼", NOW()).anomalies.length === 0, "12 against a flat history of 10 is above Q3+1.5·IQR but under 1.5× the median → not flagged");
ok(calcPatterns([...hist.slice(0, 5), X("2026-10-05", 100)], "₼", NOW()).anomalies.length === 0, "fewer than 8 prior values → no anomaly claims");
// co-occurrence
const pairDays = (n) => Array.from({ length: n }, (_, i) => [X(`2026-10-${String(i + 1).padStart(2, "0")}`, 5, { category: "food" }), X(`2026-10-${String(i + 1).padStart(2, "0")}`, 2, { category: "transport" })]).flat();
ok(calcPatterns(pairDays(12), "₼", NOW()).correlations.length === 1 && /often recorded on the same day/.test(calcPatterns(pairDays(12), "₼", NOW()).insights.find(i => i.id === "same-day").text), "food + transport on 12 of 12 days → reported as 'often recorded on the same day'");
ok(calcPatterns(pairDays(5), "₼", NOW()).correlations.length === 0, "only 5 spending days → no co-occurrence claim");
// property: never produce NaN / Infinity / undefined text, whatever the data
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let badText = null;
for (let n = 0; n < 150 && !badText; n++) {
  const list = Array.from({ length: Math.floor(rnd() * 120) }, () => { const d = new Date(2026, 9, 13 - Math.floor(rnd() * 200)); return X(localDateStr(d), Math.round(rnd() * 20000) / 100 + 0.01, { category: ["food", "transport", "shopping", "gifts"][Math.floor(rnd() * 4)], merchant: rnd() > 0.5 ? "M" + Math.floor(rnd() * 5) : "" }); });
  const out = calcPatterns(list, "₼", NOW()); const txt = JSON.stringify(out);
  if (/NaN|Infinity|undefined/.test(txt)) badText = txt.match(/.{0,60}(NaN|Infinity|undefined).{0,30}/)[0];
}
ok(!badText, "150 random datasets: no insight, anomaly or trend contains NaN / Infinity / undefined", badText);

section("22. Goals");
const G = (o) => ({ target: 300, saved: 0, monthlyTarget: 100, targetDate: null, ...o });
setNow(2026, 9, 13, 20, 0); ok(calcGoalProgress(G({ targetDate: "2026-10-14" }), NOW()).daysToTarget === 1, "20:00 on Oct 13, target Oct 14 → 1 day (calendar days; was 0)");
setNow(2026, 9, 13, 0, 5); ok(calcGoalProgress(G({ targetDate: "2026-10-14" }), NOW()).daysToTarget === 1, "00:05 on Oct 13 → still 1");
setNow(2026, 9, 13, 12); ok(calcGoalProgress(G({ targetDate: "2026-10-13" }), NOW()).daysToTarget === 0 && calcGoalProgress(G({ targetDate: "2026-10-12" }), NOW()).daysToTarget === -1, "target today = 0; yesterday = −1");
// Run 15 (rule change, see tests/logic/run15.test.mjs): one payment on the 1st of each month, so 300 at 100/mo = 3 payments
// = 1 Nov, 1 Dec, 1 Jan → finished on 1 Jan 2027 (was "3 months from today" = 13 Jan 2027).
let g = calcGoalProgress(G({ targetDate: "2026-12-22" }), NOW()); ok(g.behindSchedule === true && g.onTrack === false && /January 2027/.test(g.estCompletion), "needs 3 payments (done 1 Jan) but target is Dec 22 → behind (the old heuristic said fine)");
ok(calcGoalProgress(G({ targetDate: "2027-01-01" }), NOW()).onTrack === true && calcGoalProgress(G({ targetDate: "2027-01-01" }), NOW()).behindSchedule === false, "finishing exactly on the target date (1 Jan) → on track");
ok(calcGoalProgress(G({ targetDate: "2026-12-31" }), NOW()).behindSchedule === true, "one day late (done 1 Jan, target 31 Dec) → behind");
setNow(2026, 0, 31); ok(/February 2026/.test(calcGoalProgress(G({ target: 100 }), NOW()).estCompletion), "from Jan 31, one month → February (never March)");
setNow(2026, 9, 13);
g = calcGoalProgress(G({ saved: 300, targetDate: "2026-01-01" }), NOW()); ok(g.complete && g.pct === 100 && !g.overdue && !g.behindSchedule && !g.onTrack && g.estCompletion === null && g.monthsNeeded === null, "fully funded: complete; a passed date is not 'overdue'; no projections");
g = calcGoalProgress(G({ saved: 100, targetDate: "2026-09-01" }), NOW()); ok(g.overdue && !g.behindSchedule && !g.onTrack && g.remaining === 200, "unfinished with a passed target date → overdue");
g = calcGoalProgress(G({ monthlyTarget: 0 }), NOW()); ok(g.noContribution && g.estCompletion === null && g.monthsNeeded === null, "no monthly contribution → no projection (the optional what-if is goalScenario, tested in run15)");
ok(eq([60, 100, 140].map(m => calcGoalProgress(G({ monthlyTarget: m }), NOW()).monthsNeeded), [5, 3, 3]), "payments needed at 60 / 100 / 140 per month → ceil(300/60)=5, 3, ceil(300/140)=3");
const weird = [G({ targetDate: "garbage" }), G({ target: "abc" }), G({ target: -5 }), G({ saved: -3 }), G({ monthlyTarget: NaN }), G({ target: 0 }), { }, G({ targetDate: "2026-02-30" })];
ok(weird.every(w => !/NaN|Infinity|undefined/.test(JSON.stringify(calcGoalProgress(w, NOW())))), "malformed goal values never produce NaN / Infinity / undefined");
ok(calcGoalProgress(G({ targetDate: "garbage" }), NOW()).daysToTarget === null && calcGoalProgress(G({ target: 0 }), NOW()).pct === 0, "invalid date → no countdown; target 0 → 0%");

section("23. Numeric stability");
const big = Array.from({ length: 1000 }, (_, i) => X("2026-10-05", 999999999.99, { id: 1e6 + i }));
const sum = calcMonthSummary(big, "2026-10", "2026-09");
ok(Number.isFinite(sum.curExp) && Math.abs(sum.curExp - 999999999990) < 1 && !/NaN|Infinity/.test(fmt(sum.curExp, "₼")), "1000 transactions at the maximum amount still total finitely and display normally", fmt(sum.curExp, "₼"));
ok(fmt(0.1 + 0.2, "₼") === "0.30 ₼" && fmt(1234567.891, "₼") === "1,234,567.89 ₼" && fmt(-0, "₼") === "0.00 ₼" && fmt(0.005, "₼") === "0.01 ₼", "display rounds to cents consistently", [fmt(0.1 + 0.2, "₼"), fmt(1234567.891, "₼"), fmt(0.005, "₼")]);
ok(Math.abs([0.1, 0.1, 0.1].reduce((s, v) => s + v, 0) - 0.3) < 1e-9 && fmt([0.1, 0.1, 0.1].reduce((s, v) => s + v, 0), "₼") === "0.30 ₼", "float noise (0.1+0.1+0.1) displays as 0.30");

finish("finance");
