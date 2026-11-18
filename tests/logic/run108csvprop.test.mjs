// Run 108 (release readiness): the app's own CSV file is how people take their data to a spreadsheet and back. Hand-picked cases
// are covered elsewhere (run16, run32csv, security); this checks the round trip on 2,000 random valid entries with awkward text
// (quotes, commas, line breaks, text that looks like a formula or a number, emoji, Azerbaijani and Russian letters) and amounts
// from 0.01 to 999,999,999.99. Every amount must come back to the cent, every date, type and text exactly. Synthetic data only.
import { H, ok, section, finish, reset, T } from "./lib.mjs";
const { buildCsv, planImportWithCats } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(108108);
const pick = (a) => a[Math.floor(r() * a.length)];
const BITS = ["Bravo", "Araz", "Şəki çayı", "Магазин «Ромашка»", 'He said "hi"', "a,b,c", "line\nbreak", "=SUM(A1)", "+994 50", "-5", "@home", "12.50", "1e3", "😀 cafe", "  spaced  ", "'quoted'", "tab\there", "Ğğ Üü Öö Çç Şş İı Əə"];
const text = () => r() < 0.25 ? "" : Array.from({ length: 1 + Math.floor(r() * 3) }, () => pick(BITS)).join(" ").trim();
const amount = () => { const k = r(); const v = k < 0.3 ? 0.01 + Math.floor(r() * 100) / 100 : k < 0.6 ? Math.floor(r() * 100000) / 100 : k < 0.9 ? Math.floor(r() * 1e9) / 100 : pick([0.01, 0.1, 0.29, 0.57, 1.01, 999999999.99, 123456789.12, 100000000]); return Math.round(v * 100) / 100 || 0.01; };
const date = () => { const y = 2000 + Math.floor(r() * 30), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28); return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
const CATS = { expense: ["food", "transport", "housing", "health", "shopping", "other"], income: ["salary", "other"] };
const list = [];
for (let i = 0; i < 2000; i++) { const type = r() < 0.2 ? "income" : "expense"; list.push(T({ id: 1e6 + i, type, category: pick(CATS[type]), amount: amount(), date: date(), merchant: text(), note: text() })); }

section("R108-C1. 2,000 random entries: CSV out and back in, nothing changes");
const csv = buildCsv(list);
const p = planImportWithCats(csv, "ledger.csv");
ok(p.ok && p.transactions.length === 2000 && (p.skippedCount || 0) === 0, "all 2,000 rows are read back, none refused", { ok: p.ok, n: p.transactions && p.transactions.length, skipped: p.skippedCount, err: p.error });
const norm = (t) => [t.date, t.type, t.category, Math.round(t.amount * 100), t.merchant, t.note].join("|");
const want = list.map(norm).sort(), got = (p.transactions || []).map(norm).sort();
const diff = want.filter((w, i) => w !== got[i]);
ok(diff.length === 0, "every date, type, category, amount (to the cent), shop and note is exactly as exported", diff.slice(0, 3).map((w) => ({ want: w, got: got[want.indexOf(w)] })));
const sum = (l) => l.reduce((s, t) => s + Math.round(t.amount * 100), 0);
ok(sum(p.transactions || []) === sum(list), "the total of all amounts is the same to the cent", { want: sum(list), got: sum(p.transactions || []) });
finish("run108csvprop");
