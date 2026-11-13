// Run 75: the monthly summary built on the phone, and its reminder. Expected figures worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { monthReport, monthReportText, reminderPlan, cleanReminderPrefs, reminderMessage, setLang } = H;
reset();
const E = (o) => ({ id: Math.random(), type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-10-05", recurring: false, isActive: true, ...o });
const tx = [
  E({ type: "income", category: "salary", amount: 1000, date: "2026-10-01" }),
  E({ type: "income", category: "refund", amount: 20, date: "2026-10-03" }),
  E({ type: "income", category: "savout", amount: 300, date: "2026-10-04" }),
  E({ amount: 120.5, date: "2026-10-06" }), E({ amount: 49.5, date: "2026-10-20" }), E({ category: "transport", amount: 30, date: "2026-10-21" }),
  E({ amount: 150, date: "2026-09-10" }),
];
const now = new Date(2026, 10, 2, 10, 0, 0);

section("R75-R1. Last month's figures, by the app's own rules");
const r = monthReport({ transactions: tx, budgets: { food: 150, transport: 100 }, goals: [{ name: "Laptop", saved: 600, target: 2000 }] }, "2026-10", now);
ok(r.earned === 1000 && r.refunds === 20 && r.spent === 200 && r.net === 820, "earned 1,000 + refunds 20 − spent 200 = 820 surplus; the 300 taken from savings is not income", r);
ok(r.prevSpent === 150, "the month before: 150 spent");
ok(r.top.length === 2 && r.top[0].cat === "food" && r.top[0].amt === 170 && r.top[1].cat === "transport" && r.top[1].amt === 30, "where the money went: Food 170, Transport 30", r.top);
ok(r.over.length === 1 && r.over[0].cat === "food" && r.over[0].spent === 170 && r.over[0].limit === 150, "the Food budget (150) was exceeded; Transport (100) was not", r.over);
ok(r.count === 6 && r.goals[0].name === "Laptop", "6 entries in October; goals listed");

section("R75-R2. The shared text");
setLang("en");
const txt = monthReportText(r, "₼", (c) => c);
ok(/Earned: 1,000\.00/.test(txt) && /Spent: 200\.00/.test(txt) && /surplus\): 820\.00/.test(txt) && /50\.00 ₼ more spending than the month before/.test(txt), "the text has the figures and the change from the month before", txt);
ok(/• food: 170\.00 ₼ \/ 150\.00 ₼/.test(txt) && /6 entries recorded\./.test(txt), "it lists the exceeded budget and how many entries were recorded");
const deficit = monthReportText({ ...r, net: -40.25, prevSpent: 0 }, "₼", (c) => c);
ok(/deficit\): 40\.25/.test(deficit) && !/month before/.test(deficit), "a deficit is written as such (no minus sign confusion), and no comparison when there is no earlier month");

section("R75-R3. The reminder on the 1st (off unless chosen)");
ok(cleanReminderPrefs(null).report === false && cleanReminderPrefs({ report: true }).report === true, "off by default; turning it on is kept");
const plan = reminderPlan([], [], { report: true, time: "09:00" }, new Date(2026, 10, 13, 12, 0, 0));
ok(plan.length === 2 && plan[0].kind === "report" && plan[0].date === "2026-12-01" && plan[1].date === "2027-01-01", "it is planned for the 1st of the coming months (the 1st of this month has passed)", plan.map((p) => p.date));
ok(reminderPlan([], [], { report: true, enabled: false }, new Date(2026, 10, 13)).length === 0, "the main reminders switch still turns it off");
const m = reminderMessage(plan[0], { report: true }, "₼");
ok(/summary is ready/.test(m.title) && !/\d/.test(m.title + m.body), "the notification says the summary is ready and shows no amounts", m);
finish("run75report");
