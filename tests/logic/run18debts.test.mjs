// Run 18 (2026-10-31), P1 from the ChatGPT review of Run 17: the separate debts store must never turn unreadable data into a valid empty
// list and then overwrite it. Unreadable/corrupt data: the original stays untouched, a safe copy is kept, writes are refused. Partly
// malformed data: a safe copy of the original is kept BEFORE the first write that would drop records, and the count is reported.
// Written BEFORE the fix. Synthetic data only.
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { readDebts, writeDebts, debtsHealth } = H;
reset();
const KEY = "expense_ledger_v5__debts";
const copies = () => [...globalThis.__store.keys()].filter((k) => k.startsWith("expense_ledger_v5__debts_"));
const good = (n = "Rauf") => ({ id: "d1", direction: "owed", name: n, principal: 30000, dueDate: "", note: "", payments: [] });
const goodData = { debts: [good()], loans: [] };

section("R18-D1. Corrupt JSON is not a valid empty ledger");
const bad = '{"version":1,"debts":[{"id":"d1","name":"Ra';
globalThis.__store.set(KEY, bad);
ok(debtsHealth().status === "corrupt", "health says corrupt");
ok(eq(readDebts(), { debts: [], loans: [] }), "the page still gets an empty list to show (nothing crashes)");
ok(writeDebts(goodData) === false, "a write is REFUSED");
ok(globalThis.__store.get(KEY) === bad, "the original text is untouched");
ok(copies().length === 1 && globalThis.__store.get(copies()[0]) === bad, "one safe copy of the original text was kept");
writeDebts(goodData);
ok(copies().length === 1, "a second refused write does not pile up more copies");

section("R18-D2. Deleting the last record cannot wipe a corrupt store");
ok(writeDebts({ debts: [], loans: [] }) === false && globalThis.__store.get(KEY) === bad, "an empty write is refused too; the key is not removed");

section("R18-D3. Wrong shape is corrupt, not empty");
globalThis.__store.set(KEY, '["not","an","object"]');
ok(debtsHealth().status === "corrupt" && writeDebts(goodData) === false, "an array instead of an object: corrupt and refused");
globalThis.__store.set(KEY, '{"version":1,"debts":"oops"}');
ok(debtsHealth().status === "corrupt", "debts that is not a list: corrupt");

section("R18-D4. Storage that cannot be read");
globalThis.__store.set(KEY, JSON.stringify({ version: 1, ...goodData }));
globalThis.__throwGetKeys = [KEY];
ok(debtsHealth().status === "unreadable", "a read error is 'unreadable', not 'missing'");
const before = globalThis.__store.get(KEY);
ok(writeDebts({ debts: [good("Other")], loans: [] }) === false && globalThis.__store.get(KEY) === before, "the write is refused and the stored value is untouched");
globalThis.__throwGetKeys = [];

section("R18-D5. Partly malformed data: kept, counted, copied before the first write");
reset();
const mixed = JSON.stringify({ version: 1, debts: [good(), { id: "d2", direction: "owe", name: "X", principal: -5, payments: [] }], loans: [] });
globalThis.__store.set(KEY, mixed);
let h = debtsHealth();
ok(h.status === "partial" && h.dropped === 1, "health: partial, 1 record cannot be read", h);
ok(readDebts().debts.length === 1, "the readable record is still shown");
ok(writeDebts({ debts: [good(), { ...good("Second"), id: "d3" }], loans: [] }) === true, "a normal save is allowed");
ok(copies().length === 1 && globalThis.__store.get(copies()[0]) === mixed, "the ORIGINAL text, including the bad record, was copied first");
ok(debtsHealth().status === "ok", "after the save the store is clean");
writeDebts(goodData);
ok(copies().length === 1, "later saves create no further copies");

section("R18-D6. A failed write keeps the old value");
reset();
globalThis.__store.set(KEY, JSON.stringify({ version: 1, ...goodData }));
const prev = globalThis.__store.get(KEY);
globalThis.__failKeys = ["__debts"];
ok(writeDebts({ debts: [good("New")], loans: [] }) === false && globalThis.__store.get(KEY) === prev, "quota error: false, previous value intact");
globalThis.__failKeys = [];

section("R18-D7. Healthy and missing stores behave as before");
reset();
ok(debtsHealth().status === "missing" && writeDebts(goodData) === true && eq(readDebts().debts.map((d) => d.name), ["Rauf"]), "missing -> write -> read round trip");
ok(writeDebts({ debts: [], loans: [] }) === true && !globalThis.__store.has(KEY), "emptying a healthy store removes the key as before");
finish("run18debts");
