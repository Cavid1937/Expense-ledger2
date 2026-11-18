// Run 108 (release readiness): the "money not spent" history was made faster in this run (entries sorted into months once). The month
// line and every row of the history must still be the same figure. This builds 300 random lists over 3 years (refunds, money others pay
// back, spread costs, loan instalments, debt repayments, savings withdrawals, entries dated ahead, some with a bad date) and checks every
// history row against the one-month function, the total against the sum of rows, and this month against the one-month function.
// Synthetic data only.
import { H, ok, section, finish, reset, T } from "./lib.mjs";
const { notSpentHistory, notSpentMonth } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(59108);
const int = (n) => Math.floor(r() * n);
const pad = (n) => String(n).padStart(2, "0");
const now = new Date(globalThis.__NOW || Date.now());
const day = () => { const d = new Date(now.getFullYear(), now.getMonth() - 36, 1 + int(36 * 31 + 40)); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const c = (v) => Math.round(v * 100);
const CATS = ["food", "transport", "shopping"];

section("R108-NS. 300 random lists: every row of the money-not-spent history equals the one-month figure");
const problems = [];
let rowsChecked = 0;
for (let g = 0; g < 300; g++) {
  const list = [];
  let id = g * 1000;
  for (let i = 0, n = int(200); i < n; i++) {
    const k = r(), date = r() < 0.02 ? "2026-13-40" : day(), amount = (1 + int(80000)) / 100;
    if (k < 0.45) { const e = T({ id: ++id, type: "expense", category: CATS[int(3)], amount, date }); if (r() < 0.1) e.spread = 2 + int(10); if (r() < 0.1) e.reimb = { amt: Math.round(amount * r() * 100) / 100 || 0.01, who: "Ali" }; list.push(e); }
    else if (k < 0.55) list.push(T({ id: ++id, type: "income", category: "refund", refundFor: CATS[int(3)], amount, date }));
    else if (k < 0.62) list.push(T({ id: ++id, type: "expense", category: "other", amount, date, loan: { interest: Math.round(amount * r() * 30) / 100 } }));
    else if (k < 0.68) list.push(T({ id: ++id, type: r() < 0.5 ? "expense" : "income", category: "other", amount, date, debtLink: { debtId: "d1", paymentId: "p" + id } }));
    else if (k < 0.72) list.push(T({ id: ++id, type: "income", category: "savings", amount, date }));
    else list.push(T({ id: ++id, type: "income", category: r() < 0.7 ? "salary" : "freelance", amount, date }));
  }
  const h = notSpentHistory(list, now);
  let sum = 0;
  for (const row of h.months) {
    rowsChecked++;
    const one = notSpentMonth(list, row.mon, now);
    if (c(one.in) !== c(row.in) || c(one.out) !== c(row.out) || c(one.net) !== c(row.net)) { problems.push(`list ${g} ${row.mon}: history ${JSON.stringify(row)} / month ${JSON.stringify(one)}`); break; }
    sum += c(row.net);
  }
  if (sum !== c(h.total)) problems.push(`list ${g}: total ${h.total}, rows add up to ${sum / 100}`);
  const cur = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`, one = notSpentMonth(list, cur, now);
  if (c(one.net) !== c(h.current.net) || c(one.in) !== c(h.current.in)) problems.push(`list ${g}: this month ${JSON.stringify(h.current)} / ${JSON.stringify(one)}`);
  if (h.months.some((m) => m.mon >= cur)) problems.push(`list ${g}: an unfinished month in the history`);
}
ok(problems.length === 0 && rowsChecked > 5000, `${rowsChecked} history rows, totals and this month: all equal the one-month figure`, problems.slice(0, 5));
finish("run108notspent");
