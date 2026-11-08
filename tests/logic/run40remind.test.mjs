// Run 40 (2026-11-08): the daily check-in follows its own chosen time. Owner: "it strictly sends at 21:00; I set the time and it didn't come".
// Cause found: "Reminder time" only moved bill/recurring reminders; the daily one was fixed at 21:00 in the code. Expected values by hand.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { reminderPlan, cleanReminderPrefs, REMIND_DEFAULT } = H;
reset();   // today = 13 Oct 2026
const NOW = new Date(2026, 9, 13, 10, 0);
const on = (o) => ({ ...REMIND_DEFAULT, ...o });

section("R40R-1. Saved settings");
ok(REMIND_DEFAULT.dailyTime === "21:00" && cleanReminderPrefs({ daily: true }).dailyTime === "21:00", "nothing chosen (also every older saved setting): 21:00 as before");
ok(cleanReminderPrefs({ dailyTime: "07:05" }).dailyTime === "07:05" && cleanReminderPrefs({ dailyTime: "25:00" }).dailyTime === "21:00" && cleanReminderPrefs({ dailyTime: "9:00" }).dailyTime === "21:00" && cleanReminderPrefs({ dailyTime: 900 }).dailyTime === "21:00", "a valid HH:MM is kept; anything else falls back to 21:00");

section("R40R-2. The daily nudge is planned at the chosen time");
const p = reminderPlan([], [], on({ daily: true, dailyTime: "10:30" }), NOW);
ok(p.length === 14 && p[0].date === "2026-10-13" && p[0].atMs === new Date(2026, 9, 13, 10, 30).getTime(), "10:30 chosen at 10:00: today's nudge is in 30 minutes, then 13 more days", [p.length, new Date(p[0].atMs).toString()]);
ok(p.every((i) => { const d = new Date(i.atMs); return d.getHours() === 10 && d.getMinutes() === 30; }), "every day at 10:30");
const late = reminderPlan([], [], on({ daily: true, dailyTime: "09:15" }), NOW);
ok(late.length === 13 && late[0].date === "2026-10-14", "09:15 chosen at 10:00: today's time has passed, so it starts tomorrow (13 left)");
ok(reminderPlan([], [T({ id: 1, date: "2026-10-13" })], on({ daily: true, dailyTime: "23:00" }), NOW)[0].date === "2026-10-14", "something already recorded today: today's nudge is still skipped");
const both = reminderPlan([], [], on({ daily: true, dailyTime: "20:00", time: "08:00" }), NOW);
ok(both.every((i) => new Date(i.atMs).getHours() === 20), "the bill time (08:00) does not move the daily nudge");
finish("run40remind");
