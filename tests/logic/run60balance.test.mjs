// Run 60 (integrity plan item 6, "balance check after a merge"): before anything is added, the import sheet shows each account whose
// balance would change, now and after. The preview runs the same steps as the Add button. Expected values worked out by hand. Synthetic data.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { mergeBalancePreview } = H;
reset();
const E = (id, type, amount, o = {}) => ({ id, type, amount, category: type === "income" ? "income" : "food", subcategory: "", merchant: "M" + id, note: "", date: "2026-10-05", recurring: false, recurFreq: null, isActive: true, createdAt: "2026-10-05T10:00:00.000Z", ...o });
const A = (id, name, kind, opening) => ({ id, name, kind, opening: { amount: opening, date: "" }, hidden: false });
const accData = { accounts: [A("a_card01", "Card", "card", 100), A("a_cash01", "Cash", "cash", 20)], transfers: [] };
const state = { transactions: [E("x1", "expense", 30, { account: "a_card01" })], budgets: {}, templates: [], goals: [], bills: [], currency: "₼" };
const AS = "2026-11-13";

section("R60-1. A bank statement put on one account");
const st = { kind: "statement", transactions: [E("s1", "income", 50), E("s2", "expense", 12.5)], stOpts: { account: "a_card01" }, settings: {} };
let r = mergeBalancePreview(state, st, accData, {}, AS);
ok(eq(r, [{ id: "a_card01", name: "Card", before: 70, after: 107.5 }]), "Card: 100 - 30 = 70 now; + 50 - 12.50 = 107.50 after; Cash does not change, so it is not listed", r);
const already = { ...state, transactions: [...state.transactions, E("s2", "expense", 12.5, { account: "a_card01" })] };
r = mergeBalancePreview(already, st, accData, {}, AS);
ok(eq(r, [{ id: "a_card01", name: "Card", before: 57.5, after: 107.5 }]), "an entry already here (same id) is not added again: 57.50 now, only the 50 is added -> 107.50", r);

section("R60-2. A backup file with its own accounts");
const file = { transactions: [E("f1", "income", 10, { account: "a_sav001" }), E("f2", "expense", 5, { account: "a_card99" })], settings: {},
  accountData: { accounts: [A("a_sav001", "Savings", "bank", 500), A("a_card99", "Card", "card", 999)], transfers: [] } };
r = mergeBalancePreview(state, file, accData, {}, AS);
ok(eq(r, [{ id: "a_card01", name: "Card", before: 70, after: 65 }, { id: "a_sav001", name: "Savings", before: null, after: 510 }]),
  "the file's 'Card' is the Card here (its 999 opening is not added): 70 -> 65; the new Savings account is listed as new with 500 + 10 = 510", r);

section("R60-3. Nothing to show");
ok(eq(mergeBalancePreview(state, st, { accounts: [], transfers: [] }, {}, AS), []), "no accounts at all: no lines");
ok(eq(mergeBalancePreview(state, { kind: "statement", transactions: [E("s3", "expense", 4)], stOpts: { account: "" }, settings: {} }, accData, {}, AS), []), "entries on no account: no account changes, no lines");
ok(state.transactions.length === 1 && state.transactions[0].amount === 30, "the preview changes nothing it was given");
finish("run60balance");
