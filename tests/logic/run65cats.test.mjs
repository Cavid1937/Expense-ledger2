// Run 65 (owner decision 13 Nov): optional, neutral subcategories "Alcohol", "Tobacco & vaping" (separate, owner's call) and "Lottery & betting".
// Never assigned by the app on its own; ids and older records unchanged; older backups import as before. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
import { statementEntries } from "../../statement.js";
const { CATEGORIES, KNOWN_MERCHANTS, setLang, subName, planImport, partitionTransactions, knownMerchantExact } = H;
reset();
const C = (id) => CATEGORIES.find((c) => c.id === id);
const E = (id, o = {}) => ({ id, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-10-05", recurring: false, recurFreq: null, isActive: true, ...o });

section("R65C-1. Where they live");
ok(C("food").subs.includes("Alcohol") && C("shopping").subs.includes("Tobacco & vaping") && C("entertain").subs.includes("Lottery & betting"), "Alcohol under Food & Dining, Tobacco & vaping under Shopping, Lottery & betting under Entertainment");
ok(!CATEGORIES.some((c) => c.subs.includes("Alcohol & tobacco")), "alcohol and tobacco are two separate subcategories (no combined one)");
ok(CATEGORIES.every((c) => c.subs[c.subs.length - 1] === "Other" || c.income || c.id === "other"), "'Other' stays the last choice in every spending category");

section("R65C-2. Never assigned automatically");
ok(!KNOWN_MERCHANTS.some(([, , s]) => ["Alcohol", "Tobacco & vaping", "Lottery & betting"].includes(s)), "no built-in place points to them");
ok(!knownMerchantExact("Bet365") && !knownMerchantExact("Marlboro"), "typing a betting or tobacco brand suggests nothing");
const rows = [{ date: "2026-10-01", time: "10:00", type: "expense", cents: 2000, merchant: "LIQUOR STORE", kind: "payment", mcc: "5921" }, { date: "2026-10-02", time: "11:00", type: "expense", cents: 500, merchant: "TOBACCO SHOP", kind: "payment", mcc: "5993" }, { date: "2026-10-03", time: "12:00", type: "expense", cents: 300, merchant: "BETTING", kind: "payment", mcc: "7995" }];
const st = statementEntries("abb", rows, { known: KNOWN_MERCHANTS });
ok(st.every((e) => e.category === "other" && e.subcategory === ""), "a bank statement does not file liquor, tobacco or betting shops there by itself (they stay Other for the person to choose)", st.map((e) => [e.category, e.subcategory]));

section("R65C-3. Names in three languages");
setLang("az"); const az = ["Alcohol", "Tobacco & vaping", "Lottery & betting"].map(subName);
setLang("ru"); const ru = ["Alcohol", "Tobacco & vaping", "Lottery & betting"].map(subName);
setLang("en");
ok(eq(az, ["Spirtli içkilər", "Tütün və elektron siqaret", "Lotereya və mərc oyunları"]) && eq(ru, ["Алкоголь", "Табак и вейпы", "Лотереи и ставки"]), "az and ru names exist (drafts until a native speaker checks them)", { az, ru });

section("R65C-4. Older records and backups");
const old = [E(1, { subcategory: "Drinks", amount: 4 }), E(2, { category: "entertain", subcategory: "Games", amount: 9.99 }), E(3, { type: "income", category: "savout", amount: 300 }), E(4, { type: "income", category: "refund", amount: 15 })];
const { good } = partitionTransactions(old, { keepCategoryId: true });
ok(eq(good.map((x) => [x.id, x.category, x.subcategory, x.amount, x.type]), old.map((x) => [x.id, x.category, x.subcategory, x.amount, x.type])), "saved entries (including money from savings and refunds) load exactly as they were");
const file = JSON.stringify({ version: 10, transactions: old, budgets: { food: 200 }, templates: [], currency: "₼", goals: [] });
const p = planImport(file, "old.json");
ok(p.ok && p.transactions.length === 4 && eq(p.transactions.map((x) => x.category).sort(), ["entertain", "food", "refund", "savout"]) && p.settings.budgets.food === 200, "a backup made before this change imports with the same entries and budgets");
finish("run65cats");
