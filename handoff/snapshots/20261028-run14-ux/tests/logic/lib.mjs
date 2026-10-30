// Shared helpers for the logic tests.
// No defaults: HARNESS and CANDIDATE are set by run-logic.mjs. The old fallbacks pointed at a stale expense-tracker.jsx.
if (!process.env.HARNESS || !process.env.CANDIDATE) { console.error("logic tests: run them through tests/run-logic.mjs (HARNESS and CANDIDATE must be set)"); process.exit(2); }
export const H = await import(process.env.HARNESS);
import fs from "fs";
export const KEY = "expense_ledger_v5";
export const SRC = fs.readFileSync(process.env.CANDIDATE, "utf8");
let fails = 0, passes = 0;
export const ok = (c, msg, extra) => { console.log((c ? "  ✓ " : "  ✗ ") + msg); if (c) passes++; else { fails++; if (extra !== undefined) console.log("      ↳", typeof extra === "string" ? extra : JSON.stringify(extra)); } };
export const section = (t) => console.log("\n" + t);
export const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const setNow = (y, mo, d, h = 12, mi = 0) => { globalThis.__NOW = new Date(y, mo, d, h, mi, 0).getTime(); };
export const reset = () => { globalThis.__store.clear(); globalThis.__failKeys = []; globalThis.__throwAll = false; globalThis.__throwGetKeys = []; H.resetFlags(); setNow(2026, 9, 13); };
export const keysLike = (p) => [...globalThis.__store.keys()].filter(k => k.startsWith(p));
export const T = (o = {}) => ({ id: 1, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-09-01", recurring: false, recurFreq: null, isActive: true, createdAt: "2026-09-01T00:00:00.000Z", ...o });
export const finish = (name) => { console.log(`\n${fails === 0 ? name + ": ALL " + passes + " CHECKS PASSED" : name + ": " + fails + " FAILED, " + passes + " passed"}`); process.exit(fails ? 1 : 0); };
