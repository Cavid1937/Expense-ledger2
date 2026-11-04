// Run 25: the user's own subcategories can be renamed; earlier entries follow. Expected values by hand; synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { addUserSubcat, renameUserSubcat, renameSubcatInEntries, CATEGORIES } = H;
reset();
const builtin = CATEGORIES.find((c) => c.id === "food").subs[0];
let m = addUserSubcat({}, "food", "Kiosk").map;
m = addUserSubcat(m, "food", "Canteen").map;

section("R25-SR1. Rename keeps position and tidies spaces");
const r = renameUserSubcat(m, "food", "Kiosk", "  Corner   shop ");
ok(r.edited && r.map.food.join("|") === "Corner shop|Canteen" && r.name === "Corner shop", "renamed in place, spaces tidied, old name matched ignoring case", r);
ok(m.food.join("|") === "Kiosk|Canteen", "the original list is not changed");
ok(renameUserSubcat(m, "food", "Canteen", "Canteen").edited, "changing only the capitals of its own name is allowed");

section("R25-SR2. Refusals");
ok(renameUserSubcat(m, "food", "Kiosk", " ").reason === "empty", "empty refused");
ok(renameUserSubcat(m, "food", "Kiosk", "x".repeat(31)).reason === "long", "over 30 characters refused");
ok(renameUserSubcat(m, "food", "Kiosk", "Canteen").reason === "dup", "another own name (any case) refused");
ok(renameUserSubcat(m, "food", "Kiosk", builtin).reason === "dup", "a built-in subcategory name refused");
ok(renameUserSubcat(m, "food", "Nope", "Zoo").reason === "missing", "unknown old name refused");
ok(renameUserSubcat(m, "nocat", "Kiosk", "Zoo").reason === "category", "unknown category refused");

section("R25-SR3. Earlier entries follow, only in that category");
const tx = [
  { id: 1, category: "food", subcategory: "Kiosk", amount: 3 },
  { id: 2, category: "food", subcategory: "Kiosk", amount: 4 },
  { id: 3, category: "shopping", subcategory: "Kiosk", amount: 5 },
  { id: 4, category: "food", subcategory: "Canteen", amount: 6 },
  { id: 5, category: "food", amount: 7 },
];
const out = renameSubcatInEntries(tx, "food", "Kiosk", "Corner shop");
ok(out[0].subcategory === "Corner shop" && out[1].subcategory === "Corner shop", "both spellings of the old name are renamed");
ok(out[2].subcategory === "Kiosk", "the same name in another category is untouched");
ok(out[3].subcategory === "Canteen" && !("subcategory" in out[4]), "other entries and entries without a subcategory are untouched");
ok(out.map((x) => x.amount).join(",") === "3,4,5,6,7" && out.length === 5, "amounts and count unchanged");
finish("run25subrename");

