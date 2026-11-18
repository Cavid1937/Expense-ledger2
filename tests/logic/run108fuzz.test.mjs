// Run 108 (release readiness, the trust boundary): a backup file is the one place where data the app did not make comes in. This test
// starts from a real backup built by the app and damages it in hundreds of seeded, repeatable ways (wrong types, impossible numbers and
// dates, huge text, built-in names such as "__proto__", duplicated ids, missing fields, lists where objects belong). Whatever the file,
// reading it must not crash, nothing invalid may reach the ledger, and the app's own objects must stay untouched. Synthetic data only.
import { H, ok, section, finish, reset, T } from "./lib.mjs";
const { planImportWithCats, applyImport, buildBackup, migrateAndLoad, isValidDateStr } = H;
reset();

// small seeded random generator, so a failure can be replayed exactly
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

const base = migrateAndLoad();
const txns = [];
for (let i = 0; i < 40; i++) txns.push(T({ id: 500 + i, type: i % 6 === 0 ? "income" : "expense", category: i % 6 === 0 ? "salary" : ["food", "transport", "housing"][i % 3], amount: Math.round((2 + i * 13.37) * 100) / 100, merchant: "Shop " + (i % 5), date: `2026-${String(1 + (i % 10)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`, ...(i % 9 === 0 ? { recurring: true, recurFreq: "monthly" } : {}) }));
const state = { ...base, transactions: txns, budgets: { food: 300, transport: 80 }, goals: [{ id: "g1", name: "Trip", target: 500, saved: 50, monthlyTarget: 50, createdAt: "2026-09-01T00:00:00Z" }],
  bills: [{ id: "b1", name: "Rent", type: "expense", amount: 400, category: "housing", freq: "monthly", anchorDate: "2026-09-05", dueDay: 5, active: true }], subcategories: { food: ["Bread"] } };
const good = buildBackup(state, "2026-11-18T08:00:00.000Z");
const goodText = JSON.stringify(good);

section("R108-F1. The untouched backup reads back exactly");
{
  const p = planImportWithCats(goodText, "backup.json");
  ok(p.ok && p.transactions.length === 40 && p.skippedCount === 0 && p.canReplace, "all 40 entries are read, none refused", { ok: p.ok, n: p.transactions && p.transactions.length, skipped: p.skippedCount });
  const next = applyImport({ ...base }, p, "replace");
  const again = JSON.stringify(buildBackup({ ...state, ...next, subcategories: state.subcategories }, "2026-11-18T08:00:00.000Z"));
  // Replace stores entries newest first, so the two lists are compared in id order
  const byId = (l) => JSON.stringify([...l].sort((a, b) => a.id - b.id));
  ok(JSON.parse(again).transactions.length === 40 && byId(JSON.parse(again).transactions) === byId(good.transactions), "backup -> import -> backup gives the same 40 entries, every field byte for byte");
}

const HOSTILE = [null, true, false, 0, -1, -0.01, 0.001, 12.345, 1e308, -1e308, 1e21, "", " ", "NaN", "Infinity", "-5", "1e3", "0x10", "12,5", "1.2.3", "2026-02-30", "2026-13-01", "2026-1-5", " 2026-01-01", "26-01-01",
  "__proto__", "constructor", "toString", "hasOwnProperty", "x".repeat(200000), "\u0000‮😀", "<img src=x onerror=alert(1)>", "=HYPERLINK(\"http://x\")", {}, [], [[]], { amount: 5 }, [1, 2, 3], { __proto__x: 1 }];
const pick = (r, a) => a[Math.floor(r() * a.length)];
// every place in the backup that holds a value: [parent, key]
const slots = (o, out = [], depth = 0) => { if (o && typeof o === "object" && depth < 6) for (const k of Object.keys(o)) { out.push([o, k]); slots(o[k], out, depth + 1); } return out; };
const mutate = (r, obj) => {
  const s = slots(obj); if (!s.length) return;
  const [par, k] = pick(r, s), op = r();
  if (op < 0.55) par[k] = structuredClone(pick(r, HOSTILE));
  else if (op < 0.7) delete par[k];
  else if (op < 0.8 && Array.isArray(obj.transactions) && obj.transactions.length) obj.transactions.push(structuredClone(pick(r, obj.transactions)));   // duplicate an entry (same id)
  else if (op < 0.9 && par[k] && typeof par[k] === "object") par[k] = Array.isArray(par[k]) ? { ...par[k] } : Object.values(par[k]);   // list <-> object
  else par[k] = typeof par[k] === "number" ? String(par[k]) : typeof par[k] === "string" && par[k] !== "" && !Number.isNaN(Number(par[k])) ? Number(par[k]) : par[k];   // number <-> text
};
// built-in names written straight into the JSON text (JSON.parse makes "__proto__" an own key, which is how an attack file arrives)
const textAttacks = [
  (s) => s.replace('"transactions":[', '"__proto__":{"polluted":"yes"},"transactions":[{"__proto__":{"polluted":"yes"},"id":1,"type":"expense","amount":5,"date":"2026-10-01","category":"food"},'),
  (s) => s.replace('"budgets":{', '"budgets":{"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted":"yes"}},'),
  (s) => s.replace('"category":"food"', '"category":"__proto__"'),
  (s) => s.replace('"merchant":"Shop 1"', '"merchant":"constructor"'),
  (s) => s.replace(/"amount":(\d+(\.\d+)?)/, '"amount":1e999'),
  (s) => s.replace(/"date":"[^"]+"/, '"date":"2026-02-29"'),
  (s) => s.slice(0, Math.floor(s.length / 2)),
  (s) => "﻿" + s,
];

// what an entry in the ledger must look like (the app's own rules: positive, whole cents, at most 999,999,999.99, a real calendar date)
const badEntry = (t) => !(typeof t.amount === "number" && Number.isFinite(t.amount) && t.amount > 0 && t.amount <= 999999999.99 && Math.round(t.amount * 100) / 100 === t.amount)
  || !(typeof t.date === "string" && isValidDateStr(t.date)) || !["expense", "income"].includes(t.type) || typeof t.category !== "string" || typeof t.merchant !== "string" || typeof t.note !== "string"
  || Object.getPrototypeOf(t) !== Object.prototype;
{
  const v = planImportWithCats(goodText, "backup.json").transactions[0];
  ok(!badEntry(v) && badEntry({ ...v, amount: 12.345 }) && badEntry({ ...v, amount: -5 }) && badEntry({ ...v, date: "2026-02-30" }) && badEntry({ ...v, type: "gift" }) && badEntry(Object.assign(Object.create({ x: 1 }), v)),
    "the check itself: a real entry passes; a third decimal, a minus, 30 February, an unknown type and a strange object are each caught");
}
section("R108-F2. 600 damaged backups: no crash, nothing invalid gets in, nothing outside the ledger changes");
const problems = [], seen = { ok: 0, refused: 0, entries: 0, skipped: 0 };
const finiteEverywhere = (v, path = "", out = []) => { if (typeof v === "number" && !Number.isFinite(v)) out.push(path); else if (v && typeof v === "object") for (const k of Object.keys(v)) finiteEverywhere(v[k], path + "." + k, out); return out; };
for (let i = 0; i < 600; i++) {
  const r = rng(1000 + i);
  let text;
  if (i % 10 === 9) text = pick(r, textAttacks)(goodText);
  else { const o = structuredClone(good); const n = 1 + Math.floor(r() * 5); for (let j = 0; j < n; j++) mutate(r, o); text = JSON.stringify(o); }
  let p;
  try { p = planImportWithCats(text, "backup.json"); } catch (e) { problems.push(`#${i} reading threw ${e && e.message}`); continue; }
  if (!p || typeof p.ok !== "boolean") { problems.push(`#${i} no answer`); continue; }
  if (!p.ok) { seen.refused++; if (typeof p.error !== "string" || !p.error.trim()) problems.push(`#${i} refused without a message`); continue; }
  seen.ok++; seen.entries += p.transactions.length; seen.skipped += p.skippedCount || 0;
  const ids = new Set();
  for (const t of p.transactions) {
    const bad = badEntry(t) || ids.has(t.id);
    ids.add(t.id);
    if (bad) { problems.push(`#${i} invalid entry let in: ${JSON.stringify(t).slice(0, 160)}`); break; }
  }
  const nf = finiteEverywhere({ s: p.settings, d: p.debtData, a: p.accountData });
  if (nf.length) problems.push(`#${i} impossible number kept at ${nf[0]}`);
  for (const mode of ["merge", "replace"]) {
    try {
      const before = JSON.stringify(state.transactions), next = applyImport(state, p, mode);
      if (JSON.stringify(state.transactions) !== before) problems.push(`#${i} ${mode} changed the existing ledger object`);
      if (!Array.isArray(next.transactions)) problems.push(`#${i} ${mode} left no entry list`);
      if (mode === "replace" && (p.skippedCount || 0) > 0 && next.transactions !== state.transactions) problems.push(`#${i} replace with refused rows replaced the ledger`);
      if (mode === "merge" && next.transactions.length < state.transactions.length) problems.push(`#${i} merge lost entries`);
    } catch (e) { problems.push(`#${i} ${mode} threw ${e && e.message}`); }
  }
  if (({}).polluted !== undefined || Object.prototype.polluted !== undefined) { problems.push(`#${i} Object.prototype was changed`); delete Object.prototype.polluted; }
}
ok(problems.length === 0, `600 files: ${seen.ok} readable (${seen.entries} entries kept, ${seen.skipped} refused rows), ${seen.refused} refused whole with a message; no crash, no invalid entry, no impossible number, ledger never changed in place`, problems.slice(0, 8));
ok(seen.ok > 100 && seen.refused >= 3 && seen.skipped > 50, "the damage really reached both outcomes: files read with rows refused, and files refused whole", seen);
ok(({}).polluted === undefined, "no file could add a property to every object in the app");
finish("run108fuzz");
