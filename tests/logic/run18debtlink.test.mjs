// Run 18 (2026-10-31), owner decision "ask each time": a person-to-person debt repayment may ALSO create a linked cash-flow entry.
// The linked entry is money paid out (you repay) or received (you are repaid). Principal is neither ordinary spending nor ordinary income.
// Stored as an optional debtLink:{debtId,paymentId} on the ordinary entry and txnId on the debt payment, so old data is unchanged.
// Written BEFORE the code. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { migrateAndLoad, forSpending, debtCashFlow, cleanDebtData, mergeDebtData, readDebts, writeDebts } = H;
reset();
const KEY = "expense_ledger_v5", DKEY = "expense_ledger_v5__debts";
const link = (o) => T({ id: 9, amount: 100, category: "finance", merchant: "Rauf", date: "2026-10-10", debtLink: { debtId: "d1", paymentId: "p1" }, ...o });

section("R18-DL1. The link field is kept only when well-formed");
globalThis.__store.set(KEY, JSON.stringify({ transactions: [link({ id: 1 }), link({ id: 2, debtLink: { debtId: "d1" } }), link({ id: 3, debtLink: "x" }), link({ id: 4, debtLink: { debtId: "", paymentId: "p" } }), T({ id: 5 })], language: "en" }));
const st = migrateAndLoad(); const by = (id) => st.transactions.find((t) => t.id === id);
ok(eq(by(1).debtLink, { debtId: "d1", paymentId: "p1" }), "a good link survives save and load");
ok(by(2).debtLink === undefined && by(3).debtLink === undefined && by(4).debtLink === undefined, "incomplete, text and blank links are dropped (the entry stays ordinary)");
ok(!("debtLink" in by(5)) && st.transactions.length === 5, "an ordinary entry gets no new field; nothing is lost");

section("R18-DL2. Principal is neither spending nor income");
const list = [link({ id: 1, type: "expense" }), link({ id: 2, type: "income", category: "income" }), T({ id: 3, amount: 20 }), T({ id: 4, type: "income", amount: 500, category: "salary" })];
const v = forSpending(list);
ok(v.length === 2 && v.every((t) => t.id === 3 || t.id === 4), "both repayment directions are removed from the spending/income views; ordinary entries stay");
ok(forSpending([link({ id: 7, debtLink: undefined })]).length === 1, "an entry without a link is ordinary");

section("R18-DL3. Cash flow view: money paid out and received, per month");
const cf = debtCashFlow([link({ id: 1, amount: 100 }), link({ id: 2, type: "income", amount: 40 }), link({ id: 3, amount: 5, date: "2026-09-10" }), T({ id: 4, amount: 9 })], "2026-10");
ok(cf.out === 100 && cf.in === 40 && cf.n === 2, "October: 100 paid out, 40 received, 2 repayments", cf);
ok(debtCashFlow([], "2026-10").n === 0, "no repayments: zero");

section("R18-DL4. Debt payments keep their entry id; old data loads unchanged");
const raw = { debts: [{ id: "d1", direction: "owe", name: "Rauf", principal: 30000, dueDate: "", note: "", payments: [{ id: "p1", date: "2026-10-10", amount: 10000, txnId: 123.5 }, { id: "p2", date: "2026-10-11", amount: 500 }, { id: "p3", date: "2026-10-12", amount: 500, txnId: { x: 1 } }] }], loans: [] };
const c = cleanDebtData(raw).debts[0].payments;
ok(c[0].txnId === 123.5 && !("txnId" in c[1]) && !("txnId" in c[2]), "a valid entry id is kept; missing or malformed ones are not invented");
ok(eq(mergeDebtData(raw, raw).debts[0].payments.map((p) => p.id), ["p1", "p2", "p3"]), "merging the same data twice does not duplicate payments");

section("R18-DL5. Storage round trip (backup/restore uses the same cleaner)");
reset(); ok(writeDebts(raw) === true && readDebts().debts[0].payments[0].txnId === 123.5, "write then read keeps the link id");
finish("run18debtlink");
