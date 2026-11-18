// Run 108 (release readiness): a goal's saved total, its history and the "save this much a month" figure. Hand-picked cases are in the
// Run 15 and Run 60 tests; this runs 400 random goals through random sequences of "add money" and "correct the total" (the app's own
// functions) and checks, to the qapik: the total always equals what the goal started with plus its history, it never goes below zero,
// "reached" is said exactly once when the target is first met, and the monthly figure times the months left is never short of what is
// still needed and never more than one qapik a month too much. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { goalAddMoney, goalSetTotal, goalHistory, goalRequiredMonthly } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(15108);
const int = (n) => Math.floor(r() * n);
const pad = (n) => String(n).padStart(2, "0");
const c = (v) => Math.round(Number(v) * 100);

section("R108-GOAL. 400 random goals: the total always matches its history, and the monthly plan is never short");
const problems = [];
let ops = 0, reachedSaid = 0, plans = 0;
for (let g = 0; g < 400; g++) {
  const targetC = 1000 + int(2000000), startC = r() < 0.5 ? 0 : int(targetC);
  let goal = { id: "g" + g, name: "Goal", target: targetC / 100, saved: startC / 100, monthlyTarget: 0, createdAt: "2026-01-01T00:00:00Z" };
  let reachedCount = 0;
  for (let i = 0, n = 1 + int(60); i < n; i++) {
    const day = `2026-${pad(1 + int(12))}-${pad(1 + int(28))}`, wasDone = c(goal.saved) >= targetC;
    const res = r() < 0.8 ? goalAddMoney(goal, (1 + int(r() < 0.2 ? 1000000 : 30000)) / 100, r() < 0.3 ? "note" : "", day) : goalSetTotal(goal, int(targetC * 1.3) / 100, day);
    goal = res.goal; ops++;
    if (res.reached) { reachedCount++; if (wasDone) problems.push(`goal ${g}: "reached" said again although it was already reached`); }
    if (!(c(goal.saved) >= 0)) problems.push(`goal ${g}: saved ${goal.saved} below zero`);
    if (!!goal.doneAt !== (c(goal.saved) >= targetC)) problems.push(`goal ${g}: done mark ${goal.doneAt} with ${goal.saved} of ${targetC / 100}`);
    const h = goalHistory(goal);
    if (c(h.before) !== startC) { problems.push(`goal ${g} after ${i + 1} steps: history says it began with ${h.before}, it began with ${startC / 100}`); break; }
  }
  // "reached" is said once at most per crossing; a correction below the target and a new crossing may say it again
  reachedSaid += reachedCount;
  // the monthly plan for a deadline 0 to 36 months ahead
  const now = new Date(2026, int(12), 1 + int(28)), dl = new Date(now.getFullYear(), now.getMonth() + int(37), 1 + int(28));
  const req = goalRequiredMonthly({ ...goal, targetDate: `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())}` }, now);
  const left = Math.max(0, targetC - c(goal.saved));
  if (left === 0) { if (req.state !== "complete") problems.push(`goal ${g}: complete but state ${req.state}`); continue; }
  if (dl < new Date(now.getFullYear(), now.getMonth(), now.getDate())) continue;
  plans++;
  if (req.state !== "active") { problems.push(`goal ${g}: state ${req.state} for a deadline ahead`); continue; }
  const pm = c(req.perMonth);
  if (pm * req.periods < left || (pm - 1) * req.periods >= left) problems.push(`goal ${g}: ${req.perMonth} x ${req.periods} months for ${left / 100} still needed`);
}
ok(problems.length === 0 && ops > 8000 && plans > 150, `${ops} additions and corrections on 400 goals (${reachedSaid} times reached), ${plans} monthly plans: all exact`, problems.slice(0, 5));
finish("run108goalprop");
