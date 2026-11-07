// Run 38 (2026-11-07): most-used first (plain counting), manual order wins, exact-reminder setting, Car category. Expected values by hand.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { CATEGORIES, frequentFirst, hasManualOrder, orderedCats, cleanReminderPrefs, REMIND_DEFAULT, planImport, migrateAndLoad } = H;
reset();   // today = 13 Oct 2026
const now = new Date(2026, 9, 13);
const exp = orderedCats(false, {});
const ids = (l) => l.map((c) => c.id);

section("R38-1. Most used in the last 90 days first; ties and unused keep the normal order");
const tx = [T({ id: 1, category: "car", date: "2026-10-01" }), T({ id: 2, category: "car", date: "2026-09-20" }), T({ id: 3, category: "pets", date: "2026-10-10" }), T({ id: 4, category: "edu", date: "2026-06-01" }), T({ id: 5, category: "edu", date: "2026-06-02" }), T({ id: 6, category: "edu", date: "2026-06-03" }), T({ id: 7, category: "health", date: "2026-10-20" })];
const f = ids(frequentFirst(exp, tx, now));
ok(f[0] === "car" && f[1] === "pets", "Car (2 in range) then Pets (1)", f.slice(0, 3));
const rest = ids(exp).filter((id) => id !== "car" && id !== "pets");
ok(eq(f.slice(2), rest), "everything after Car and Pets keeps the normal order: Education (only used in June, over 90 days ago) is not promoted", f.slice(2, 6));
ok(!f.slice(0, 2).includes("health"), "an entry dated in the future (20 Oct) does not count yet");
ok(eq(ids(frequentFirst(exp, [], now)), ids(exp)), "no entries: the normal order, unchanged");
ok(frequentFirst(exp, tx, now).length === exp.length, "nothing is dropped or duplicated");

section("R38-2. A manual order (for this type) switches counting off");
ok(!hasManualOrder({}, false) && hasManualOrder({ order: ["health"] }, false) && !hasManualOrder({ order: ["health"] }, true) && hasManualOrder({ order: ["pension"] }, true), "manual order is per type (expense / income)");

section("R38-3. Exact-time reminders are an explicit choice, off by default");
ok(REMIND_DEFAULT.exact === false && cleanReminderPrefs(null).exact === false && cleanReminderPrefs({ exact: true }).exact === true && cleanReminderPrefs({ exact: "yes" }).exact === false, "off unless exactly true");

section("R38-4. Car category");
const car = CATEGORIES.find((c) => c.id === "car");
ok(car && car.income === false && ["Fuel", "Car insurance", "Car Maintenance", "Parking", "Fines", "Car wash"].every((s) => car.subs.includes(s)), "Car exists with fuel, insurance, maintenance, parking, fines, wash", car && car.subs);
const imp = planImport("Date,Amount,Type,Category\n2026-10-01,20,expense,Car\n2026-10-02,15,expense,Fuel\n2026-10-03,5,expense,Car wash\n", "c.csv");
ok(imp.ok && eq(imp.transactions.map((t) => t.category), ["car", "transport", "car"]), "import: 'Car' and 'Car wash' go to Car; 'Fuel' keeps meaning Transport as before", imp.transactions.map((t) => t.category));
const transport = CATEGORIES.find((c) => c.id === "transport");
ok(["Fuel", "Parking", "Car Maintenance"].every((s) => transport.subs.includes(s)), "Transport keeps its old subcategories (entries already there do not change)");
globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [T({ id: 1, category: "car", subcategory: "Fines", amount: 40 })], language: "en" }));
ok(migrateAndLoad().transactions[0].category === "car", "a saved Car entry loads unchanged");
finish("run38");
