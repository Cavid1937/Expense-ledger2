// Run 108 (release readiness): an account's balance is the figure people check against their bank. Hand-picked cases are covered in
// the accounts tests; this builds 200 random ledgers (up to 8 accounts of every kind with positive, negative or no opening amount,
// up to 300 entries and 60 transfers, some dated after "today", some with no date, some on an account that does not exist) through
// the app's own add functions, and compares every balance and the credit-card amount still owed with an independent calculation in
// whole qapik. Moving money between accounts must never change the total. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { addAccount, addTransfer, accountBalances, creditOwed } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(20261118);
const int = (n) => Math.floor(r() * n);
const pad = (n) => String(n).padStart(2, "0");
const day = () => `2026-${pad(1 + int(12))}-${pad(1 + int(28))}`;
// whole qapik first, so the independent sums are exact integers
const qapik = () => { const k = r(); return k < 0.4 ? 1 + int(10000) : k < 0.8 ? 1 + int(10000000) : k < 0.95 ? 1 + int(99999999999) : [1, 10, 29, 57, 101, 99999999999][int(6)]; };
const KINDS = ["cash", "card", "credit", "wallet", "savings", "other"];
const AS_OF = "2026-07-15";

section("R108-BAL. 200 random ledgers: every balance and the card amount owed equal an independent calculation to the qapik");
const problems = [];
let checked = 0, moved = 0;
for (let g = 0; g < 200; g++) {
  let data = { accounts: [], transfers: [] };
  const open = {}, kind = {};
  for (let i = 0, n = 1 + int(8); i < n; i++) {
    const c = r() < 0.2 ? 0 : (r() < 0.25 ? -1 : 1) * qapik(), k = KINDS[int(KINDS.length)];
    const res = addAccount(data, `Acc ${g}-${i}`, k, c / 100, r() < 0.5 ? day() : "");
    if (!res.added) { problems.push(`ledger ${g}: account ${i} refused (${res.reason})`); continue; }
    data = res.data; open[res.id] = c; kind[res.id] = k;
  }
  const ids = Object.keys(open), want = { ...open };
  const txns = [];
  for (let i = 0, n = int(300); i < n; i++) {
    const type = r() < 0.3 ? "income" : "expense", c = qapik(), date = r() < 0.05 ? "" : day();
    const account = r() < 0.1 ? (r() < 0.5 ? "a_gone99" : undefined) : ids[int(ids.length)];
    txns.push({ id: g * 1000 + i, type, amount: c / 100, date, category: "other", merchant: "", note: "", ...(account ? { account } : {}) });
    if (account in want && (!date || date <= AS_OF)) want[account] += type === "income" ? c : -c;
  }
  for (let i = 0, n = ids.length > 1 ? int(60) : 0; i < n; i++) {
    const from = ids[int(ids.length)], to = ids[int(ids.length)], c = qapik(), date = day();
    const res = addTransfer(data, from, to, c / 100, date);
    if (from === to) { if (res.added) problems.push(`ledger ${g}: a transfer to the same account was accepted`); continue; }
    if (!res.added) { if (res.reason !== "full") problems.push(`ledger ${g}: transfer refused (${res.reason})`); continue; }
    data = res.data;
    if (date <= AS_OF) { want[from] -= c; want[to] += c; moved++; }
  }
  const got = accountBalances(data, txns, AS_OF);
  for (const id of ids) {
    checked++;
    if (got[id] !== want[id] / 100) { problems.push(`ledger ${g} ${id} (${kind[id]}): app ${got[id]} / expected ${want[id] / 100}`); break; }
  }
  if (Object.keys(got).length !== ids.length) problems.push(`ledger ${g}: ${Object.keys(got).length} balances for ${ids.length} accounts`);
  // transfers only move money: the total equals openings plus entries, as if no transfer had happened
  const noMoves = accountBalances({ accounts: data.accounts, transfers: [] }, txns, AS_OF);
  const sum = (o) => Object.values(o).reduce((s, v) => s + Math.round(v * 100), 0);
  if (sum(got) !== sum(noMoves)) problems.push(`ledger ${g}: transfers changed the total by ${(sum(got) - sum(noMoves)) / 100}`);
  const owed = ids.filter((id) => kind[id] === "credit").reduce((s, id) => s + Math.max(0, -want[id]), 0);
  if (creditOwed(data, txns, AS_OF) !== owed / 100) problems.push(`ledger ${g}: card owed app ${creditOwed(data, txns, AS_OF)} / expected ${owed / 100}`);
}
ok(problems.length === 0 && checked > 500 && moved > 1000, `${checked} balances and 200 card totals checked (${moved} transfers counted), all exact`, problems.slice(0, 5));
finish("run108balprop");
