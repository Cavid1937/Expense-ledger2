// Run 18 (2026-10-31): edge cases of the owner's loan-payment rule (full instalment cash out, only interest = spending, unknown split invents nothing).
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { migrateAndLoad, forSpending, loanCashOut } = H;
reset();
const KEY = "expense_ledger_v5";
const pay = (o) => T({ id: 7, amount: 458.4, category: "finance", merchant: "Test Bank", date: "2026-10-10", ...o });

section("R18-LE1. Principal-only and interest-only payments");
ok(forSpending([pay({ loan: { interest: 0 } })]).length === 0, "principal only (interest 0): nothing counts as spending");
let v = forSpending([pay({ amount: 75, loan: { interest: 75 } })]);
ok(v.length === 1 && v[0].amount === 75, "interest only (interest = whole payment): all of it counts as spending");
ok(loanCashOut([pay({ loan: { interest: 0 } })], "2026-10").paid === 458.4, "principal-only payment still counts fully as cash paid out");

section("R18-LE2. Mixed list and totals");
const mix = [pay({ id: 1, loan: { interest: 75 } }), pay({ id: 2, amount: 100, loan: { interest: 0 } }), pay({ id: 3, amount: 50, loan: { interest: null } }), T({ id: 4, amount: 20 })];
const spent = forSpending(mix).reduce((s, t) => s + t.amount, 0);
ok(Math.round(spent * 100) === 9500, "spending = 75.00 interest + 20.00 ordinary; principal and unknown add nothing", spent);
const c = loanCashOut(mix, "2026-10");
ok(Math.round(c.paid * 100) === 60840 && c.n === 3 && c.unknown === 1 && c.interest === 75, "cash out counts all three payments in full", c);

section("R18-LE3. Legacy and malformed records");
globalThis.__store.set(KEY, JSON.stringify({ transactions: [pay({ id: 1 }), pay({ id: 2, loan: { interest: "abc" } }), pay({ id: 3, loan: [] })], language: "en" }));
const st = migrateAndLoad();
ok(st.transactions.length === 3 && st.transactions.every((t) => t.loan === undefined), "old entries and malformed loan fields load as ordinary expenses (nothing lost, nothing invented)");
ok(forSpending(st.transactions).reduce((s, t) => s + t.amount, 0) === 458.4 * 3, "they count fully as spending, exactly as before this feature");

section("R18-LE4. Income and other months are not affected");
ok(forSpending([pay({ type: "income", loan: { interest: 5 } })])[0].type === "income", "an income entry is never reduced to interest");
ok(loanCashOut([pay({ date: "2026-09-10", loan: { interest: 5 } })], "2026-10").n === 0, "another month's payment is not in October's cash out");
finish("run18loanedge");
