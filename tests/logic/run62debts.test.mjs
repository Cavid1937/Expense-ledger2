// Run 62 (owner batch D9): what was left after each debt or loan payment, and one spreadsheet with the whole history.
// Expected values worked out by hand (money in whole qapik). Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { debtLeftAfter, loanLeftAfter, buildDebtsCsv, loanSchedule } = H;
reset();
const debt = { id: "d1", direction: "owe", name: "Elvin", principal: 50000, dueDate: "2026-12-01", note: "", payments: [{ id: "p1", date: "2026-10-01", amount: 10000 }, { id: "p2", date: "2026-10-15", amount: 15050, txnId: 7 }, { id: "p3", date: "2026-11-01", amount: 24950 }] };
// a 1,200.00 loan over 3 months with no interest: 400 each; balance 800, 400, 0
const loan = { id: "l1", lender: "=Bank", kind: "cash", principal: 120000, months: 3, rateType: "none", ratePct: 0, firstPayment: "2026-09-10", bankPayment: null, payments: [{ id: "q1", date: "2026-09-10", amount: 40000, interest: 0 }, { id: "q2", date: "2026-10-10", amount: 40000, interest: 0 }] };

section("R62-1. Left after each payment");
ok(eq(debtLeftAfter(debt), [40000, 24950, 0]), "500.00 owed: 400.00 left, then 249.50, then 0 (100 + 150.50 + 249.50 = 500)", debtLeftAfter(debt));
ok(eq(loanLeftAfter(loan), [80000, 40000]), "the loan: 800.00 left after the first payment, 400.00 after the second (the schedule's balance)", loanLeftAfter(loan));
ok(loanSchedule(loan).payments[1].balance === 40000, "the same figure as the loan card's balance");
ok(eq(debtLeftAfter({ ...debt, payments: [] }), []) && eq(debtLeftAfter({ ...debt, payments: [{ id: "x", date: "2026-10-01", amount: 60000 }] }), [0]), "no payments: nothing; never below zero");

section("R62-2. The spreadsheet");
const csv = buildDebtsCsv({ debts: [debt], loans: [loan] });
const lines = csv.replace(/^﻿/, "").split("\r\n");
ok(lines[0] === '"Kind","Name","Direction","Event","Date","Amount","LeftAfter","AlsoInEntries"', "plain column names", lines[0]);
ok(lines.length === 1 + 4 + 3, "one start line and one line per payment: 4 for the debt, 3 for the loan", lines.length);
ok(lines[1] === '"Debt","Elvin","I owe","Start","","500.00","500.00",""' && lines[3] === '"Debt","Elvin","I owe","Payment","2026-10-15","150.50","249.50","yes"', "each payment with its date, amount, what was left and whether it is also in Entries", [lines[1], lines[3]]);
ok(lines[5] === '"Loan","\'=Bank","I owe","Start","2026-09-10","1200.00","1200.00",""', "a name that starts with = is written as text (no spreadsheet formula)", lines[5]);
ok(lines[7] === '"Loan","\'=Bank","I owe","Payment","2026-10-10","400.00","400.00",""', "the loan's second payment: 400.00 paid, 400.00 left", lines[7]);
ok(csv.startsWith("﻿"), "starts with the mark Excel needs to read Azerbaijani and Russian letters");
finish("run62debts");
