// Run 35 (2026-11-07), mission section 11: a broader, inclusive category system. Expected values worked out by hand from each
// persona's list below, independent of the code. Synthetic data only.
// Rule under test: money that merely moves (refund, withdrawal from savings) counts in the balance but not in "income".
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { CATEGORIES, forSpending, calcMonthSummary, isEarnedCat, migrateAndLoad, planImport, resolveCategory, addCustomCat, applyCustomCats, readCustomCats, catName, CAT } = H;
reset();
const now = new Date(2026, 9, 31);
let n = 1;
const inc = (category, amount, subcategory = "") => T({ id: n++, type: "income", category, amount, subcategory, date: "2026-10-05" });
const exp = (category, amount) => T({ id: n++, type: "expense", category, amount, date: "2026-10-06" });
const month = (list) => calcMonthSummary(forSpending(list), "2026-10", "2026-09", now);

section("R35-1. The taxonomy: every id and name is unique, and the new groups exist");
const ids = CATEGORIES.map((c) => c.id), names = CATEGORIES.map((c) => c.name.toLowerCase());
ok(new Set(ids).size === ids.length && new Set(names).size === names.length, "no duplicate ids or names", ids);
const want = ["family", "pets", "work", "business", "stipend", "pension", "benefits", "familyin", "alimony", "rental", "investin", "sales", "giftin", "refund", "savout"];
ok(want.every((id) => ids.includes(id)), "the 15 new categories are present");
ok(want.filter((id) => CATEGORIES.find((c) => c.id === id).income).length === 12 && CATEGORIES.find((c) => c.id === "pets").income === false, "12 are income, 3 are expense");
ok(CATEGORIES.every((c) => Array.isArray(c.subs) && /^#[0-9A-Fa-f]{6}$/.test(c.color)), "every category has a subcategory list and a valid colour");
ok(["food", "housing", "transport", "health", "edu", "salary", "freelance"].every((id) => ids.includes(id)), "the original categories are all still there");

section("R35-2. Which income is earnings");
ok(!isEarnedCat("refund") && !isEarnedCat("savout"), "refunds and withdrawals from savings are not earnings");
ok(["salary", "freelance", "business", "stipend", "pension", "benefits", "familyin", "alimony", "rental", "investin", "sales", "giftin", "income"].every(isEarnedCat), "every other income kind is");
ok(isEarnedCat("u_abc123") && isEarnedCat("zzz"), "a user's own or an unknown category is treated as income (never hidden)");

section("R35-3. Eight people, hand-computed monthly totals (income lens vs. raw balance)");
const personas = [
  ["student with a scholarship", [inc("stipend", 400), inc("familyin", 150), inc("giftin", 50), inc("refund", 15), inc("savout", 80), exp("food", 120), exp("edu", 60)], 600, 180, 515],
  ["retiree with pension and rent", [inc("pension", 500), inc("rental", 300), inc("investin", 40), exp("housing", 200), exp("health", 90)], 840, 290, 550],
  ["unemployed on social support", [inc("benefits", 250), inc("familyin", 100), inc("savout", 200), exp("food", 150), exp("housing", 120)], 350, 270, 280],
  ["salaried with bonus and freelance", [inc("salary", 2000, "Wages"), inc("salary", 300, "Bonus"), inc("freelance", 400), inc("refund", 25), exp("housing", 700), exp("food", 500)], 2700, 1200, 1525],
  ["freelancer", [inc("freelance", 1500), inc("freelance", 700, "Consulting"), inc("sales", 100), exp("work", 300)], 2300, 300, 2000],
  ["small-business owner", [inc("business", 5000), inc("investin", 200), exp("work", 1800)], 5200, 1800, 3400],
  ["parent", [inc("salary", 1800), inc("alimony", 200), inc("benefits", 100), exp("family", 400), exp("food", 300)], 2100, 700, 1400],
  ["person with no income living on savings and gifts", [inc("giftin", 120), inc("savout", 300), inc("familyin", 80), exp("food", 200)], 200, 200, 300],
];
for (const [label, list, wantInc, wantExp, wantBalance] of personas) {
  const s = month(list), raw = calcMonthSummary(list, "2026-10", "2026-09", now);
  ok(s.curInc === wantInc && s.curExp === wantExp, `${label}: income ${wantInc}, spending ${wantExp}`, [s.curInc, s.curExp]);
  ok(raw.curInc - raw.curExp === wantBalance, `${label}: the balance (raw) is ${wantBalance}`, raw.curInc - raw.curExp);
}

section("R35-4. A refund or savings withdrawal never inflates income, and the original lens is untouched");
const mixed = [inc("salary", 100), inc("refund", 50), inc("savout", 25), exp("food", 10)];
ok(forSpending(mixed).filter((x) => x.type === "income").length === 1, "only the salary row survives the income lens");
ok(forSpending(mixed).filter((x) => x.type === "expense").length === 1, "expenses pass through");
ok(mixed.length === 4 && mixed[1].category === "refund", "the stored list itself is not changed");

section("R35-5. Saved data with the new ids loads unchanged");
globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [T({ id: 1, type: "income", category: "pension", amount: 300 }), T({ id: 2, category: "pets", amount: 20 }), T({ id: 3, type: "income", category: "savout", amount: 5 })], language: "en" }));
const st = migrateAndLoad();
ok(eq(st.transactions.map((t) => t.category), ["pension", "pets", "savout"]) && st.transactions.length === 3, "pension, pets and savout stay as saved; nothing set aside", st.transactions.map((t) => t.category));

section("R35-6. Imports understand everyday words for the new categories");
const csv = "Date,Amount,Type,Category\n2026-10-01,300,income,Scholarship\n2026-10-02,200,income,Rent received\n2026-10-03,9,income,Cashback\n2026-10-04,25,expense,Vet\n2026-10-05,100,income,Alimony\n2026-10-06,5,expense,Something unknown\n";
const imp = planImport(csv, "p.csv");
ok(imp.ok && eq(imp.transactions.map((t) => t.category), ["stipend", "rental", "refund", "pets", "alimony", "other"]), "Scholarship, Rent received, Cashback, Vet, Alimony map; unknown text still lands in Other", imp.error || imp.transactions.map((t) => t.category));

section("R35-7. A user's own category is never lost to a built-in with the same name");
globalThis.__store.set("expense_ledger_v5__cats", JSON.stringify({ version: 1, cats: [{ id: "u_pets01", name: "Pets", income: false, color: "#F28B82" }, { id: "u_pens02", name: "Pension", income: true, color: "#68D391" }] }));
const kept = readCustomCats();
ok(kept.length === 2 && kept[0].id === "u_pets01", "both stored categories are still read (they were silently dropped before)", kept);
applyCustomCats(kept);
ok(CATEGORIES.some((c) => c.id === "u_pets01") && catName("u_pets01") === "Pets", "the user's own 'Pets' is still usable and keeps its id");
ok(resolveCategory("pets") === "pets" && resolveCategory("u_pets01") === "u_pets01", "the built-in name still means the built-in; the own id still means the own category");
applyCustomCats([]);
ok(addCustomCat([], "Pets", false).reason === "dup" && addCustomCat([], "pension", true).reason === "dup", "adding a new own category with a built-in name is refused (same rule as 'Food')");
ok(addCustomCat([], "Street food", false).added === true, "a genuinely new name is accepted");
finish("run35cat");
