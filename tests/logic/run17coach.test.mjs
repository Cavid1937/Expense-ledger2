// Run 17 (2026-10-30): Financial Coach, first rules from the research rulebook: R0 data gate, R1 spent vs recorded income,
// R9 instalment due soon / overdue, R13 money owed to the user is late. Numbers with their window, never a score; a rule that
// lacks the data says so instead of showing a figure. Written BEFORE the code. Synthetic data only. Clock: 13 Oct 2026.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { calcCoach } = H;
reset();
const ids = (r) => r.map((c) => c.id);
const day = (i) => { const d = new Date(2026, 9, 13 - i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const spend = (n, amt = 10) => Array.from({ length: n }, (_, i) => T({ id: 100 + i, type: "expense", amount: amt, date: day(i) }));
const none = { debts: [], loans: [] };
const loan = (first, extra = {}) => ({ id: "l1", lender: "Test Bank", kind: "cash", principal: 100000, ratePct: 0, rateType: "none", months: 10, firstPayment: first, bankPayment: null, payments: [], ...extra });

section("R17-K1. Data gate (R0): too few logged days gives a plain notice and no figure");
let r = calcCoach([...spend(12), T({ id: 1, type: "income", amount: 400, date: day(3) })], none);
ok(eq(ids(r), ["incomplete"]) && r[0].days === 12, "12 of 30 days logged: only the 'may be incomplete' card, with the day count", r);
ok(eq(ids(calcCoach([], none)), []), "a ledger with no entries at all shows nothing (the empty-state help speaks instead)");

section("R17-K2. R1: spent vs recorded income");
r = calcCoach([...spend(20), T({ id: 1, type: "income", amount: 400, date: day(12) })], none);
ok(eq(ids(r), ["spent"]) && r[0].pct === 50 && r[0].kept === 50, "200 spent of 400 recorded = 50% spent, 50% kept", r);
r = calcCoach([...spend(20), T({ id: 1, type: "income", amount: 100, date: day(12) })], none);
ok(eq(ids(r), ["over"]) && r[0].pct === 200, "200 spent of 100 recorded = more than the income, neutral card", r);
r = calcCoach(spend(20), none);
ok(eq(ids(r), ["noIncome"]), "no income recorded: no percentage, an offer to add income", r);
r = calcCoach([...spend(20), T({ id: 1, type: "income", amount: 400, date: day(40) })], none);
ok(eq(ids(r), ["noIncome"]), "income older than 30 days is outside the window", r);

section("R17-K3. Entries dated in the future are excluded and counted");
r = calcCoach([...spend(20), T({ id: 1, type: "income", amount: 400, date: day(12) }), T({ id: 2, type: "expense", amount: 999, date: "2026-10-20" }), T({ id: 3, type: "expense", amount: 999, date: "2026-10-25" })], none);
ok(r.find((c) => c.id === "spent").pct === 50, "the two future expenses do not change the percentage");
ok(r.find((c) => c.id === "future").n === 2, "the card says how many were left out");

section("R17-K4. R9: a loan instalment due within 7 days, or overdue");
r = calcCoach([], { debts: [], loans: [loan("2026-10-16")] });
ok(eq(ids(r), ["loanDue"]) && r[0].lender === "Test Bank" && r[0].amount === 10000 && r[0].date === "2026-10-16", "due in 3 days: loanDue with lender, qapik amount and date", r);
r = calcCoach([], { debts: [], loans: [loan("2026-10-10")] });
ok(eq(ids(r), ["loanOverdue"]), "the first instalment was 3 days ago and is unpaid: overdue", r);
r = calcCoach([], { debts: [], loans: [loan("2026-10-10", { payments: [{ id: "p1", date: "2026-10-10", amount: 10000 }] })] });
ok(eq(ids(r), []), "after it is marked paid the next one is a month away: nothing to say", r);
r = calcCoach([], { debts: [], loans: [loan("2026-11-20")] });
ok(eq(ids(r), []), "an instalment weeks away is silent");
r = calcCoach([], { debts: [], loans: [loan("2026-10-13")] });
ok(eq(ids(r), ["loanDue"]), "due today counts as due soon", r);

section("R17-K5. R13: money owed to the user is late");
const debt = (o) => ({ id: "d1", direction: "owed", name: "Rauf", principal: 30000, dueDate: "2026-10-01", note: "", payments: [], ...o });
r = calcCoach([], { debts: [debt({})], loans: [] });
ok(eq(ids(r), ["owedLate"]) && r[0].name === "Rauf" && r[0].amount === 30000, "Rauf owes 300.00, due 1 Oct: one gentle card", r);
r = calcCoach([], { debts: [debt({ payments: [{ id: "p", date: "2026-10-02", amount: 30000 }] })], loans: [] });
ok(eq(ids(r), []), "settled: silent");
r = calcCoach([], { debts: [debt({ direction: "owe" })], loans: [] });
ok(eq(ids(r), []), "money the user owes is not a coach card here (the Debts page shows it)");
r = calcCoach([], { debts: [debt({ dueDate: "" })], loans: [] });
ok(eq(ids(r), []), "no due date: silent");

section("R17-K6. Order and robustness");
r = calcCoach([...spend(20), T({ id: 1, type: "income", amount: 400, date: day(12) })], { debts: [debt({})], loans: [loan("2026-10-16")] });
ok(eq(ids(r), ["loanDue", "owedLate", "spent"]), "actions first (loan, then owed to you), then the numbers", ids(r));
ok(eq(ids(calcCoach([], null)), []) && eq(ids(calcCoach(null, undefined)), []), "missing inputs do not throw");
finish("run17coach");
