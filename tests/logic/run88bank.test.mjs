// Run 88 (owner, 14 Nov: "they differ on the amount ... bank transfers must go to their own category"). Patterns copied from a real
// statement, but every name, number and amount here is invented. Expected values worked out by hand.
import { H, ok, section, finish, eq } from "./lib.mjs";
import { statementEntries, statementBalance, statementCheck, isTransferRow } from "../../statement.js";
const { applyResort, isEarnedCat, CATEGORIES } = H;
const row = (o) => ({ date: "2026-10-10", posted: "2026-10-12", time: "", type: "expense", cents: 100, desc: o.merchant, merchant: "X", balance: null, ref: "", mcc: "", cur: "AZN", orig: "", city: "BAKU", pending: false, kind: "payment", ...o });
const cat = (r) => { const e = statementEntries("abb", [row(r)])[0]; return [e.category, e.subcategory]; };

section("R88-1. Bank transfers have their own place, in both directions");
ok(!!CATEGORIES.find((c) => c.id === "transfers" && !c.income) && !!CATEGORIES.find((c) => c.id === "transferin" && c.income), "two new categories: Bank transfers (money out) and Transfers received (money in)");
ok(!isEarnedCat("transferin") && isEarnedCat("salary"), "money received by transfer is not counted as earned income");
ok(eq(cat({ merchant: "SOME BANK MOBILE", mcc: "4829" }), ["transfers", "Card to card"]), "merchant code 4829 (money transfer) out -> Bank transfers");
ok(eq(cat({ merchant: "www.paysite.az", mcc: "6532", type: "income" }), ["transferin", "Card to card"]), "code 6532 money in -> Transfers received, not Other income");
ok(eq(cat({ merchant: "IBA MOBILE" }), ["transfers", "Card to card"]) && eq(cat({ merchant: "AniPay C2C transfer", type: "income" }), ["transferin", "Card to card"]), "bank-app names and C2C words, without a code");
ok(eq(cat({ merchant: "P2P SEND- WALLET APP", type: "income", kind: "transfer" }), ["transferin", "From other people"]) && eq(cat({ merchant: "To A. Person", kind: "transfer" }), ["transfers", "Money sent to people"]), "P2P and 'to <person>' are money from / to people");
ok(eq(cat({ merchant: "terminal payment", type: "income" }), ["transferin", "Cash deposit"]), "cash put in at a payment terminal -> Cash deposit");
ok(eq(cat({ merchant: "SOME Electronics", mcc: "6012" })[0], "other") && !isTransferRow(row({ merchant: "SOME Electronics", mcc: "6012" })), "code 6012 is NOT taken for a transfer (shops use it for instalments)");

ok(eq(cat({ merchant: "DrFIN: 0AB12CD" }), ["transfers", "Card to card"]) && eq(cat({ merchant: "ABB MOBILE" }), ["transfers", "Card to card"]), "ABB 'DrFIN' (sent by personal ID code) and ABB MOBILE are transfers");
ok(eq(cat({ merchant: "www.jetshr.com", mcc: "7999" }), ["transport", "Bike & scooter"]) && eq(cat({ merchant: "YIGIM*WOLT", mcc: "4215" }), ["food", "Delivery"]) && eq(cat({ merchant: "binance.com", mcc: "6051" }), ["finance", "Investments"]), "scooters, food courier, crypto exchange");
ok(eq(cat({ merchant: "BI*SHOP", mcc: "5311" }), ["shopping", "Other"]) && eq(cat({ merchant: "TICKETS", mcc: "7922" }), ["entertain", "Events"]) && eq(cat({ merchant: "GIFTS", mcc: "5947" }), ["gifts", "Gifts"]), "department store, tickets, gift shop codes");
section("R88-2. Money back from a shop is a refund, not income");
ok(eq(cat({ merchant: "TP METRO", mcc: "4111", type: "income" }), ["refund", "Refund"]), "a credit from a metro (code 4111) -> Refunds");
ok(eq(cat({ merchant: "BURGER KING GM", type: "income" }), ["refund", "Refund"]), "a credit from a fast-food name -> Refunds");
ok(eq(cat({ merchant: "UNKNOWN CO", type: "income" }), ["income", ""]), "an unknown credit stays Other income (no guess)");

section("R88-3. A default category in the person's history does not decide");
const e1 = statementEntries("abb", [row({ merchant: "IBA MOBILE" })], { suggest: () => ({ category: "other", subcategory: "" }) })[0];
const e2 = statementEntries("abb", [row({ merchant: "IBA MOBILE" })], { suggest: () => ({ category: "family", subcategory: "Family support" }) })[0];
ok(e1.category === "transfers" && e2.category === "family", "past 'Other' is ignored; a real past choice still wins");

section("R88-4. The bank's start and end balance");
// newest first: 20.00 -> (-4.40) 15.60? Built backwards: opening 50.00, +30.00 -> 80.00, -9.10 -> 70.90, -0.90 -> 70.00
const rows = [row({ cents: 90, balance: 7000, date: "2026-11-02", posted: "2026-11-03" }), row({ cents: 910, balance: 7090, date: "2026-10-31", posted: "2026-11-02" }), row({ type: "income", cents: 3000, balance: 8000, date: "2026-10-20", posted: "2026-10-21" })];
const chk = statementCheck(rows), bal = statementBalance(rows, chk);
ok(chk.ok && bal && bal.opening === 5000 && bal.closing === 7000 && bal.from === "2026-10-20", "opening 50.00 (before the oldest row), closing 70.00, from the earliest paid day", bal);
ok(bal.moved === 1, "one row was paid in October but processed in November", bal && bal.moved);
const broken = [row({ cents: 90, balance: 7000 }), row({ cents: 910, balance: 9999 })];
ok(statementBalance(broken, statementCheck(broken)) === null, "a balance that does not add up gives no figure at all");

section("R88-5. Sorting earlier entries touches only ones still in a default category");
const list = [{ id: "s1", type: "expense", category: "other", subcategory: "" }, { id: "s2", type: "expense", category: "food", subcategory: "Groceries" }, { id: "s3", type: "income", category: "income", subcategory: "" }, { id: "s4", type: "expense", category: "other", subcategory: "" }];
const r = applyResort(list, [{ id: "s1", category: "transfers", subcategory: "Card to card" }, { id: "s2", category: "transfers", subcategory: "Card to card" }, { id: "s3", category: "refund", subcategory: "Refund" }]);
ok(r.n === 2 && r.list[0].category === "transfers" && r.list[1].category === "food" && r.list[2].category === "refund" && r.list[3].category === "other", "s1 and s3 sorted; s2 (chosen by the person) and s4 (not in the list) unchanged", r.list.map((x) => x.category));
ok(r.list.every((x, i) => x.id === list[i].id && x.type === list[i].type), "ids and money direction never change");
section("R88-6. Import: a new account that starts at the bank's opening balance");
const plan = { kind: "statement", statement: { bank: "abb", balance: { opening: 5000, closing: 7000, from: "2026-10-20", moved: 1 } }, stOpts: { account: "", newAcc: true }, transactions: [{ id: "s9", type: "expense", amount: 9.1 }], accountData: { accounts: [], transfers: [] } };
const u1 = H.importPlanUse(plan, { accounts: [], transfers: [] });
const acc = u1.accPlan && u1.accPlan.data.accounts[0];
ok(acc && acc.name === "ABB" && acc.opening.amount === 50 && acc.opening.date === "2026-10-20" && u1.planUse.transactions[0].account === acc.id, "an ABB account starting at 50.00 on the first paid day; the entries go on it", acc);
const u2 = H.importPlanUse(plan, { accounts: [{ id: "a_mine01", name: "abb", kind: "card", opening: { amount: 12, date: "" } }], transfers: [] });
ok(u2.planUse.transactions[0].account === "a_mine01" && u2.accPlan.data.accounts.length === 1 && u2.accPlan.data.accounts[0].opening.amount === 12, "an account already named ABB is used as it is (its own start amount is kept)");
const u3 = H.importPlanUse({ ...plan, stOpts: { account: "", newAcc: false } }, { accounts: [], transfers: [] });
ok(!u3.accPlan && !u3.planUse.transactions[0].account, "with the choice off, no account is made");
finish("run88bank");
