// Run 32 (backlog item 2): the CSV export carries Account, LoanInterest and DebtRepayment after Trip, earlier columns did not move,
// and the app's own CSV import still round-trips. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset, T, eq } from "./lib.mjs";
const { buildCsv, planImport } = H;
reset();
globalThis.__store.set("expense_ledger_v5__accounts", JSON.stringify({ version: 1, accounts: [{ id: "a_card01", name: "ABB Card", kind: "card", opening: { amount: 0, date: "" }, hidden: false }], transfers: [] }));
const cells = (line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));
const tx = [
  T({ id: 1, merchant: "Shop", amount: 12.5, account: "a_card01", wallet: "card", trip: "Baku" }),
  T({ id: 2, merchant: "Bank", amount: 500, category: "finance", loan: { interest: 37.25 } }),
  T({ id: 3, merchant: "Bank2", amount: 100, category: "finance", loan: { interest: null } }),
  T({ id: 4, merchant: "Friend", amount: 40, category: "other", debtLink: { debtId: "d1", paymentId: "p1" } }),
  T({ id: 5, merchant: "Plain", amount: 3 }),
];
const lines = buildCsv(tx).replace(/^﻿/, "").split("\r\n");
section("R32-C1. Header and columns");
ok(eq(cells(lines[0]), ["Date", "Type", "Category", "Subcategory", "Merchant", "Amount", "Note", "Recurring", "CategoryId", "Wallet", "Trip", "Account", "LoanInterest", "DebtRepayment", "RefundOf", "PaidAmount", "PaidCurrency", "Rate", "SpreadMonths", "OthersPayBack", "OthersName"]), "the first 11 columns are exactly as before; Account, LoanInterest, DebtRepayment, RefundOf (Run 36), then PaidAmount, PaidCurrency, Rate (Run 39), SpreadMonths (Run 41), OthersPayBack, OthersName (Run 43b) follow", cells(lines[0]));
const r = lines.slice(1).map(cells);
ok(r.every((c) => c.length === 21), "every row has 21 cells", r.map((c) => c.length));
section("R32-C2. Values");
ok(r[0][11] === "ABB Card" && r[0][12] === "" && r[0][13] === "", "an entry on an account shows the account's name, no loan interest, no debt flag", r[0].slice(9));
ok(r[1][12] === "37.25" && r[1][11] === "", "a loan instalment shows its interest 37.25 (and no account)", r[1].slice(9));
ok(r[2][12] === "unknown", "a loan instalment whose split was not given says unknown, never 0.00", r[2].slice(9));
ok(r[3][13] === "yes" && r[3][12] === "", "a person-to-person repayment entry is flagged yes", r[3].slice(9));
ok(r[4][11] === "" && r[4][12] === "" && r[4][13] === "", "a plain entry has the three new cells empty", r[4].slice(9));
section("R32-C3. The app's own import still reads its own export");
const rt = planImport(buildCsv(tx), "export.csv");
ok(rt.ok && rt.skippedCount === 0 && rt.transactions.length === 5, "5 rows in, 5 entries read, none skipped", rt.error || rt.skippedSummary);
ok(rt.transactions.map((t) => t.amount).join() === "12.5,500,100,40,3", "amounts survive exactly", rt.transactions.map((t) => t.amount));
finish("run32csv");
