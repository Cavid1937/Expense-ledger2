// Run 16 (2026-10-29): the user's own subcategories, Phase 1 of the custom-categories design note. Written BEFORE the code.
// A subcategory is already free text on each entry, so these are only SUGGESTIONS kept in their own storage key
// (expense_ledger_v5__subcats); no ledger field changes and no entry is ever rewritten. Synthetic data only.
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { cleanSubcats, addUserSubcat, removeUserSubcat, mergeSubcats, readSubcats, writeSubcats, buildBackup, planImport } = H;
reset();
section("R16S-1. The pieces exist");
ok([cleanSubcats, addUserSubcat, removeUserSubcat, mergeSubcats, readSubcats, writeSubcats].every((f) => typeof f === "function"), "cleanSubcats, addUserSubcat, removeUserSubcat, mergeSubcats, readSubcats and writeSubcats are defined");
if (typeof cleanSubcats !== "function") { console.log("  (remaining checks skipped: not written yet)"); finish("run16sub"); }

section("R16S-2. Cleaning what is read from storage or a file");
const dirty = { food: ["  Lunch  ", "lunch", "X".repeat(31), "", 5, "Pizza", "  two   spaces "], nope: ["a"], salary: ["Bonus"] };
const c = cleanSubcats(dirty);
ok(eq(c.food, ["Lunch", "Pizza", "two spaces"]), "trimmed, inner spaces collapsed, duplicates ignoring case removed, too long / empty / non-text dropped", c.food);
ok(!("nope" in c), "an unknown category id is dropped");
ok(eq(c.salary, ["Bonus"]), "income categories can have their own subcategories too");
ok(eq(cleanSubcats({ version: 1, byCategory: { food: ["A"] } }).food, ["A"]), "the stored shape {version, byCategory} is accepted");
for (const bad of [null, undefined, 5, "x", [], { food: "Lunch" }, { food: { a: 1 } }]) ok(typeof cleanSubcats(bad) === "object" && !Array.isArray(cleanSubcats(bad)) && !JSON.stringify(cleanSubcats(bad)).includes("Lunch"), `${JSON.stringify(bad)} gives an empty map, never an error`);
ok(eq(cleanSubcats({ food: ["Groceries", "Coffee"] }), {}), "text equal to a built-in subcategory of that category (any case) is not stored a second time");
ok(eq(cleanSubcats({ food: Array.from({ length: 25 }, (_, i) => "S" + i) }).food.length, 20), "at most 20 per category");

section("R16S-3. Adding and removing one");
let m = {}; let r = addUserSubcat(m, "food", "  Street food  ");
ok(r.added && eq(r.map.food, ["Street food"]) && eq(m, {}), "adds the trimmed text and leaves the old map unchanged", r);
r = addUserSubcat(r.map, "food", "street FOOD"); ok(!r.added && r.reason === "dup", "the same text in another case is refused as a duplicate", r);
r = addUserSubcat(r.map, "food", "coffee"); ok(!r.added && r.reason === "dup", "a built-in subcategory (Coffee) is refused as a duplicate");
r = addUserSubcat(r.map, "food", "   "); ok(!r.added && r.reason === "empty", "empty text is refused");
r = addUserSubcat(r.map, "food", "Y".repeat(31)); ok(!r.added && r.reason === "long", "more than 30 characters is refused");
r = addUserSubcat(r.map, "zzz", "Ok"); ok(!r.added && r.reason === "category", "an unknown category is refused");
let full = {}; for (let i = 0; i < 20; i++) full = addUserSubcat(full, "food", "S" + i).map; r = addUserSubcat(full, "food", "One more"); ok(!r.added && r.reason === "full" && full.food.length === 20, "the 21st is refused (limit 20)");
const removed = removeUserSubcat({ food: ["A", "B"] }, "food", "a"); ok(eq(removed.food, ["B"]), "removing ignores case and keeps the others");
ok(!("food" in removeUserSubcat({ food: ["A"] }, "food", "A")), "removing the last one removes the category key too");

section("R16S-4. Merging a file's suggestions with the ones on the phone");
ok(eq(mergeSubcats({ food: ["A", "B"] }, { food: ["b", "C"], transport: ["T"] }), { food: ["A", "B", "C"], transport: ["T"] }), "union, the phone's own first, nothing overwritten, duplicates ignored");
ok(eq(mergeSubcats({}, undefined), {}) && eq(mergeSubcats({ food: ["A"] }, null), { food: ["A"] }), "a missing side is fine");

section("R16S-5. Storage in its own key; failures are safe");
ok(eq(readSubcats(), {}), "nothing stored: an empty map");
ok(writeSubcats({ food: ["Pizza"] }) === true && eq(readSubcats(), { food: ["Pizza"] }), "write then read round trip");
ok(Object.keys(globalThis.__store ? Object.fromEntries(globalThis.__store) : {}).some((k) => k === "expense_ledger_v5__subcats") && !Object.keys(Object.fromEntries(globalThis.__store)).includes("expense_ledger_v5"), "it uses expense_ledger_v5__subcats and does not create or touch the ledger key");
globalThis.__store.set("expense_ledger_v5__subcats", "{not json"); ok(eq(readSubcats(), {}), "unreadable stored text gives an empty map, no crash");
globalThis.__failKeys = ["expense_ledger_v5__subcats"]; ok(writeSubcats({ food: ["A"] }) === false, "a storage failure is reported (false), not thrown"); globalThis.__failKeys = [];

section("R16S-6. Backup carries them as an optional field");
const empty = { transactions: [], bills: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } };
const withSub = buildBackup({ ...empty, subcategories: { food: ["Pizza"] } }, "2026-10-13T00:00:00Z");
ok(eq(withSub.subcategories, { food: ["Pizza"] }) && withSub.version === 10, "buildBackup adds subcategories (version stays 10)", withSub.version);
ok(!("subcategories" in buildBackup(empty, "2026-10-13T00:00:00Z")), "no suggestions: the field is absent, so the file is identical to before");
const plan = planImport(JSON.stringify(withSub), "b.json");
ok(plan.ok && eq(plan.subcategories, { food: ["Pizza"] }), "importing returns the cleaned suggestions for the app to merge", plan.error || plan.subcategories);
const plain = planImport(JSON.stringify(buildBackup(empty, "2026-10-13T00:00:00Z")), "p.json"); ok(plain.ok && (!plain.subcategories || eq(plain.subcategories, {})), "a file without them imports as before");

finish("run16sub");
