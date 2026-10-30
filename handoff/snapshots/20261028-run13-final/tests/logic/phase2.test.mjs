// Phase 2 regression tests (2026-10-26): Safe to Spend income timing, Analytics weekday/weekend comparison, backup reminder.
// Expected values are worked out by hand in the comments. A missing function is a FAILED check, never a silent skip.
import { H, KEY, ok, section, eq, setNow, reset, T, finish } from "./lib.mjs";
const { calcSafeToSpend, calcTxnStats, calcWeekdayWeekend, backupReminderDue, BACKUP_REMINDER_DAYS, buildBackup, applyImport, planImport, migrateAndLoad, monthProgress } = H;
let uid = 70000; const id = () => ++uid;
const X = (date, amount, o = {}) => T({ id: id(), date, amount, ...o });
const INC = (date, amount) => T({ id: id(), type: "income", category: "salary", amount, date });
const R = (o) => T({ id: id(), recurring: true, recurFreq: "monthly", category: "digital", amount: 15, ...o });
const NOW = () => new Date(globalThis.__NOW);
const SC = { savingsTarget: 0 };
const need = (fn, name) => { ok(typeof fn === "function", `${name}() exists in the candidate`); return typeof fn === "function"; };
const days = (mon, n, f) => Array.from({ length: n }, (_, i) => { const d = new Date(+mon.slice(0, 4), +mon.slice(5) - 1, i + 1); return f(`${mon}-${String(i + 1).padStart(2, "0")}`, [0, 6].includes(d.getDay())); }).flat().filter(Boolean);

section("P2-B. Safe to Spend counts income received to date, not income dated later this month");
reset(); setNow(2026, 9, 13);                                   // Tue 13 Oct 2026
let r = calcSafeToSpend([INC("2026-10-02", 2000), INC("2026-10-25", 1000)], SC, [], NOW());
ok(r.curInc === 2000, "salary Oct 2 (2000) counted; a payment dated Oct 25 (1000) is NOT counted yet → income 2000", r.curInc);
ok(r.expectedInc === 1000, "…the Oct 25 income is reported separately as expected later this month (1000)", r.expectedInc);
ok(r.remaining === 2000, "remaining = 2000 received − 0 − 0 − 0 = 2000 (was 3000)", r.remaining);
ok(Math.abs(r.dailyAllowance - 2000 / 19) < 1e-9, "daily allowance = 2000 ÷ 19 days left incl. today (was 3000 ÷ 19)", r.dailyAllowance);
setNow(2026, 9, 13, 23, 59);
r = calcSafeToSpend([INC("2026-10-13", 500)], SC, [], NOW()); ok(r.curInc === 500 && r.expectedInc === 0, "income dated TODAY counts (even late in the day)", [r.curInc, r.expectedInc]);
setNow(2026, 9, 13, 0, 1);
r = calcSafeToSpend([INC("2026-10-13", 500)], SC, [], NOW()); ok(r.curInc === 500, "…and early in the day (local calendar date, not a time comparison)", r.curInc);
setNow(2026, 9, 13);
r = calcSafeToSpend([INC("2026-10-25", 1000), X("2026-10-05", 50)], SC, [], NOW());
ok(r.feasible === false && r.curInc === 0 && r.expectedInc === 1000, "only future-dated income → not feasible (no figure is presented as safe), expected 1000 still reported", [r.feasible, r.curInc, r.expectedInc]);
r = calcSafeToSpend([INC("2026-09-28", 2000), X("2026-10-05", 50)], SC, [], NOW());
ok(r.curInc === 0 && r.feasible === false, "last month's income is not this month's income");
r = calcSafeToSpend([INC("2026-10-02", 2000), INC("2026-10-30", 1000), R({ merchant: "Netflix", date: "2026-10-05" }), R({ merchant: "Spotify", date: "2026-09-20" }), X("2026-10-08", 50)], { savingsTarget: 100 }, [], NOW());
ok(r.curExp === 65 && r.futureCommitments === 15 && r.remaining === 1820, "identity unchanged by a future salary: 2000 − 100 − (15 + 50) − 15 = 1820", { exp: r.curExp, fut: r.futureCommitments, rem: r.remaining });
r = calcSafeToSpend([INC("2026-10-02", 2000), X("2026-10-25", 300)], SC, [], NOW());
ok(r.curExp === 300 && r.remaining === 1700, "an expense dated later this month is still counted (conservative): 2000 − 300 = 1700");
r = calcSafeToSpend([INC("2026-10-02", 100), X("2026-10-03", 300)], SC, [], NOW());
ok(r.remaining === -200 && r.feasible === true, "overspent → remaining is negative (−200), never clamped to 0", r.remaining);
r = calcSafeToSpend([INC("2026-10-02", 100), X("2026-10-03", 100)], SC, [], NOW());
ok(r.remaining === 0, "exactly spent → 0");
r = calcSafeToSpend([INC("2026-10-02", 2000)], undefined, undefined, NOW());
ok(r.remaining === 2000 && r.effectiveSavingsTarget === 0, "missing Safe to Spend settings and goals → treated as 0 reserve, no NaN");
setNow(2026, 9, 31); r = calcSafeToSpend([INC("2026-10-31", 800)], SC, [], NOW()); ok(r.curInc === 800 && r.daysRemaining === 1, "last day of month: income dated that day counts");
setNow(2026, 10, 1); r = calcSafeToSpend([INC("2026-10-31", 800), INC("2026-11-01", 900)], SC, [], NOW()); ok(r.curInc === 900, "month boundary: on Nov 1 only November's income counts");
setNow(2026, 9, 13);
ok(r && !/NaN|Infinity|undefined/.test(JSON.stringify(calcSafeToSpend([], SC, [], NOW()))), "empty ledger → no NaN / Infinity / undefined");

section("P2-A. Analytics weekday/weekend comparison uses spending PER ELAPSED DAY");
if (need(calcWeekdayWeekend, "calcWeekdayWeekend")) {
  // October 2026: Oct 1 is a Thursday → weekend days 3,4,10,11,17,18,24,25,31 = 9; weekdays = 22.
  setNow(2026, 9, 31);
  const flat = days("2026-10", 31, (s) => X(s, 10));
  let w = calcWeekdayWeekend(flat, "2026-10", NOW());
  ok(w.weDays === 9 && w.wdDays === 22, "Oct 2026 has 9 weekend and 22 weekday days", [w.weDays, w.wdDays]);
  ok(w.weAvg === 10 && w.wdAvg === 10 && w.heavier === "same", "₼10 every day → 10/day both → 'same' (raw totals 90 vs 220 must not say weekdays are heavier)", w);
  const st = calcTxnStats(flat, "2026-10");
  ok(st.weekdayExp === 220 && st.weekendExp === 90, "documented defect: the old tile compared raw totals 220 vs 90 for identical daily spending", [st.weekdayExp, st.weekendExp]);
  w = calcWeekdayWeekend(days("2026-10", 31, (s, we) => X(s, we ? 25 : 10)), "2026-10", NOW());
  ok(w.weAvg === 25 && w.wdAvg === 10 && w.heavier === "weekend", "weekends 25/day vs weekdays 10/day → weekend heavier (totals 225 vs 220 would barely differ)", w);
  w = calcWeekdayWeekend(days("2026-10", 31, (s, we) => X(s, we ? 5 : 12)), "2026-10", NOW());
  ok(w.heavier === "weekday" && w.wdAvg === 12 && w.weAvg === 5, "weekdays 12/day vs weekends 5/day → weekday heavier");
  w = calcWeekdayWeekend([], "2026-10", NOW());
  ok(w.heavier === null && w.weAvg === 0 && w.wdAvg === 0, "no spending → no claim", w);
  w = calcWeekdayWeekend([X("2026-10-05", 40, { type: "income", category: "salary" })], "2026-10", NOW());
  ok(w.heavier === null, "income is not spending → no claim");
  setNow(2026, 9, 2);                                         // Fri Oct 2: only Thu 1 and Fri 2 have elapsed
  w = calcWeekdayWeekend([X("2026-10-01", 10), X("2026-10-02", 10)], "2026-10", NOW());
  ok(w.weDays === 0 && w.wdDays === 2 && w.heavier === null && w.weAvg === null, "no weekend day has passed yet → zero denominator → no claim (avg null, not Infinity/NaN)", w);
  setNow(2026, 9, 13);                                        // Tue Oct 13: weekend days so far 3,4,10,11 = 4; weekdays 1,2,5–9,12,13 = 9
  w = calcWeekdayWeekend([...days("2026-10", 13, (s) => X(s, 10)), X("2026-10-24", 900), X("2026-10-20", 900)], "2026-10", NOW());
  ok(w.weDays === 4 && w.wdDays === 9 && w.weTotal === 40 && w.wdTotal === 90 && w.heavier === "same", "future-dated Oct 20 / Oct 24 entries are excluded; days counted up to today only", w);
  setNow(2026, 2, 5);                                         // Feb 2026 viewed in March: 28 days, Feb 1 is a Sunday → weekend 8, weekdays 20
  w = calcWeekdayWeekend(days("2026-02", 28, (s, we) => X(s, we ? 20 : 10)), "2026-02", NOW());
  ok(w.weDays === 8 && w.wdDays === 20 && w.weAvg === 20 && w.wdAvg === 10 && w.heavier === "weekend", "Feb 2026 (28 days, past): 8 weekend / 20 weekday days", w);
  setNow(2028, 2, 5);                                         // Feb 2028 (leap): Feb 1 is a Tuesday → weekend 5,6,12,13,19,20,26,27 = 8; weekdays 21
  w = calcWeekdayWeekend(days("2028-02", 29, (s) => X(s, 7)), "2028-02", NOW());
  ok(w.weDays === 8 && w.wdDays === 21 && w.heavier === "same", "Feb 2028 (leap, 29 days): 8 weekend / 21 weekday days, flat spending → same", w);
  setNow(2026, 4, 2);                                         // April 2026 (30 days): Apr 1 is a Wednesday → weekend 4,5,11,12,18,19,25,26 = 8; weekdays 22
  w = calcWeekdayWeekend(days("2026-04", 30, (s) => X(s, 3)), "2026-04", NOW());
  ok(w.weDays === 8 && w.wdDays === 22 && w.heavier === "same", "April 2026 (30 days): 8 weekend / 22 weekday days", w);
  setNow(2026, 9, 13);
  w = calcWeekdayWeekend([X("2026-12-05", 10)], "2026-12", NOW());
  ok(w.weDays === 0 && w.wdDays === 0 && w.heavier === null, "a FUTURE month has no elapsed days → no claim", w);
  setNow(2026, 9, 3, 23, 59);                                 // Sat 3 Oct, late evening
  w = calcWeekdayWeekend([X("2026-10-03", 30), X("2026-10-02", 10), X("2026-10-01", 10)], "2026-10", NOW());
  ok(w.weDays === 1 && w.weTotal === 30 && w.wdDays === 2 && w.heavier === "weekend", "local-date boundary: Saturday 3 Oct (late evening) is a weekend day and counted as elapsed", w);
  setNow(2026, 9, 13);
  ok(!/NaN|Infinity|undefined/.test(JSON.stringify(calcWeekdayWeekend([X("2026-10-01", 0.01)], "2026-10", NOW()))), "no NaN / Infinity / undefined in the result");
}

section("P2-C. Backup reminder: a created file is not treated as a confirmed backup");
if (need(backupReminderDue, "backupReminderDue")) {
  setNow(2026, 9, 13);
  const iso = (y, m, d) => new Date(y, m, d, 12).toISOString();
  ok(BACKUP_REMINDER_DAYS === 7, "reminder interval is 7 days");
  ok(backupReminderDue({}, NOW()) === "due", "no backup ever → reminder due");
  ok(backupReminderDue({ lastBackup: iso(2026, 9, 12) }, NOW()) === "confirm", "file created yesterday, never confirmed → ask the user to confirm (not silently hidden for 7 days)");
  ok(backupReminderDue({ lastBackup: iso(2026, 9, 12), backupConfirmedAt: iso(2026, 9, 12) }, NOW()) === "none", "file created and confirmed yesterday → no reminder");
  ok(backupReminderDue({ lastBackup: iso(2026, 9, 5), backupConfirmedAt: iso(2026, 9, 5) }, NOW()) === "due", "confirmed 8 days ago → due again");
  ok(backupReminderDue({ lastBackup: iso(2026, 9, 6), backupConfirmedAt: iso(2026, 9, 6) }, NOW()) === "due" && backupReminderDue({ lastBackup: iso(2026, 9, 7), backupConfirmedAt: iso(2026, 9, 7) }, NOW()) === "none", "boundary: confirmed exactly 7 days ago → due (same ≥ 7-day rule as before); 6 days ago → not due");
  ok(backupReminderDue({ lastBackup: iso(2026, 9, 1), backupConfirmedAt: iso(2026, 8, 20) }, NOW()) === "due", "old unconfirmed file (12 days) and an older confirmation → due");
  ok(backupReminderDue({ lastBackup: iso(2026, 9, 12), backupConfirmedAt: iso(2026, 9, 10) }, NOW()) === "confirm", "a newer unconfirmed file after an older confirmation → ask to confirm the new one");
  ok(backupReminderDue({ lastBackup: "garbage", backupConfirmedAt: 42 }, NOW()) === "due", "malformed dates → treated as no backup (due), never a crash");
  // Stored data compatibility
  reset(); setNow(2026, 9, 13);
  localStorage.setItem(KEY, JSON.stringify({ transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { savingsTarget: 0, enabled: false }, lastBackup: iso(2026, 9, 12), backupConfirmedAt: iso(2026, 9, 12) }));
  let s = migrateAndLoad(); ok(s.lastBackup === iso(2026, 9, 12) && s.backupConfirmedAt === iso(2026, 9, 12), "stored backupConfirmedAt is loaded and kept", s);
  reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [], lastBackup: iso(2026, 9, 12) }));
  s = migrateAndLoad(); ok(s.lastBackup === iso(2026, 9, 12) && s.backupConfirmedAt === null, "data saved by the previous version (no backupConfirmedAt) loads; confirmation starts empty", s);
  reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [], lastBackup: iso(2026, 9, 12), backupConfirmedAt: "not a date" }));
  s = migrateAndLoad(); ok(s.backupConfirmedAt === null, "malformed backupConfirmedAt is ignored");
  // Backup file contents and import must not move this device's backup history
  const device = { transactions: [X("2026-10-01", 5)], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { savingsTarget: 0, enabled: false }, lastBackup: iso(2026, 9, 1), backupConfirmedAt: iso(2026, 9, 1) };
  const file = buildBackup({ ...device, lastBackup: iso(2025, 0, 1), backupConfirmedAt: iso(2025, 0, 1) }, iso(2025, 0, 2));
  ok(file.backupConfirmedAt === undefined, "a backup file never carries the 'confirmed' flag (it is a fact about one device)");
  const plan = planImport(JSON.stringify(file), "b.json");
  for (const mode of ["merge", "replace"]) {
    const next = applyImport(device, plan, mode);
    ok(next.lastBackup === device.lastBackup && next.backupConfirmedAt === device.backupConfirmedAt, `${mode} import keeps this device's lastBackup and backupConfirmedAt`, [next.lastBackup, next.backupConfirmedAt]);
  }
}

finish("phase2");
