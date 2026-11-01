// Run 22 (2026-11-01), owner list item 1: an optional trip/group tag on an entry, with a per-trip total. Stored as an optional text field
// `trip` on the ordinary transaction, so old data and the permanent key are unchanged, and older versions simply ignore it.
// Written BEFORE the code. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { migrateAndLoad, normaliseTxn, tripName, tripTotals, buildCsv, parseCsvImport } = H;
reset();
const KEY = "expense_ledger_v5";
const store = (txns) => globalThis.__store.set(KEY, JSON.stringify({ transactions: txns, language: "en" }));

section("R22-T1. tripName: short clean text or nothing");
ok(tripName("  Baku   trip ") === "Baku trip", "outer spaces trimmed and inner runs collapsed");
ok(tripName("") === "" && tripName(null) === "" && tripName(undefined) === "" && tripName(5) === "" && tripName({}) === "", "empty, null, number and object give no trip");
ok(tripName("x".repeat(80)).length === 40, "longer than 40 characters is cut to 40");
ok(tripName("Qəbələ səfəri") === "Qəbələ səfəri" && tripName("Поездка в Шеки") === "Поездка в Шеки", "az and ru letters are kept as typed");
ok(tripName("a\u0000b\nc") === "a b c", "control characters become spaces");

section("R22-T2. The tag survives save and load; entries without one get no new field");
store([T({ id: 1, trip: "Baku trip" }), T({ id: 2, trip: "   " }), T({ id: 3, trip: 42 }), T({ id: 4 })]);
const st = migrateAndLoad();
const by = (id) => st.transactions.find((t) => t.id === id);
ok(by(1).trip === "Baku trip", "a valid trip is kept");
ok(!("trip" in by(2)) && !("trip" in by(3)) && !("trip" in by(4)), "blank, non-text and absent trips add no field");
ok(st.transactions.length === 4, "no entry is lost");
ok(eq(Object.keys(normaliseTxn(T({ id: 9 }))), Object.keys(normaliseTxn(T({ id: 9, trip: "" })))), "an entry without a trip has exactly the old shape");

section("R22-T3. tripTotals: expenses per trip, whole cents, case-insensitive, newest spelling kept");
const list = [
  T({ id: 1, amount: 0.1, trip: "Baku" }), T({ id: 2, amount: 0.2, trip: "baku" }), T({ id: 3, amount: 50, trip: "Shaki" }),
  T({ id: 4, type: "income", amount: 999, trip: "Baku" }), T({ id: 5, amount: 7 }),
];
const tt = tripTotals(list);
ok(tt.length === 2, "two trips; entries without a trip are not a trip", tt);
ok(tt[0].name === "Shaki" && tt[0].total === 50 && tt[0].n === 1, "largest first", tt[0]);
ok(tt[1].name === "Baku" && tt[1].total === 0.3 && tt[1].n === 2, "0.1 + 0.2 is exactly 0.30, 'Baku' and 'baku' are one trip, income is not counted", tt[1]);
ok(eq(tripTotals([]), []) && eq(tripTotals(null), []), "empty and invalid input give an empty list");
const loanTrip = [T({ id: 1, amount: 458.4, trip: "X", loan: { interest: 75 } })];
ok(tripTotals(loanTrip)[0].total === 75, "a loan instalment counts only its interest, like every other spending view");

section("R22-T4. CSV: a last 'Trip' column that round-trips; older files still import");
const csv = buildCsv([T({ id: 1, amount: 12.5, trip: "Baku trip" }), T({ id: 2, amount: 3 })]);
const hdr = csv.replace(/^﻿/, "").split("\r\n")[0];
ok(hdr.endsWith('"Wallet","Trip"'), "Trip is appended as the last column (earlier columns did not move)", hdr);
const back = parseCsvImport(csv);
ok(!back.error, "own export imports", back.error);
const recs = back.records || back.rows || back.transactions || [];
ok(recs.length === 2 && recs[0].trip === "Baku trip" && !("trip" in recs[1]), "the trip comes back; the entry without one stays without", recs.map((r) => r.trip));
const old = 'Date,Amount,Type,Category\n2026-09-01,5,expense,food\n';
const oldBack = parseCsvImport(old);
ok(!oldBack.error && !("trip" in ((oldBack.records || oldBack.rows || oldBack.transactions)[0])), "a file without a Trip column imports unchanged");
finish("run22trip");
