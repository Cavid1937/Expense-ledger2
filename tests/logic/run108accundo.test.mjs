// Run 108 (release readiness): removing an account must never lose or change money, and Undo must put everything back exactly.
// Hand-picked cases are in the Run 51 tests; this builds 300 random ledgers through the app's own add functions, removes a random
// account (moving its entries to another account or to "no account"), and checks: every entry keeps its id, amount, date and type;
// only entries of the removed account change, and only their account; the other accounts keep their balance except for the moved
// entries and the removed transfers; and Undo straight after gives back the same accounts (same order), transfers and entries.
// Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { addAccount, addTransfer, accountBalances, removeAccountSafely, restoreRemovedAccount, cleanAccountData } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(5108);
const int = (n) => Math.floor(r() * n);
const pad = (n) => String(n).padStart(2, "0");
const day = () => `2026-${pad(1 + int(12))}-${pad(1 + int(28))}`;
const KINDS = ["cash", "card", "credit", "wallet", "savings", "other"];
const AS_OF = "2026-12-31";
const c = (v) => Math.round(v * 100);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

section("R108-ACC. 300 random ledgers: removing an account moves money exactly, and Undo gives everything back");
const problems = [];
let removed = 0, moved = 0, dropped = 0;
for (let g = 0; g < 300; g++) {
  let data = { accounts: [], transfers: [] };
  for (let i = 0, n = 2 + int(6); i < n; i++) {
    const res = addAccount(data, `Acc ${g}-${i}`, KINDS[int(6)], (r() < 0.3 ? 0 : (r() < 0.2 ? -1 : 1) * (1 + int(1000000))) / 100, r() < 0.5 ? day() : "");
    if (res.added) data = res.data;
  }
  const ids = data.accounts.map((a) => a.id);
  const txns = [];
  for (let i = 0, n = int(120); i < n; i++) {
    const account = r() < 0.15 ? undefined : ids[int(ids.length)];
    txns.push({ id: g * 1000 + i, type: r() < 0.3 ? "income" : "expense", amount: (1 + int(500000)) / 100, date: day(), category: "other", merchant: "", note: "", ...(account ? { account } : {}) });
  }
  for (let i = 0, n = int(25); i < n; i++) {
    const res = addTransfer(data, ids[int(ids.length)], ids[int(ids.length)], (1 + int(200000)) / 100, day());
    if (res.added) data = res.data;
  }
  data = cleanAccountData(data);
  const before = accountBalances(data, txns, AS_OF);
  const gone = ids[int(ids.length)], others = ids.filter((x) => x !== gone);
  const moveTo = r() < 0.5 ? others[int(others.length)] : "";
  const res = removeAccountSafely(data, gone, txns, moveTo);
  if (!res.ok) { problems.push(`ledger ${g}: removal refused (${res.reason})`); continue; }
  removed++; moveTo ? moved++ : dropped++;
  // 1) no entry lost or changed, except the account of the removed account's entries
  if (res.transactions.length !== txns.length) problems.push(`ledger ${g}: ${res.transactions.length} entries after removal, ${txns.length} before`);
  res.transactions.forEach((x, i) => {
    const o = txns[i], { account: a1, ...r1 } = x, { account: a0, ...r0 } = o;
    if (!same(r1, r0)) problems.push(`ledger ${g}: entry ${o.id} changed beyond its account`);
    const want = a0 === gone ? (moveTo || undefined) : a0;
    if (a1 !== want) problems.push(`ledger ${g}: entry ${o.id} now on ${a1}, expected ${want}`);
  });
  if (res.data.accounts.some((a) => a.id === gone) || res.data.transfers.some((t) => t.from === gone || t.to === gone)) problems.push(`ledger ${g}: the removed account or one of its transfers is still there`);
  // 2) the other balances move only by what the rules say: the moved entries and the removed transfers
  const after = accountBalances(res.data, res.transactions, AS_OF);
  for (const id of others) {
    let want = c(before[id]);
    data.transfers.forEach((t) => { if (t.date > AS_OF) return; if (t.from === gone && t.to === id) want -= c(t.amount); if (t.to === gone && t.from === id) want += c(t.amount); });
    if (id === moveTo) txns.forEach((t) => { if (t.account === gone && t.date <= AS_OF) want += t.type === "income" ? c(t.amount) : -c(t.amount); });
    if (c(after[id]) !== want) { problems.push(`ledger ${g} ${id}: balance ${after[id]} after removal, expected ${want / 100}`); break; }
  }
  // 3) Undo straight after: exactly what was there before
  const back = restoreRemovedAccount(res.data, res.transactions, res.removed);
  if (!back.ok) { problems.push(`ledger ${g}: Undo refused`); continue; }
  if (!same(back.data.accounts, data.accounts)) problems.push(`ledger ${g}: accounts differ after Undo`);
  const byId = (l) => [...l].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (!same(byId(back.data.transfers), byId(data.transfers))) problems.push(`ledger ${g}: transfers differ after Undo`);
  if (!same(back.transactions, txns)) problems.push(`ledger ${g}: entries differ after Undo`);
  if (!same(accountBalances(back.data, back.transactions, AS_OF), before)) problems.push(`ledger ${g}: balances differ after Undo`);
}
ok(problems.length === 0 && removed === 300, `${removed} removals (${moved} moved to another account, ${dropped} to no account): no money lost, Undo exact`, problems.slice(0, 5));
finish("run108accundo");
