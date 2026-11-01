// Run 24: the user's own categories. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { cleanCustomCats, applyCustomCats, addCustomCat, customCatInUse, planImportWithCats, buildBackup, CATEGORIES, resolveCategory } = H;
reset();
const builtIn = CATEGORIES.filter((c) => !c.custom).length;

section("R24-MC1. Adding and refusing");
let r = addCustomCat([], "  Pets   food ", false, "#68D391");
ok(r.added && r.list.length === 1 && r.list[0].name === "Pets food" && /^u_[a-z0-9]{3,12}$/.test(r.list[0].id) && r.list[0].income === false, "a name is trimmed and spaces collapsed; id looks like u_xxxxxx", r);
ok(addCustomCat(r.list, "pets FOOD", false).reason === "dup", "same name ignoring case is refused");
ok(addCustomCat(r.list, "Food & Dining", false).reason === "dup" && addCustomCat(r.list, "salary", true).reason === "dup", "a built-in name or id is refused");
ok(addCustomCat(r.list, "   ", false).reason === "empty" && addCustomCat(r.list, "x".repeat(25), false).reason === "long", "empty and 25-character names are refused");
let big = []; for (let i = 0; i < 30; i++) big = addCustomCat(big, "Cat" + i, false).list;
ok(big.length === 30 && addCustomCat(big, "One more", false).reason === "full", "30 is the limit");

section("R24-MC2. Applying makes it usable everywhere, removing makes it vanish");
const mine = [{ id: "u_abc123", name: "Pets food", income: false, color: "#68D391" }, { id: "u_inc999", name: "Rental income", income: true, color: "#ZZZ" }];
applyCustomCats(mine);
ok(CATEGORIES.length === builtIn + 2 && CATEGORIES.find((c) => c.id === "u_inc999").income === true, "both appear in the shared category list with the right type");
ok(resolveCategory("u_abc123") === "u_abc123" && resolveCategory("pets food") === "u_abc123", "id and name both resolve to the category");
ok(!/^#[0-9a-f]{6}$/i.test("#ZZZ") && /^#[0-9A-Fa-f]{6}$/.test(CATEGORIES.find((c) => c.id === "u_inc999").color), "a bad colour is replaced by a palette colour");
applyCustomCats([]);
ok(CATEGORIES.length === builtIn && resolveCategory("u_abc123", true) === "u_abc123" && resolveCategory("u_abc123") === "other", "after removal: the list is back to built-ins; own saved data keeps the id, an import would say Other");
ok(customCatInUse("u_abc123", [{ category: "u_abc123" }], {}) && customCatInUse("u_abc123", [], { u_abc123: 50 }) && !customCatInUse("u_abc123", [{ category: "food" }], { food: 5 }), "in use = an entry or a budget points at it");

section("R24-MC3. Backup carries them; importing a backup keeps entries in the category, and leaves nothing behind");
const bk = buildBackup({ transactions: [{ id: 1, type: "expense", amount: 5, category: "u_abc123", date: "2026-10-01" }], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [], customCats: mine });
ok(Array.isArray(bk.customCategories) && bk.customCategories.length === 2, "the backup file lists the own categories");
ok(!("customCategories" in buildBackup({ transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] })), "no own categories: the file is identical to before (no new field)");
const plan = planImportWithCats(JSON.stringify(bk), "b.json");
ok(plan.ok && plan.transactions.length === 1 && plan.transactions[0].category === "u_abc123" && plan.customCats.length === 2, "the entry keeps its own category and the plan carries the list", plan.transactions);
ok(CATEGORIES.length === builtIn, "planning stored nothing: the shared list is back to built-ins");
ok(cleanCustomCats([{ id: "bad id", name: "X" }, { id: "u_ok1234", name: "Fine" }, null, "x"]).length === 1, "junk entries in a file are dropped");
finish("run24mycat");
