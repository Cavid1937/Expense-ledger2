// Run 7 (2026-10-27): ChatGPT video audit V9 — month comparisons must compare like with like.
// Policy: while a month is under way, it is compared with the SAME DAYS of the previous month (1–27 Oct vs 1–27 Sep);
// a finished month is compared whole with the whole previous month; a future month is not compared at all.
// Today is Tue 27 Oct 2026 unless set otherwise. Expected values are worked out by hand in the comments.
import { H, ok, section, eq, setNow, reset, T, finish } from "./lib.mjs";
const { calcMonthSummary, calcWhatChanged } = H;
let uid = 71000; const id = () => ++uid;
const X = (date, amount, o = {}) => T({ id: id(), date, amount, ...o });
const NOW = () => new Date(globalThis.__NOW);

reset(); setNow(2026, 9, 27);
// September: 100 (5th) + 200 (20th) = 300 by the 27th; + 500 on the 29th → 800 for the whole month.
// October so far: 150 (3rd) + 50 (25th) = 200; 999 dated 30 Oct is planned.
const data = [X("2026-09-05", 100, { merchant: "Shop" }), X("2026-09-20", 200, { merchant: "Shop" }), X("2026-09-29", 500, { category: "housing", merchant: "Landlord" }),
  X("2026-10-03", 150, { merchant: "Shop" }), X("2026-10-25", 50, { merchant: "Cafe" }), X("2026-10-30", 999, { category: "housing", merchant: "Landlord" }),
  X("2026-08-10", 400), X("2026-08-30", 100)];

section("V9-1. The current month is compared with the same days of the previous month");
let s = calcMonthSummary(data, "2026-10", "2026-09", NOW());
ok(s.curExp === 200 && s.prevExp === 300 && s.momDiff === -100, "27 Oct: October 1–27 (200) vs September 1–27 (300) → 100 less (was: vs all of September 800 → 600 less)", s);
ok(s.cmpKind === "same" && s.cmpDays === 27 && s.prevFullExp === 800, "the summary says which window it used (same days, 27) and still reports September's full total (800)", { k: s.cmpKind, d: s.cmpDays, full: s.prevFullExp });

section("V9-2. A finished month is compared whole with the whole previous month");
s = calcMonthSummary(data, "2026-09", "2026-08", NOW());
ok(s.curExp === 800 && s.prevExp === 500 && s.momDiff === 300 && s.cmpKind === "full", "September (800) vs August (500) → 300 more, full months", s);

section("V9-3. A future month is not compared");
s = calcMonthSummary(data, "2026-11", "2026-10", NOW());
ok(s.momDiff === null && s.cmpKind === null, "November (nothing has happened yet) → no comparison", s);

section("V9-4. Month lengths and the year boundary");
setNow(2026, 9, 31);
s = calcMonthSummary(data, "2026-10", "2026-09", NOW());
ok(s.prevExp === 800 && s.cmpDays === 31, "31 Oct: the window is days 1–31, so all 30 days of September count (800)", s);
setNow(2026, 2, 30);
s = calcMonthSummary([X("2026-02-10", 40), X("2026-02-28", 60), X("2026-03-05", 10)], "2026-03", "2026-02", NOW());
ok(s.prevExp === 100 && s.curExp === 10, "30 Mar 2026: February has 28 days, all counted (100)", s);
setNow(2024, 2, 29);
s = calcMonthSummary([X("2024-02-29", 70), X("2024-02-01", 30)], "2024-03", "2024-02", NOW());
ok(s.prevExp === 100, "29 Mar 2024 (leap year): 29 Feb is inside days 1–29 (100)", s);
setNow(2027, 0, 15);
s = calcMonthSummary([X("2026-12-10", 20), X("2026-12-20", 80), X("2027-01-05", 30)], "2027-01", "2026-12", NOW());
ok(s.prevExp === 20 && s.momDiff === 10, "15 Jan 2027: December 1–15 (20) vs January 1–15 (30) → 10 more; 20 Dec is outside the window", s);
setNow(2026, 9, 1);
s = calcMonthSummary([X("2026-09-01", 25), X("2026-09-02", 75), X("2026-10-01", 5)], "2026-10", "2026-09", NOW());
ok(s.prevExp === 25 && s.cmpDays === 1, "1 Oct: day 1 vs day 1 (25)", s);

section("V9-5. 'What changed' uses the same window");
setNow(2026, 9, 27);
const wc = calcWhatChanged(data, "2026-10", "2026-09", NOW());
ok(wc.prevExp === 300 && wc.totalDiff === -100, "total change: 200 − 300 = −100", { prev: wc.prevExp, diff: wc.totalDiff });
ok(!wc.catChanges.some((c) => c.catId === "housing") && !JSON.stringify(wc.merchantChanges).includes("Landlord"), "the 500 rent paid on 29 Sep (after day 27) is not listed as a change, nor is the 999 planned for 30 Oct", wc.catChanges.map((c) => [c.catId, c.diff]));
const food = wc.catChanges.find((c) => c.catId === "food");
ok(food && food.cur === 200 && food.prev === 300 && food.diff === -100, "food: 200 vs 300 → −100", food);
finish("run7");
