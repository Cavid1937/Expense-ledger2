// Phase 3 regression tests (2026-10-26): transaction identifiers, imported money precision, CSV formula injection.
import { H, KEY, ok, section, eq, reset, keysLike, T, finish } from "./lib.mjs";
const { normaliseTxn, migrateAndLoad, planImport, applyImport, buildBackup, buildCsv, parseCSV } = H;

section("P3-1. Existing transaction identifiers are preserved");
reset();
ok(normaliseTxn(T({ id: "9f1c2a7e-4b2d-4c1e-9a77-0c5d2b1e8f10" })).id === "9f1c2a7e-4b2d-4c1e-9a77-0c5d2b1e8f10", "a UUID string id is kept exactly (was replaced by a new random number)");
ok(normaliseTxn(T({ id: "a" })).id === "a" && normaliseTxn(T({ id: "123" })).id === "123", "short and numeric-looking string ids are kept as they are");
ok(normaliseTxn(T({ id: 0 })).id === 0 && normaliseTxn(T({ id: 1790769435003.98 })).id === 1790769435003.98, "numeric ids (0, fractional) still kept");
for (const bad of [undefined, null, "", "   ", true, {}, [], NaN, Infinity]) {
  const id = normaliseTxn(T({ id: bad })).id;
  ok(typeof id === "number" && Number.isFinite(id) && id !== bad, `unusable id ${JSON.stringify(bad) ?? String(bad)} → a fresh numeric id`, id);
}
localStorage.setItem(KEY, JSON.stringify({ transactions: [T({ id: "uuid-1", date: "2026-09-01" }), T({ id: "uuid-2", date: "2026-09-02" })] }));
let st = migrateAndLoad();
ok(eq(st.transactions.map((t) => t.id).sort(), ["uuid-1", "uuid-2"]), "stored records with string ids load with the same ids", st.transactions.map((t) => t.id));
const device = { transactions: [T({ id: "uuid-1", date: "2026-09-01" })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { savingsTarget: 0, enabled: false }, lastBackup: null };
const file = JSON.stringify(buildBackup({ ...device, transactions: [T({ id: "uuid-1", date: "2026-09-01" }), T({ id: "uuid-2", date: "2026-09-02", amount: 20 })] }));
let next = applyImport(device, planImport(file, "b.json"), "merge", { skipDuplicates: false });
ok(next.transactions.length === 2 && eq(next.transactions.map((t) => t.id).sort(), ["uuid-1", "uuid-2"]), "merging a backup with string ids adds only the missing record (no duplicate of uuid-1, even with look-alike skipping off)", next.transactions.map((t) => t.id));
next = applyImport(next, planImport(file, "b.json"), "merge", { skipDuplicates: false });
ok(next.transactions.length === 2, "merging the same backup a second time adds nothing");

section("P3-2. Imported amounts must be whole cents (refused, never rounded)");
let pl = planImport(JSON.stringify({ transactions: [T({ id: 1, amount: 12.34 }), T({ id: 2, amount: 12.345 }), T({ id: 3, amount: 1e-9 }), T({ id: 4, amount: 0.1 + 0.2 }), T({ id: 5, amount: 999999999.99 }), T({ id: 6, amount: 7 })] }), "b.json");
ok(pl.ok && eq(pl.transactions.map((t) => t.id).sort(), [1, 5, 6]), "12.34, 999999999.99 and 7 accepted; 12.345, 0.000000001 and 0.30000000000000004 refused", pl.transactions.map((t) => t.id));
ok(pl.skippedCount === 3 && /3 more than 2 decimal places/.test(pl.skippedSummary), "the refused rows are counted with a precise reason", pl.skippedSummary);
ok(pl.transactions.find((t) => t.id === 1).amount === 12.34, "accepted amounts are stored exactly as given (no rounding)");
pl = planImport("Date,Amount\r\n2026-09-01,12.345\r\n2026-09-02,12.30", "x.csv");
ok(pl.ok && pl.transactions.length === 1 && pl.transactions[0].amount === 12.3 && pl.skippedCount === 1, "CSV text with 3 decimals is refused too (typed-text grammar)");
reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [T({ id: 1, amount: 12.345 })] }));
st = migrateAndLoad();
// Contract changed in Run 6 (ChatGPT research D13): the whole-cent rule now applies to stored data too. The record is not
// dropped: it is set aside with a recovery copy and a notice, like every other unusable stored record.
ok(st.transactions.length === 0 && keysLike(KEY + "__rejected_").length === 1 && /more than 2 decimal places/.test(H.getNotice() || ""), "data already stored on this device with 12.345 is set aside with a recovery copy and a notice (Run 6: same whole-cent rule as imports)", H.getNotice());

section("P3-3. CSV export cannot inject spreadsheet formulas, and round trips stay exact");
const risky = ["=SUM(A1)", "+1+1", "-2+3", "@cmd", "\t=1", "=HYPERLINK(\"http://x\")"];
const txns = risky.map((m, i) => T({ id: 200 + i, merchant: m, note: m, subcategory: i === 0 ? "=sub" : "", date: `2026-09-0${i + 1}` }));
const csv = buildCsv(txns);
const cells = parseCSV(csv.replace(/^﻿/, "")).slice(1).flat();
const dangerous = cells.filter((c) => /^[=+\-@\t\r]/.test(c));
ok(dangerous.length === 0, "no exported cell starts with = + - @ tab or CR (spreadsheets would run it as a formula)", dangerous);
ok(cells.includes("'=SUM(A1)") && cells.includes("'@cmd"), "risky text is prefixed with a single apostrophe so spreadsheets show it as text");
const back = planImport(csv, "export.csv");
ok(back.ok && eq(back.transactions.map((t) => [t.merchant, t.note]), risky.map((m) => [m, m])) && back.transactions[0].subcategory === "=sub", "re-importing the app's own CSV restores the original text exactly (the apostrophe is removed)", back.transactions && back.transactions.map((t) => t.merchant));
ok(planImport("Date,Amount,Merchant\r\n2026-09-01,5,'hello\r\n2026-09-02,6,'=x", "y.csv").transactions.map((t) => t.merchant).join("|") === "'hello|=x", "only the guard apostrophe (before = + - @) is removed; an ordinary leading apostrophe stays");
ok(buildCsv([T({ id: 1, merchant: "Normal" })]).includes('"Normal"'), "ordinary text is exported unchanged");

finish("phase3");
