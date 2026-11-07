// Run 17 (2026-10-30), categories release A: a category id this version does not know is KEPT in the saved data (a later version will add
// categories; an older copy of the app must never rewrite them to "Other" when it saves). It is shown as "Other" until known.
// Imports are unchanged: free text from a CSV still lands in Other. Written BEFORE the code. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { migrateAndLoad, planImport, catName, CAT, normaliseTxn } = H;
reset();
const KEY = "expense_ledger_v5";
const store = (txns) => globalThis.__store.set(KEY, JSON.stringify({ transactions: txns, language: "en" }));

section("R17-C1. Saved data keeps an unknown, well-formed category id");
store([T({ id: 1, category: "zoo" }), T({ id: 2, category: "kids_care" }), T({ id: 3, category: "food" })]);
let st = migrateAndLoad();
ok(eq(st.transactions.map((t) => t.category), ["zoo", "kids_care", "food"]), "zoo and kids_care stay as they are; food stays food", st.transactions.map((t) => t.category));
ok(st.transactions.length === 3, "nothing is set aside");

section("R17-C2. Only id-shaped text is kept; everything else behaves as before");
store([T({ id: 1, category: "Zoo" }), T({ id: 2, category: "my zoo" }), T({ id: 3, category: "x" }), T({ id: 4, category: "" }), T({ id: 5, category: "sport" }), T({ id: 6, category: "zoo!" }), T({ id: 7, category: "a".repeat(40) })]);
st = migrateAndLoad();
ok(eq(st.transactions.map((t) => t.category), ["other", "other", "other", "other", "health", "other", "other"]), "capitals, spaces, one letter, empty, punctuation and over-long text become other; the old alias 'sport' still means health", st.transactions.map((t) => t.category));

section("R17-C3. It survives a save and a second load unchanged");
store([T({ id: 1, category: "zoo" })]);
st = migrateAndLoad();
globalThis.__store.set(KEY, JSON.stringify(st));
ok(migrateAndLoad().transactions[0].category === "zoo", "zoo after save and load again");

section("R17-C4. It is shown as Other, without errors");
ok(catName("zoo") === "Other" && CAT("zoo").id === "other", "name and colour fall back to Other");

section("R17-C5. Imports are unchanged: free text still lands in Other");
const imp = planImport("Date,Amount,Type,Category\n2026-10-01,5,expense,zoo\n2026-10-02,5,expense,Payment\n2026-10-03,5,expense,food\n", "p.csv");
ok(imp.ok && eq(imp.transactions.map((t) => t.category), ["other", "other", "food"]), "a CSV row with category zoo or Payment becomes other; food stays food", imp.error || imp.transactions.map((t) => t.category));
ok(normaliseTxn(T({ category: "zoo" })).category === "other", "normaliseTxn without the stored-data option still flattens (used by imports)");
finish("run17cat");
