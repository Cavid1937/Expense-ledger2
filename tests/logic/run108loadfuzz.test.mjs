// Run 108 (release readiness, persistence and recovery): the ledger saved on the device can itself be damaged (a crash mid-write,
// an older or newer version, a browser bug, a person editing it). This test damages a saved ledger in hundreds of seeded,
// repeatable ways and opens the app on it each time. Whatever is stored: opening must not crash, nothing invalid may be shown,
// every saved entry must be either loaded or kept in a recovery copy (never silently dropped), the stored original is never
// rewritten while loading, and when a recovery copy cannot be made, saving is paused. Synthetic data only.
import { H, ok, section, finish, reset, T, KEY } from "./lib.mjs";
const { migrateAndLoad, getNotice, getSaveBlocked, isValidDateStr } = H;

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const pick = (r, a) => a[Math.floor(r() * a.length)];

const txns = [];
for (let i = 0; i < 30; i++) txns.push(T({ id: 700 + i, type: i % 6 === 0 ? "income" : "expense", category: i % 6 === 0 ? "salary" : ["food", "transport", "housing"][i % 3], amount: Math.round((2 + i * 11.13) * 100) / 100, merchant: "Shop " + (i % 4), date: `2026-${String(1 + (i % 10)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`, ...(i % 7 === 0 ? { recurring: true, recurFreq: "monthly" } : {}) }));
const stored = { transactions: txns, budgets: { food: 300 }, templates: [], currency: "₼", goals: [{ id: "g1", name: "Trip", target: 500, saved: 50, monthlyTarget: 50, createdAt: "2026-09-01T00:00:00Z" }],
  safeToSpend: { savingsTarget: 50, enabled: true }, bills: [{ id: "b1", name: "Rent", type: "expense", amount: 400, category: "housing", freq: "monthly", anchorDate: "2026-09-05", dueDay: 5, active: true }], lastBackup: null, backupConfirmedAt: null, language: "en", profileName: "", setupHidden: false };
const goodText = JSON.stringify(stored);

const badEntry = (t) => !(typeof t.amount === "number" && Number.isFinite(t.amount) && t.amount > 0 && t.amount <= 999999999.99 && Math.round(t.amount * 100) / 100 === t.amount)
  || !(typeof t.date === "string" && isValidDateStr(t.date)) || !["expense", "income"].includes(t.type) || typeof t.category !== "string" || typeof t.merchant !== "string" || typeof t.note !== "string"
  || Object.getPrototypeOf(t) !== Object.prototype;
// records kept aside in recovery copies during this load
const keptAside = () => { let n = 0; for (const [k, v] of globalThis.__store) if (k.startsWith(KEY + "__rejected_")) { try { const a = JSON.parse(v); n += Array.isArray(a) ? a.length : 0; } catch { } } return n; };
const corruptCopy = () => [...globalThis.__store].find(([k]) => k.startsWith(KEY + "__corrupt_"));
const open = (text, failCopies = false) => {
  reset();
  globalThis.__store.set(KEY, text);
  if (failCopies) globalThis.__failKeys = [KEY + "__"];
  return migrateAndLoad();
};

section("R108-L1. The undamaged saved ledger opens exactly, with no notice and saving allowed");
{
  const s = open(goodText);
  const same = JSON.stringify([...s.transactions].sort((a, b) => a.id - b.id)) === JSON.stringify([...txns].sort((a, b) => a.id - b.id));
  ok(s.transactions.length === 30 && same && !getNotice() && !getSaveBlocked() && globalThis.__store.get(KEY) === goodText, "30 entries, every field the same, no notice, saving allowed, stored text untouched", { n: s.transactions.length, same, notice: getNotice() });
}

const HOSTILE = [null, true, false, 0, -1, -0.01, 0.001, 12.345, 1e308, 1e21, "", " ", "NaN", "-5", "1e3", "12,5", "2026-02-30", "2026-13-01", "2026-1-5", " 2026-01-01",
  "__proto__", "constructor", "toString", "x".repeat(100000), "\u0000‮😀", "<img src=x onerror=alert(1)>", {}, [], [[]], { amount: 5 }, [1, 2, 3]];
const slots = (o, out = [], depth = 0) => { if (o && typeof o === "object" && depth < 6) for (const k of Object.keys(o)) { out.push([o, k]); slots(o[k], out, depth + 1); } return out; };
const mutate = (r, obj) => {
  const s = slots(obj); if (!s.length) return;
  const [par, k] = pick(r, s), op = r();
  if (op < 0.55) par[k] = structuredClone(pick(r, HOSTILE));
  else if (op < 0.7) delete par[k];
  else if (op < 0.8 && Array.isArray(obj.transactions) && obj.transactions.length) obj.transactions.push(structuredClone(pick(r, obj.transactions)));
  else if (op < 0.9 && par[k] && typeof par[k] === "object") par[k] = Array.isArray(par[k]) ? { ...par[k] } : Object.values(par[k]);
  else par[k] = typeof par[k] === "number" ? String(par[k]) : typeof par[k] === "string" && par[k] !== "" && !Number.isNaN(Number(par[k])) ? Number(par[k]) : par[k];
};
const textDamage = [
  (s) => s.slice(0, Math.floor(s.length * 0.6)),                     // write cut off half way
  (s) => s.replace('"transactions":[', '"__proto__":{"polluted":"yes"},"transactions":[{"__proto__":{"polluted":"yes"},"id":1,"type":"expense","amount":5,"date":"2026-10-01","category":"food"},'),
  (s) => s.replace('"budgets":{', '"budgets":{"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted":"yes"}},'),
  (s) => "﻿" + s, (s) => "", (s) => "null", (s) => "[]", (s) => '{"transactions":{}}', (s) => s.replace(/"amount":(\d+(\.\d+)?)/, '"amount":1e999'),
];

section("R108-L2. 600 damaged saved ledgers (half of them where no recovery copy can be made): opening never loses or invents anything");
const problems = [], seen = { opened: 0, entries: 0, aside: 0, corrupt: 0, blocked: 0, notices: 0 };
for (let i = 0; i < 600; i++) {
  // copies fail in cases 2 and 3 of every 4, so both kinds of damage meet both outcomes
  const r = rng(5000 + i), failCopies = i % 4 >= 2;
  let text, raw = null;
  if (i % 10 === 9) text = pick(r, textDamage)(goodText);
  else { const o = structuredClone(stored); const n = 1 + Math.floor(r() * 5); for (let j = 0; j < n; j++) mutate(r, o); text = JSON.stringify(o); }
  try { raw = JSON.parse(text); } catch { raw = null; }
  let s;
  try { s = open(text, failCopies); } catch (e) { problems.push(`#${i} opening threw ${e && e.message}`); continue; }
  seen.opened++;
  if (!s || !Array.isArray(s.transactions)) { problems.push(`#${i} no entry list`); continue; }
  if (globalThis.__store.get(KEY) !== text) problems.push(`#${i} the stored original was rewritten while opening`);
  const ids = new Set();
  for (const t of s.transactions) { if (badEntry(t) || ids.has(t.id)) { problems.push(`#${i} invalid entry shown: ${JSON.stringify(t).slice(0, 140)}`); break; } ids.add(t.id); }
  seen.entries += s.transactions.length;
  const usable = raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.transactions);
  if (usable) {
    const aside = keptAside(); seen.aside += aside;
    if (!failCopies && s.transactions.length + aside !== raw.transactions.length) problems.push(`#${i} ${raw.transactions.length} saved entries but ${s.transactions.length} loaded + ${aside} kept aside`);
    if (s.transactions.length < raw.transactions.length && !getNotice()) problems.push(`#${i} entries left out without a notice`);
    if (failCopies && s.transactions.length < raw.transactions.length && !getSaveBlocked()) problems.push(`#${i} entries left out, no recovery copy possible, but saving not paused`);
  } else {
    // nothing usable under the key: a byte-for-byte copy must be kept, or saving paused
    if (text !== null) {
      const c = corruptCopy();
      if (c) seen.corrupt++;
      if (!(c && c[1] === text) && !getSaveBlocked()) problems.push(`#${i} unusable saved data neither copied nor protected by paused saving`);
      if (!getNotice()) problems.push(`#${i} unusable saved data without a notice`);
    }
  }
  if (getSaveBlocked()) seen.blocked++;
  if (getNotice()) seen.notices++;
  if (({}).polluted !== undefined) { problems.push(`#${i} Object.prototype was changed`); delete Object.prototype.polluted; }
}
ok(problems.length === 0, `600 openings: ${seen.entries} entries shown, ${seen.aside} kept aside in recovery copies, ${seen.corrupt} whole-file copies, saving paused ${seen.blocked} times, ${seen.notices} notices; nothing lost, invented or rewritten`, problems.slice(0, 8));
ok(seen.aside > 50 && seen.corrupt >= 5 && seen.blocked > 20, "the damage really reached every path: rows set aside, whole files copied, saving paused", seen);
ok(({}).polluted === undefined, "no saved file could add a property to every object in the app");
finish("run108loadfuzz");
