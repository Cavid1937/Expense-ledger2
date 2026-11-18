// Run 108 (release readiness): "Tidy up categories" and "link entries to an account" change many entries at once, so their Undo must be
// exact. Hand-picked cases are in the Run 58 and Run 51 tests; this applies them to 300 random lists (with repeating entries, bill
// payments, loans and debt repayments mixed in, which tidy must never touch) and checks that only the allowed fields of the allowed
// entries change, no amount or date moves, and Undo straight after gives back the same list. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { TIDY_MOVES, tidyPlan, applyTidy, undoTidy, applyLink, undoLink } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(58108);
const int = (n) => Math.floor(r() * n);
const pad = (n) => String(n).padStart(2, "0");
const day = () => `2026-${pad(1 + int(12))}-${pad(1 + int(28))}`;
// JSON drops a key whose value is undefined, as saving does
const norm = (l) => JSON.stringify(JSON.parse(JSON.stringify(l)));
const LOCKS = [{ recurring: true }, { billId: "b1" }, { loan: { interest: 1 } }, { debtLink: { debtId: "d", paymentId: "p" } }];

const list = (g) => {
  const out = [];
  for (let i = 0, n = 5 + int(60); i < n; i++) {
    const m = TIDY_MOVES[int(TIDY_MOVES.length)], k = r();
    const sub = k < 0.6 ? (r() < 0.3 ? m.from[1].toUpperCase() : m.from[1]) : k < 0.8 ? "" : "Something";
    out.push({ id: r() < 0.5 ? g * 1000 + i : `s${g}-${i}`, type: r() < 0.85 ? "expense" : "income", amount: (1 + int(90000)) / 100, date: day(), category: k < 0.9 ? m.from[0] : "food",
      ...(sub ? { subcategory: sub } : {}), merchant: "", note: "", ...(r() < 0.2 ? LOCKS[int(4)] : {}), ...(r() < 0.3 ? { wallet: "card" } : {}), ...(r() < 0.2 ? { account: "a_old1" } : {}) });
  }
  return out;
};

section("R108-UNDO. 300 random lists: tidy and account links change only what they say, and Undo is exact");
const problems = [];
let moved = 0, linked = 0;
for (let g = 0; g < 300; g++) {
  const txns = list(g), orig = norm(txns);
  // Tidy: a random choice of the offered groups
  const plan = tidyPlan(txns, "2026-06");
  const keys = plan.filter(() => r() < 0.6).map((p) => p.key);
  const res = applyTidy(txns, plan, keys);
  if (norm(txns) !== orig) problems.push(`list ${g}: tidy changed the list it was given`);
  res.transactions.forEach((x, i) => {
    const o = txns[i];
    if (x === o) return;
    if (o.recurring || o.billId || o.loan || o.debtLink) problems.push(`list ${g}: tidy moved a locked entry ${o.id}`);
    if (o.type !== "expense") problems.push(`list ${g}: tidy moved an income ${o.id}`);
    const { category: c1, subcategory: s1, ...r1 } = x, { category: c0, subcategory: s0, ...r0 } = o;
    if (norm(r1) !== norm(r0)) problems.push(`list ${g}: tidy changed more than the category of ${o.id}`);
    const m = TIDY_MOVES.find((t) => t.from[0] === c0 && t.from[1].toLowerCase() === String(s0 || "").toLowerCase());
    if (!m || !keys.includes(m.key) || c1 !== m.to[0] || s1 !== m.to[1]) problems.push(`list ${g}: entry ${o.id} moved to ${c1}/${s1}, not by a ticked move`);
  });
  const ticked = new Set(plan.filter((p) => keys.includes(p.key)).flatMap((p) => p.ids.map(String)));
  if (res.moved !== ticked.size) problems.push(`list ${g}: ${res.moved} moved, ${ticked.size} ticked`);
  moved += res.moved;
  if (norm(undoTidy(res.transactions, res.before)) !== orig) problems.push(`list ${g}: tidy Undo did not give the list back`);
  // Link: random ids to one account; entries that already have an account keep it
  const ids = txns.filter(() => r() < 0.5).map((x) => x.id);
  const after = applyLink(txns, ids, "a_new");
  after.forEach((x, i) => {
    const o = txns[i], want = ids.includes(o.id) && !o.account ? "a_new" : o.account;
    if (x.account !== want) problems.push(`list ${g}: entry ${o.id} on ${x.account}, expected ${want}`);
    const { account: a1, ...r1 } = x, { account: a0, ...r0 } = o;
    if (norm(r1) !== norm(r0)) problems.push(`list ${g}: link changed more than the account of ${o.id}`);
    if (x.account === "a_new" && o.account !== "a_new") linked++;
  });
  if (norm(undoLink(after, ids, "a_new")) !== orig) problems.push(`list ${g}: link Undo did not give the list back`);
}
ok(problems.length === 0 && moved > 1000 && linked > 1000, `300 lists: ${moved} entries tidied and ${linked} linked, nothing else changed, Undo exact`, problems.slice(0, 5));
finish("run108undoprop");
