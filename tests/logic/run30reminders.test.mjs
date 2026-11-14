// Run 30: reminderPlan / cleanReminderPrefs / reminderMessage (Android reminders). Expected values worked out by hand from the calendar:
// "now" is Tuesday 13 Oct 2026, 12:00. Synthetic data only.
import { H, ok, section, finish, reset, T } from "./lib.mjs";
const { reminderPlan, cleanReminderPrefs, reminderMessage, buildSchedules, localDateStr, REMIND_DEFAULT } = H;
reset();
const NOW = new Date(2026, 9, 13, 12, 0, 0);
const bill = (o) => ({ id: "b1", name: "Kommunal", type: "expense", category: "housing", subcategory: "Utilities", amount: 18, freq: "monthly", anchorDate: "2026-09-05", active: true, createdAt: "2026-09-01T00:00:00Z", ...o });
const on = (o) => ({ ...REMIND_DEFAULT, ...o });
const plan = (bills, tx, prefs, now = NOW, opts) => reminderPlan(buildSchedules(tx, bills), tx, prefs, now, opts);

section("R30-1. Preferences are cleaned");
ok(JSON.stringify(cleanReminderPrefs(null)) === JSON.stringify(REMIND_DEFAULT) && REMIND_DEFAULT.bills === false && REMIND_DEFAULT.daily === false, "nothing is on by default");
ok(cleanReminderPrefs({ time: "25:00" }).time === "09:00" && cleanReminderPrefs({ time: "9:00" }).time === "09:00" && cleanReminderPrefs({ time: "18:30" }).time === "18:30", "only HH:MM between 00:00 and 23:59 is accepted");
ok(cleanReminderPrefs({ bills: "yes", recurring: 1, daily: "true" }).bills === false && cleanReminderPrefs({ bills: true }).bills === true, "only real booleans switch a reminder on");

section("R30-2. A bill reminds on its due day at the chosen time");
let p = plan([bill({})], [], on({ bills: true }));
ok(p.length === 1 && p[0].date === "2026-11-05" && p[0].kind === "bill", "monthly bill on the 5th: next one is 5 Nov (5 Oct already passed); 30-day horizon ends 12 Nov", p);
ok(p[0].atMs === new Date(2026, 10, 5, 9, 0).getTime(), "notification time is 5 Nov 09:00 local");
ok(plan([bill({})], [], on({ bills: true, time: "18:30" }))[0].atMs === new Date(2026, 10, 5, 18, 30).getTime(), "the chosen time (18:30) is used");
ok(plan([bill({})], [], on({})).length === 0, "bill reminders off: nothing is scheduled");
ok(plan([bill({ active: false })], [], on({ bills: true })).length === 0, "a paused bill gives no reminder");

section("R30-3. Paid, past and edited bills leave nothing behind");
const paid = [T({ id: 5, billId: "b1", amount: 18, date: "2026-11-02", merchant: "Kommunal", recurring: true, recurFreq: "monthly" })];
ok(plan([bill({})], paid, on({ bills: true })).length === 0, "payment for the month is recorded: the 5 Nov reminder disappears");
ok(plan([bill({ anchorDate: "2026-09-13" })], [], on({ bills: true })).length === 0, "due today at 09:00 but it is already 12:00: not scheduled in the past (next one, 13 Nov, is beyond the 30-day horizon)");
const later = plan([bill({ anchorDate: "2026-09-13" })], [], on({ bills: true, time: "18:00" }));
ok(later.length >= 1 && later[0].date === "2026-10-13" && later[0].atMs === new Date(2026, 9, 13, 18, 0).getTime(), "due today and 18:00 is still ahead: scheduled for today 18:00", later);
const ended = plan([bill({ endDate: "2026-10-31" })], [], on({ bills: true }));
ok(ended.length === 0, "a bill that ended on 31 Oct has no 5 Nov reminder");

section("R30-4. Recurring payments found from entries remind the day before");
const gym = ["2026-08-10", "2026-09-10", "2026-10-10"].map((d, i) => T({ id: 20 + i, merchant: "Gym", amount: 30, date: d, recurring: true, recurFreq: "monthly", category: "health" }));
p = plan([], gym, on({ recurring: true }));
ok(p.length === 1 && p[0].kind === "recurring" && p[0].date === "2026-11-10", "monthly Gym on the 10th: next due 10 Nov", p);
ok(p[0].atMs === new Date(2026, 10, 9, 9, 0).getTime(), "reminder is on 9 Nov, the day before, at 09:00");
ok(plan([], gym, on({ bills: true })).length === 0, "the 'bills' switch does not turn on recurring-payment reminders");

section("R30-5. Daily check-in at 21:00");
p = plan([], [], on({ daily: true }));
ok(p.length === 14 && p[0].date === "2026-10-13" && p[0].atMs === new Date(2026, 9, 13, 21, 0).getTime(), "14 evenings starting today at 21:00", p.length);
ok(plan([], [T({ id: 9, date: "2026-10-13" })], on({ daily: true })).length === 13, "something already recorded today: today's nudge is skipped (13 left)");
ok(plan([], [], on({ daily: true }), new Date(2026, 9, 13, 22, 0)).length === 13, "after 21:00 today's nudge is already past (13 left)");

section("R30-6. Stable ids, order, cap");
const a = plan([bill({})], [], on({ bills: true })), b = plan([bill({})], [], on({ bills: true }));
ok(a[0].id === b[0].id && Number.isInteger(a[0].id) && a[0].id > 0 && a[0].id < 2147483647, "the same reminder always gets the same positive 31-bit id");
const two = plan([bill({}), bill({ id: "b2", name: "Internet", anchorDate: "2026-09-20" })], [], on({ bills: true }));
ok(two.length === 2 && two[0].atMs <= two[1].atMs && two[0].id !== two[1].id, "two bills: sorted by time, different ids", two);
ok(plan([], [], on({ daily: true }), NOW, { cap: 5 }).length === 5, "the list is capped (5 here, 60 by default)");

section("R30-7. Notification text");
const m = reminderMessage({ kind: "bill", name: "Kommunal", amount: 18 }, on({}), "₼");
ok(m.title === "Kommunal is due today" && m.body === "18.00 ₼ · open the app to record it", "bill text shows the name and amount", m);
const h = reminderMessage({ kind: "bill", name: "Kommunal", amount: 18 }, on({ hideAmount: true }), "₼");
ok(!/Kommunal|18/.test(h.title + h.body) && h.title === "A payment is due today", "hide amounts: neither the name nor the amount is written", h);
ok(reminderMessage({ kind: "recurring", name: "Gym", amount: 30 }, on({}), "₼").title === "Gym is due tomorrow", "recurring text says tomorrow");
ok(reminderMessage({ kind: "daily" }, on({}), "₼").title === "Did you spend anything today?", "daily text");
finish("run30reminders");
