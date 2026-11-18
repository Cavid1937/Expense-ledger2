// Run 108 (release readiness): every spending figure (month totals, categories, budgets, pace, coach) is computed from one list in which
// the app applies its own rules: a debt repayment is not spending, a loan instalment counts only its interest, money someone will pay back
// is not your spending, a "refund of" lowers that category in its month, and a big cost may be spread over months. Hand-picked cases are
// covered in the Run 17/36/41/43 tests; this applies the rules to 400 random lists that mix all of them and checks that no money is created
// or lost: the only difference to the raw cash is what the rules say it should be, to the qapik. Synthetic data only.
import { H, ok, section, finish, reset, T } from "./lib.mjs";
const { forSpending, reimbOwedMap } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(36108);
const int = (n) => Math.floor(r() * n);
const pad = (n) => String(n).padStart(2, "0");
const today = new Date(globalThis.__NOW || Date.now()), todayS = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
// dates from 3 months back to 1 month ahead of today, so some refunds have not happened yet
const day = () => { const d = new Date(today.getFullYear(), today.getMonth() - 3, 1 + int(120)); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const c = (v) => Math.round(Number(v) * 100);
const CATS = ["food", "transport", "shopping"];

section("R108-SP. 400 random lists: the spending rules move money only where they say, to the qapik");
const problems = [];
let rows = 0, refunds = 0, spreads = 0, loans = 0, reimbs = 0;
for (let g = 0; g < 400; g++) {
  const list = [];
  let id = g * 1000;
  for (let i = 0, n = 5 + int(40); i < n; i++) {
    const k = r(), date = day(), amount = (1 + int(50000)) / 100, cat = CATS[int(3)];
    if (k < 0.45) {
      const e = T({ id: ++id, type: "expense", category: cat, amount, date });
      if (r() < 0.15) { e.spread = 2 + int(23); spreads++; }
      if (r() < 0.15) { e.reimb = { amt: Math.max(0.01, Math.round(amount * (0.2 + r()) * 100) / 100), who: "Ali" }; reimbs++; }
      list.push(e);
    } else if (k < 0.6) { refunds++; list.push(T({ id: ++id, type: "income", category: "refund", refundFor: cat, amount, date })); }
    else if (k < 0.7) { loans++; list.push(T({ id: ++id, type: "expense", category: "other", amount, date, loan: { interest: r() < 0.3 ? null : Math.round(amount * r() * 1.3 * 100) / 100 } })); }
    else if (k < 0.78) list.push(T({ id: ++id, type: r() < 0.5 ? "expense" : "income", category: "other", amount, date, debtLink: { debtId: "d1", paymentId: "p" + id } }));
    else if (k < 0.88) list.push(T({ id: ++id, type: "income", category: "salary", amount, date }));
    else {
      // a pay-back for an earlier expense that expects one (sometimes more than was owed)
      const ex = list.filter((x) => x.reimb); if (!ex.length) continue;
      const e = ex[int(ex.length)]; list.push(T({ id: ++id, type: "income", category: "refund", reimbFor: e.id, amount: Math.round(e.reimb.amt * (0.3 + r()) * 100) / 100, date }));
    }
  }
  const out = forSpending(list);
  rows += out.length;
  // 1) nothing invalid comes out
  // (a later slice of zero is unavoidable only when less than one qapik a month is left to spread: 0.11 manat over 17 months)
  if (out.some((x) => !(c(x.amount) > 0) && !(x.spreadSlice && x.spreadSlice.i > 0 && c(x.spreadSlice.total) < x.spreadSlice.n))) { problems.push(`list ${g}: an amount of zero or below in the spending list`); continue; }
  if (out.some((x) => x.debtLink)) problems.push(`list ${g}: a debt repayment counted as spending or income`);
  // 2) the rules, worked out independently from the raw list
  const net = (l) => l.reduce((s, x) => s + (x.type === "income" ? c(x.amount) : -c(x.amount)), 0);
  const base = list.filter((x) => !x.debtLink).flatMap((x) => {
    if (!x.loan) return [x];
    const part = x.loan.interest === null ? 0 : Math.min(c(x.loan.interest), c(x.amount));
    return part > 0 ? [{ ...x, amount: part / 100 }] : [];
  });
  // money others still owe stays out of your spending without having come in yet: that is the one allowed gap
  const owed = [...reimbOwedMap(list).values()].reduce((s, v) => s + c(v), 0);
  if (net(out) !== net(base) + owed) problems.push(`list ${g}: money in minus spending is ${net(out) / 100}, expected ${(net(base) + owed) / 100} (raw ${net(base) / 100} + still owed ${owed / 100})`);
  // 3) a spread cost: its slices add up to what was left of it, one per month
  const slices = new Map();
  out.filter((x) => x.spreadSlice).forEach((x) => { const s = slices.get(x.spreadSlice.id) || { n: x.spreadSlice.n, sum: 0, k: 0, total: c(x.spreadSlice.total), months: new Set() }; s.sum += c(x.amount); s.k++; s.months.add(String(x.date).slice(0, 7)); slices.set(x.spreadSlice.id, s); });
  for (const [sid, s] of slices) if (s.sum !== s.total || s.k !== s.n || s.months.size !== s.n) problems.push(`list ${g}: spread entry ${sid} has ${s.k} slices in ${s.months.size} months adding up to ${s.sum / 100}, expected ${s.n} adding up to ${s.total / 100}`);
  // 4) a refund never takes a category's month below zero, and one dated after today lowers nothing yet
  const futureRefunds = list.filter((x) => x.refundFor && x.date > todayS);
  for (const f of futureRefunds) if (!out.some((x) => x.id === f.id && c(x.amount) === c(f.amount))) { problems.push(`list ${g}: a refund dated ${f.date} (after today) already lowered spending`); break; }
}
ok(problems.length === 0, `400 lists (${refunds} refunds, ${reimbs} paid-for-others, ${spreads} spread costs, ${loans} loan instalments): ${rows} spending rows, nothing created or lost`, problems.slice(0, 5));
finish("run108spendprop");
