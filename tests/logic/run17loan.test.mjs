// Run 17 (2026-10-30): debts (informal, person to person) and loans (formal, with a rate and a schedule). Written BEFORE the code.
// Money is whole qapik (integers) everywhere in this module; 1 AZN = 100 qapik. Interest is rounded half-up to the qapik each month.
// The loan cases are the researchers' hand-computed cases 1 to 7 and 10 from "Financial coach rulebook research", section 4, re-derived
// here (not copied from any code output). Rate types: annuity (nominal annual rate / 12 monthly, equal payments), equal (equal principal),
// flat (interest = principal x rate x years on the original amount, equal payments), none (0%, equal split, remainder in the last payment).
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { loanSchedule, impliedNominalPct, debtRemaining, debtCanPay, cleanDebtData, readDebts, writeDebts, mergeDebtData, buildBackup, planImport } = H;
reset();
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const L = (o) => ({ principal: 500000, ratePct: 18, rateType: "annuity", months: 12, firstPayment: "2026-11-25", ...o });

section("R17-L1. The pieces exist");
ok([loanSchedule, impliedNominalPct, debtRemaining, debtCanPay, cleanDebtData, readDebts, writeDebts, mergeDebtData].every((f) => typeof f === "function"), "loanSchedule, impliedNominalPct, debtRemaining, debtCanPay, cleanDebtData, readDebts, writeDebts and mergeDebtData are defined");
if (typeof loanSchedule !== "function") { console.log("  (remaining checks skipped: not written yet)"); finish("run17loan"); }

section("R17-L2. 5,000 AZN, 12 months, 18% nominal, annuity");
// r = 0.015; A = 5000 x 0.015 / (1 - 1.015^-12) = 458.40. Month 1: interest 75.00, principal 383.40, balance 4,616.60. Last payment 458.39. Interest 500.79.
let s = loanSchedule(L({}));
ok(s.payments.length === 12 && s.payments[0].payment === 45840 && s.payments[0].interest === 7500 && s.payments[0].principal === 38340 && s.payments[0].balance === 461660, "payment 458.40; month 1: interest 75.00, principal 383.40, balance 4,616.60", s.payments[0]);
ok(s.payments[11].payment === 45839 && s.payments[11].balance === 0 && s.totalInterest === 50079, "last payment 458.39, balance 0, total interest 500.79", [s.payments[11], s.totalInterest]);
ok(s.payments.reduce((a, p) => a + p.principal, 0) === 500000 && s.totalPaid === 500000 + 50079, "principal parts add up to exactly 5,000.00 and everything paid is 5,500.79");

section("R17-L3. Same loan, equal principal");
// Principal part 5000/12 = 416.67 (last takes the rest: 5000 - 11 x 416.67 = 416.63). Month 1: 416.67 + 75.00 = 491.67. Last: 416.63 + 6.25 = 422.88. Interest 487.50.
s = loanSchedule(L({ rateType: "equal" }));
ok(s.payments[0].payment === 49167 && s.payments[11].payment === 42288 && s.totalInterest === 48750, "first 491.67, last 422.88, interest 487.50", [s.payments[0].payment, s.payments[11].payment, s.totalInterest]);

section("R17-L4. Same loan quoted 18% flat");
// Interest = 5000 x 18% x 1 year = 900; payment = 5900 / 12 = 491.67 (last 491.63); implied rate on the falling balance about 31.7%.
s = loanSchedule(L({ rateType: "flat" }));
ok(s.totalInterest === 90000 && s.payments[0].payment === 49167 && s.payments[11].payment === 49163 && s.totalPaid === 590000, "interest 900.00, payment 491.67, last 491.63, total 5,900.00", [s.totalInterest, s.payments[0].payment, s.payments[11].payment]);
ok(near(impliedNominalPct(500000, 12, 49167), 31.7, 0.05), "the implied yearly rate on the falling balance is about 31.7%", impliedNominalPct(500000, 12, 49167));

section("R17-L5. Smaller loans");
s = loanSchedule(L({ principal: 120000, months: 6, ratePct: 12 }));
ok(s.payments[0].payment === 20706 && s.payments[5].payment === 20705 && s.totalInterest === 4235, "1,200 AZN, 6 months, 12%: 207.06, last 207.05, interest 42.35", [s.payments[0].payment, s.payments[5].payment, s.totalInterest]);
s = loanSchedule(L({ principal: 100000, months: 3, ratePct: 0, rateType: "none" }));
ok(eq(s.payments.map((p) => p.payment), [33333, 33333, 33334]) && s.totalInterest === 0, "1,000 AZN, 3 months, 0%: 333.33, 333.33, 333.34", s.payments.map((p) => p.payment));
s = loanSchedule(L({ principal: 100000, months: 3, ratePct: 18, rateType: "none" }));
ok(s.totalInterest === 0, "rate type 'none' ignores any rate typed");
s = loanSchedule(L({ principal: 1000000, months: 24, ratePct: 24 }));
ok(s.payments[0].payment === 52871 && s.payments[23].payment === 52874 && s.totalInterest === 268907, "10,000 AZN, 24 months, 24%: 528.71, last 528.74, interest 2,689.07", [s.payments[0].payment, s.payments[23].payment, s.totalInterest]);
s = loanSchedule(L({ principal: 60000, months: 4, ratePct: 12 }));
ok(s.payments[0].payment === 15377 && s.payments[3].payment === 15376 && s.totalInterest === 1507, "600 AZN, 4 months, 12%: 153.77, last 153.76, interest 15.07", [s.payments[0].payment, s.payments[3].payment, s.totalInterest]);

section("R17-L6. Payment dates stay on the same day of the month, shortened only when the month is shorter");
s = loanSchedule(L({ months: 5, firstPayment: "2026-01-31" }));
ok(eq(s.payments.map((p) => p.date), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]), "31 Jan, 28 Feb, 31 Mar, 30 Apr, 31 May (no drift)", s.payments.map((p) => p.date));

section("R17-L7. The bank's own payment, when the person types it, overrides ours");
s = loanSchedule(L({ bankPayment: 46000 }));
ok(s.payments.slice(0, -1).every((p) => p.payment === 46000) && s.payments[11].balance === 0 && s.payments.reduce((a, p) => a + p.principal, 0) === 500000, "11 payments of 460.00, the last clears the balance, principal adds up to 5,000.00", s.payments[11]);

section("R17-L8. Unusable terms are refused, never guessed");
for (const bad of [{ months: 0 }, { months: 1.5 }, { months: 700 }, { principal: 0 }, { principal: 1000.5 }, { ratePct: -1 }, { ratePct: 150 }, { rateType: "magic" }, { firstPayment: "2026-13-01" }, { firstPayment: "" }, { bankPayment: -5 }])
  ok(loanSchedule(L(bad)) === null, `${JSON.stringify(bad)} gives no schedule`);

section("R17-L9. Informal debts: the balance is derived from the payments");
// 300.00 owed; paid 100.00 and 50.00 -> 150.00 left. Paying exactly 150.00 settles it; 160.00 is more than is owed. Deleting the 50.00 payment gives 200.00 again.
const D = { id: "d1", direction: "owed", name: "Rauf", principal: 30000, dueDate: "", note: "", payments: [{ id: "p1", date: "2026-10-01", amount: 10000 }, { id: "p2", date: "2026-10-05", amount: 5000 }] };
ok(debtRemaining(D) === 15000 && debtCanPay(D, 15000) === true && debtCanPay(D, 16000) === false && debtCanPay(D, 0) === false && debtCanPay(D, 10.5) === false, "remaining 150.00; 150.00 can be paid, 160.00 cannot, 0 and half-qapik cannot");
ok(debtRemaining({ ...D, payments: [D.payments[0]] }) === 20000, "deleting the 50.00 payment restores the balance to 200.00");
ok(debtRemaining({ ...D, payments: [...D.payments, { id: "p3", date: "2026-10-06", amount: 15000 }] }) === 0, "paying the rest settles it (0)");

section("R17-L10. Stored data is cleaned, never trusted");
const raw = { version: 1, debts: [D, { ...D, id: "d1" }, { ...D, id: "d2", principal: 12.5 }, { ...D, id: "d3", direction: "x" }, { ...D, id: "d4", name: "  " + "n".repeat(90) + "  ", dueDate: "2026-02-30", note: 5 }, 7, null],
  loans: [{ id: "l1", lender: " Bank ", kind: "cash", principal: 500000, ratePct: 18, rateType: "annuity", months: 12, firstPayment: "2026-11-25", bankPayment: null, payments: [{ id: "x", date: "2026-11-25", amount: 45840, txnId: 12 }, { id: "y", date: "bad", amount: 1 }] }, { id: "l2", lender: "B", principal: 5, months: 0 }] };
const c = cleanDebtData(raw);
ok(c.debts.length === 2 && c.debts[0].id === "d1" && c.debts[1].id === "d4", "of the debts, the good one and the one with only a bad date/note survive; duplicates, fractions, unknown directions and non-objects are dropped", c.debts.map((d) => d.id));
ok(c.debts[1].name.length === 60 && c.debts[1].dueDate === "" && c.debts[1].note === "", "long names are cut to 60, an impossible date and a non-text note become empty", c.debts[1]);
ok(c.loans.length === 1 && c.loans[0].lender === "Bank" && c.loans[0].payments.length === 1 && c.loans[0].payments[0].txnId === 12, "of the loans, only the valid one survives, with only its valid payment", c.loans);
ok(eq(cleanDebtData(null), { debts: [], loans: [] }) && eq(cleanDebtData("x"), { debts: [], loans: [] }) && eq(cleanDebtData({ debts: "no" }), { debts: [], loans: [] }), "nothing, text or a wrong shape gives empty lists");

section("R17-L11. Stored under its own key; the main key is untouched");
globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [], language: "en" }));
const before = globalThis.__store.get("expense_ledger_v5");
ok(writeDebts(c) === true && eq(readDebts(), c), "write then read gives the same data");
ok(globalThis.__store.get("expense_ledger_v5") === before, "the main saved-data key is byte-for-byte unchanged");
ok(writeDebts({ debts: [], loans: [] }) === true && ![...globalThis.__store.keys()].some((k) => /debts/.test(k)), "saving nothing removes the key instead of keeping an empty shell");
globalThis.__store.set("expense_ledger_v5__debts", "{not json");
ok(eq(readDebts(), { debts: [], loans: [] }), "unreadable stored text reads as empty instead of crashing");
globalThis.__store.delete("expense_ledger_v5__debts");

section("R17-L12. Backups carry them (optional fields); older files are unchanged");
const st = { transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 }, bills: [] };
const b0 = buildBackup(st, "2026-10-30T00:00:00.000Z");
ok(!("debts" in b0) && !("loans" in b0), "with no debts or loans the backup file has no new fields");
const b1 = buildBackup({ ...st, debtData: c }, "2026-10-30T00:00:00.000Z");
ok(eq(b1.debts, c.debts) && eq(b1.loans, c.loans), "with some, the backup holds them", Object.keys(b1));
const plan = planImport(JSON.stringify({ ...b1, transactions: [{ id: 1, type: "expense", amount: 5, category: "food", date: "2026-10-01" }] }), "b.json");
ok(plan.ok && eq(plan.debtData, c), "reading such a file gives the cleaned debts and loans", plan.debtData);
ok(planImport(JSON.stringify({ ...b0, transactions: [{ id: 1, type: "expense", amount: 5, category: "food", date: "2026-10-01" }] }), "b.json").debtData.debts.length === 0, "a file without them gives empty lists");
const m = mergeDebtData({ debts: [D], loans: [] }, { debts: [{ ...D, name: "Other Rauf" }, { ...D, id: "d9" }], loans: c.loans });
ok(m.debts.length === 2 && m.debts[0].name === "Rauf" && m.debts[1].id === "d9" && m.loans.length === 1, "merging adds what is new by id and never overwrites what is on the device");
finish("run17loan");
