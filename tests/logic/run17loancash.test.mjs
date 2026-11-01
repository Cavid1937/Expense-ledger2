// Run 17 (2026-10-30), owner rule: a loan payment is recorded as the FULL instalment (cash out). Only its interest counts as spending;
// the principal part is not ordinary spending (it reduces the loan). If the split is unknown nothing is invented: the payment stays
// a cash outflow but adds nothing to spending. Stored as an optional field loan:{interest} on the ordinary transaction, so old data
// and the permanent key are unchanged. Written BEFORE the code. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { migrateAndLoad, normaliseTxn, forSpending, loanCashOut } = H;
reset();
const KEY = "expense_ledger_v5";
const store = (txns) => globalThis.__store.set(KEY, JSON.stringify({ transactions: txns, language: "en" }));
const pay = (o) => T({ id: 7, amount: 458.4, category: "finance", merchant: "Test Bank", date: "2026-10-10", ...o });

section("R17-LC1. The optional loan field is kept, and only when well-formed");
store([pay({ id: 1, loan: { interest: 75 } }), pay({ id: 2, loan: { interest: null } }), pay({ id: 3, loan: { interest: -5 } }), pay({ id: 4, loan: "x" }), pay({ id: 5, loan: { interest: "75" } }), T({ id: 6 })]);
let st = migrateAndLoad();
const by = (id) => st.transactions.find((t) => t.id === id);
ok(eq(by(1).loan, { interest: 75 }) && eq(by(2).loan, { interest: null }), "interest 75 and 'unknown' (null) survive a save and load", [by(1).loan, by(2).loan]);
ok(by(3).loan === undefined && by(4).loan === undefined && by(5).loan === undefined, "negative, non-object and text values are dropped (the entry stays an ordinary expense)");
ok(!("loan" in by(6)) && st.transactions.length === 6, "an ordinary entry gets no new field; nothing is set aside");

section("R17-LC2. Spending view: only the interest counts");
let v = forSpending([pay({ id: 1, loan: { interest: 75 } })]);
ok(v.length === 1 && v[0].amount === 75 && v[0].type === "expense", "458.40 paid with 75.00 interest counts as 75.00 of spending", v);
v = forSpending([pay({ id: 1, loan: { interest: 0 } })]);
ok(v.length === 0, "interest 0 (no-interest loan): the payment is not spending at all");
v = forSpending([pay({ id: 1, loan: { interest: null } })]);
ok(v.length === 0, "unknown split: nothing is counted, nothing is invented");
v = forSpending([pay({ id: 1, loan: { interest: 900 } })]);
ok(v.length === 1 && v[0].amount === 458.4, "an interest value above the payment is capped at the payment");
const plain = T({ id: 2, amount: 12.5 });
ok(forSpending([plain])[0] === plain, "an ordinary entry is passed through untouched (same object)");
const orig = pay({ id: 3, loan: { interest: 75 } });
forSpending([orig]);
ok(orig.amount === 458.4, "the stored entry itself is never changed");

section("R17-LC3. Cash out: the full instalment counts, per month");
const list = [pay({ id: 1, loan: { interest: 75 } }), pay({ id: 2, loan: { interest: null }, date: "2026-10-20" }), pay({ id: 3, loan: { interest: 10 }, date: "2026-09-10" }), T({ id: 4, amount: 50, date: "2026-10-11" })];
const c = loanCashOut(list, "2026-10");
ok(c.paid === 916.8 && c.n === 2 && c.interest === 75 && c.unknown === 1, "October: two payments, 916.80 paid out, 75.00 known interest, one with unknown split", c);
ok(loanCashOut([T({ id: 1 })], "2026-10").n === 0, "no loan payments: zero");
finish("run17loancash");
