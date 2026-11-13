// Run 66 (plan item, myUNEC-style notification settings): one main switch over all reminders. Written before the change. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { reminderPlan, cleanReminderPrefs, buildSchedules, REMIND_DEFAULT } = H;
reset();
const T = (o) => ({ id: o.id, type: "expense", amount: 15, category: "digital", subcategory: "", merchant: "Azercell", note: "", date: "2026-10-20", recurring: true, recurFreq: "monthly", isActive: true, ...o });
const now = new Date(2026, 10, 13, 10, 0, 0);
const tx = [T({ id: 1, date: "2026-10-20" }), T({ id: 2, date: "2026-09-20" })];
const sch = buildSchedules(tx, []);

section("R66-1. The main switch");
ok(REMIND_DEFAULT.enabled === true && cleanReminderPrefs(null).enabled === true, "on by default, so nobody's existing reminders stop after the update");
ok(cleanReminderPrefs({ bills: true }).enabled === true, "a saved choice from an older version (no main switch) keeps reminders on");
ok(cleanReminderPrefs({ enabled: false }).enabled === false && cleanReminderPrefs({ enabled: "no" }).enabled === true, "only a real 'false' turns everything off");
const onPlan = reminderPlan(sch, tx, { ...REMIND_DEFAULT, recurring: true, daily: true }, now);
ok(onPlan.length > 0, "with the main switch on, the chosen reminders are planned", onPlan.length);
const offPlan = reminderPlan(sch, tx, { ...REMIND_DEFAULT, recurring: true, daily: true, enabled: false }, now);
ok(eq(offPlan, []), "with the main switch off, nothing at all is planned");
const kept = cleanReminderPrefs({ recurring: true, daily: true, enabled: false });
ok(kept.recurring === true && kept.daily === true, "turning the main switch off keeps the person's choices for when it is turned back on");
finish("run66notif");
