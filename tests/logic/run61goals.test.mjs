// Run 61 (owner batch C7/C8): money is added to goals with a history, corrections are recorded, the day a goal is reached is kept,
// and older goals and backups keep working. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { cleanContribs, goalAddMoney, goalSetTotal, goalHistory, applyRollover, planImport } = H;
reset();
const G = (o = {}) => ({ id: "g1", name: "Laptop", target: 1000, saved: 300, monthlyTarget: 0, targetDate: null, ...o });

section("R61-1. Adding money");
let r = goalAddMoney(G(), 150, "  birthday money ", "2026-11-01");
ok(r.goal.saved === 450 && r.goal.contribs.length === 1 && r.goal.contribs[0].amount === 150 && r.goal.contribs[0].note === "birthday money" && r.goal.contribs[0].date === "2026-11-01" && !r.reached && !r.goal.doneAt, "300 + 150 = 450, one history line with the note and the day; not reached yet");
let h = goalHistory(r.goal);
ok(h.before === 300 && h.lines.length === 1 && h.first === "2026-11-01", "an older goal: the 300 it held before shows as 'before the history began'");
r = goalAddMoney(r.goal, 0.1, "", "2026-11-02"); r = goalAddMoney(r.goal, 0.2, "", "2026-11-02");
ok(r.goal.saved === 450.3, "cents stay exact: 450 + 0.10 + 0.20 = 450.30", r.goal.saved);
const reach = goalAddMoney(r.goal, 549.7, "", "2026-11-20");
ok(reach.goal.saved === 1000 && reach.reached && reach.goal.doneAt === "2026-11-20", "449.70 more reaches exactly 1,000: reached, on 20 Nov");
const more = goalAddMoney(reach.goal, 50, "", "2026-11-25");
ok(more.goal.saved === 1050 && !more.reached && more.goal.doneAt === "2026-11-20", "adding after it was reached keeps the first reached day and does not celebrate again");
ok(goalAddMoney(G(), 0).goal.saved === 300 && goalAddMoney(G(), -5).goal.saved === 300 && goalAddMoney(G(), "x").goal.saved === 300, "zero, negative or text adds nothing");

section("R61-2. Correcting the total");
let s = goalSetTotal(G(), 250, "2026-11-03");
ok(s.goal.saved === 250 && s.goal.contribs[0].amount === -50 && s.goal.contribs[0].src === "set", "setting 250 when it held 300 records -50 as a correction");
h = goalHistory(s.goal);
ok(h.before === 300 && h.before + h.lines.reduce((a, c) => a + c.amount, 0) === 250, "the history always adds up to the total: 300 - 50 = 250");
const same = goalSetTotal(G(), 300);
ok(same.goal.saved === 300 && same.goal.contribs === undefined && !same.reached, "the same total records nothing");
const down = goalSetTotal(goalAddMoney(G(), 700, "", "2026-11-04").goal, 900, "2026-11-05");
ok(down.goal.saved === 900 && !down.goal.doneAt, "a goal corrected below its target is no longer marked reached");

section("R61-3. Leftover from last month goes into the history");
const lg = applyRollover([G()], "g1", 120, "2026-11-02")[0];
ok(lg.saved === 420 && lg.contribs.length === 1 && lg.contribs[0].src === "leftover" && lg.contribs[0].amount === 120, "300 + 120 = 420, written as 'from last month's leftover'");

section("R61-4. Saved data and older backups");
ok(eq(cleanContribs([{ id: "c1", date: "2026-11-01", amount: 10, src: "add" }, { id: "c1", date: "2026-11-01", amount: 5 }, { id: "c2", date: "bad", amount: 5 }, { id: "c3", date: "2026-11-01", amount: 0 }, { id: "c4", date: "2026-11-01", amount: 1.005 }, { id: "c5", date: "2026-11-01", amount: -3, src: "weird" }]),
  [{ id: "c1", date: "2026-11-01", amount: 10, src: "add" }, { id: "c5", date: "2026-11-01", amount: -3, src: "add" }]), "only clean history lines are kept (no duplicate id, real date, non-zero amount in cents)");
const file = JSON.stringify({ version: 10, transactions: [], budgets: {}, templates: [], currency: "₼", goals: [G({ saved: 450, contribs: [{ id: "c1", date: "2026-11-01", amount: 150, src: "add" }], doneAt: "2026-11-20" })] });
const p = planImport(file, "b.json");
const g = p.settings && p.settings.goals && p.settings.goals[0];
ok(g && g.saved === 450 && g.contribs && g.contribs.length === 1 && g.doneAt === "2026-11-20", "a backup keeps the history and the reached day", g);
const oldFile = JSON.stringify({ version: 10, transactions: [], budgets: {}, templates: [], currency: "₼", goals: [G()] });
const og = planImport(oldFile, "old.json").settings.goals[0];
ok(og.saved === 300 && !("contribs" in og) && !("doneAt" in og), "an older backup without history imports exactly as before");
finish("run61goals");
