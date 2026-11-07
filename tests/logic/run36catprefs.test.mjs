// Run 36 (2026-11-07): hide and reorder categories in the pickers, and search them. Stored under its own key; entries and reports never
// change. Expected results written by hand from the rules. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { CPREF_KEY, cleanCatPrefs, readCatPrefs, writeCatPrefs, orderedCats, pickerCats, moveCat, toggleHiddenCat, searchCats, buildBackup, planImportWithCats, forSpending, calcCategorySpend } = H;
reset();
const ids = (l) => l.map((c) => c.id);

section("R36-P1. Stored preferences are cleaned, never trusted");
ok(eq(cleanCatPrefs(null), { hidden: [], order: [] }) && eq(cleanCatPrefs("x"), { hidden: [], order: [] }), "junk gives empty preferences, no error");
ok(eq(cleanCatPrefs({ hidden: ["food", "food", "Bad Id", 5, "other", "income", "pets"], order: ["pets", "__proto__", "food"] }), { hidden: ["food", "pets"], order: ["pets", "food"] }), "duplicates, non-ids and the two fallbacks (other, income) are dropped; '__proto__' is not an id", cleanCatPrefs({ hidden: ["food", "food", "Bad Id", 5, "other", "income", "pets"], order: ["pets", "__proto__", "food"] }));
ok(eq(cleanCatPrefs({ hidden: ["zzz_future"] }).hidden, ["zzz_future"]), "an id this version does not know is kept (a newer version's category)");
ok(KEY_OK(), "it lives under its own key, next to the ledger key");
function KEY_OK() { return CPREF_KEY === "expense_ledger_v5__catprefs"; }

section("R36-P2. Order and hiding in the pickers");
const base = ids(orderedCats(false, {}));
ok(base[0] === "food" && base.includes("pets") && !base.includes("salary"), "default expense order starts with Food and has no income categories", base.slice(0, 4));
let p = moveCat({}, false, "pets", -1);
const moved = ids(orderedCats(false, p)), pi = base.indexOf("pets");
ok(moved.indexOf("pets") === pi - 1 && moved[pi] === base[pi - 1], "Pets moved up one place; the one above moved down", [pi, moved.indexOf("pets")]);
ok(eq(ids(orderedCats(false, moveCat({}, false, "food", -1))), base), "moving the first one up changes nothing");
p = toggleHiddenCat({}, "food");
ok(!ids(pickerCats(false, p)).includes("food") && ids(orderedCats(false, p)).includes("food"), "hidden Food is not offered, but stays in the full list");
ok(ids(pickerCats(false, p, ["food"])).includes("food"), "an entry already in Food still sees Food when edited");
ok(eq(toggleHiddenCat(toggleHiddenCat({}, "food"), "food").hidden, []), "hiding twice shows it again");
ok(eq(toggleHiddenCat({}, "other").hidden, []) && eq(toggleHiddenCat({}, "income").hidden, []), "Other and Other income cannot be hidden");
const incOrder = ids(orderedCats(true, moveCat({ order: ["zzz_future"] }, true, "pension", -1)));
ok(incOrder.every((id) => id !== "zzz_future") && moveCat({ order: ["zzz_future"] }, true, "pension", -1).order.includes("zzz_future"), "an unknown id in the order is kept, and never shown", incOrder.slice(0, 3));

section("R36-P3. Hiding never changes money figures");
const list = [T({ id: 1, category: "food", amount: 40, date: "2026-10-02" }), T({ id: 2, category: "pets", amount: 10, date: "2026-10-03" })];
writeCatPrefs({ hidden: ["food", "pets"] });
const spend = calcCategorySpend(forSpending(list), "2026-10", new Date(2026, 9, 31));
ok(spend.food === 40 && spend.pets === 10, "Food 40 and Pets 10 still count while hidden", spend);
ok(eq(readCatPrefs().hidden, ["food", "pets"]) && JSON.parse(globalThis.__store.get(CPREF_KEY)).version === 1, "saved with a version number");
writeCatPrefs({ hidden: [], order: [] });
ok(!globalThis.__store.has(CPREF_KEY), "nothing chosen: the key is removed, so a phone without preferences stores nothing extra");

section("R36-P4. Backups carry them; a restore uses them only on a phone without its own");
const st = { transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] };
ok(!("categoryPrefs" in buildBackup(st)), "no preferences: the backup file is exactly as before");
const bk = buildBackup({ ...st, catPrefs: { hidden: ["pets"], order: ["food"] } });
ok(eq(bk.categoryPrefs, { hidden: ["pets"], order: ["food"] }), "they are in the file", bk.categoryPrefs);
const plan = planImportWithCats(JSON.stringify(bk), "b.json");
ok(plan.ok && eq(plan.catPrefs, { hidden: ["pets"], order: ["food"] }), "the import plan carries them (applied only if this phone has none: App code)", plan.catPrefs);
const bad = planImportWithCats(JSON.stringify({ ...bk, categoryPrefs: { hidden: ["__proto__", "Food!"] } }), "b.json");
ok(bad.ok && !("catPrefs" in bad), "a file with only junk preferences brings none");

section("R36-P5. Search in the picker");
const exp = orderedCats(false, {});
ok(ids(searchCats(exp, "").map((h) => h.cat)).length === exp.length, "an empty search shows everything");
const pet = searchCats(exp, "PET");
ok(pet[0].cat.id === "pets" && pet[0].sub === "" && pet.slice(1).every((h) => h.sub !== ""), "case does not matter: 'PET' finds Pets first by name; others only through a subcategory (Other > Pets)", pet.map((h) => [h.cat.id, h.sub]));
const vet = searchCats(exp, "vet");
ok(vet.length === 1 && vet[0].cat.id === "pets" && vet[0].sub === "Vet", "a subcategory word finds its category and the subcategory: 'vet' finds Pets > Vet", vet.map((h) => [h.cat.id, h.sub]));
const mine = searchCats(exp, "padel", { health: ["Padel club"] });
ok(mine.length === 1 && mine[0].cat.id === "health" && mine[0].sub === "Padel club", "the user's own subcategories are searched too", mine.map((h) => [h.cat.id, h.sub]));
ok(searchCats(exp, "qqqzz").length === 0, "nothing found gives an empty list (the form says so)");
finish("run36catprefs");
