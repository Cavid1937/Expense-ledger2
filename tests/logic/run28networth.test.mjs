// Run 28: balances "as of" a day, and net position (accounts + owed to you - what you owe - loan balances). Expected values worked out by hand.
// Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { accountBalances, addAccount, addTransfer, netPosition, loanRemainingCents } = H;
reset();
let d = { accounts: [], transfers: [] };
let r = addAccount(d, "Card", "card", 100, "2026-10-01"); d = r.data; const A = r.id;
r = addAccount(d, "Old", "other", 50, "2026-10-01"); d = r.data; const B = r.id;
d = { ...d, accounts: d.accounts.map((a) => (a.id === B ? { ...a, hidden: true } : a)) };
const e = (account, type, amount, date) => ({ id: Math.random(), date, type, amount, category: type === "income" ? "salary" : "food", account });

section("R28-1. An entry dated after the day has not happened yet");
const txns = [e(A, "income", 20, "2026-10-05"), e(A, "expense", 30, "2099-01-01")];
ok(accountBalances(d, txns, "2026-11-05")[A] === 120, "planned expense for 2099 does not lower today's balance: 100 + 20 = 120", accountBalances(d, txns, "2026-11-05"));
ok(accountBalances(d, txns, "2099-12-31")[A] === 90, "as of 2099-12-31 it counts: 100 + 20 - 30 = 90");
ok(accountBalances(d, txns, "2099-01-01")[A] === 90, "an entry dated exactly on the day counts");
ok(accountBalances(d, [e(A, "expense", 10, "")], "2026-11-05")[A] === 90, "an entry with no valid date still counts, as before");
ok(accountBalances(d, txns)[A] === 120, "default day is today (the 2099 entry is still ahead)");
r = addTransfer(d, A, B, 25, "2099-02-02"); const dt = r.data;
ok(r.added && accountBalances(dt, txns, "2026-11-05")[A] === 120 && accountBalances(dt, txns, "2099-12-31")[A] === 65, "a transfer dated later moves money only from its day: 120 now, 90 - 25 = 65 later");

section("R28-2. Net position");
const debts = {
  debts: [
    { id: "d1", direction: "owed", name: "Rauf", principal: 20000, payments: [{ id: "p1", date: "2026-10-20", amount: 5000 }] },   // 200.00 owed, 50.00 repaid -> 150.00
    { id: "d2", direction: "owe", name: "Aysel", principal: 4000, payments: [] },                                                   // 40.00 owed by me
  ],
  loans: [{ id: "l1", lender: "Bank", kind: "cash", principal: 120000, ratePct: 0, rateType: "none", months: 12, firstPayment: "2026-01-10", bankPayment: null,
    payments: [{ id: "q1", date: "2026-01-10", amount: 10000 }, { id: "q2", date: "2026-02-10", amount: 10000 }] }],                // 1200.00, 2 of 12 paid -> 1000.00 left
};
let n = netPosition(d, txns, debts, "2026-11-05");
ok(n && n.accounts === 12000 && n.owedToMe === 15000 && n.iOwe === 4000 && n.loans === 100000 && n.net === 12000 + 15000 - 4000 - 100000, "120.00 + 150.00 - 40.00 - 1000.00 = -770.00 (hidden account left out)", n);
ok(netPosition(d, txns, { debts: [], loans: [] }, "2026-11-05") === null && netPosition(d, txns, null) === null, "nothing owed either way: null (the screen stays quiet)");
ok(loanRemainingCents({ ...debts.loans[0], payments: Array.from({ length: 12 }, (_, i) => ({ id: "x" + i, date: "2026-01-10", amount: 10000 })) }) === 0, "a loan with all payments recorded has nothing left");
ok(loanRemainingCents({ ...debts.loans[0], payments: [] }) === 120000, "a loan with no payment recorded still owes the principal");
n = netPosition({ accounts: [], transfers: [] }, [], { debts: [{ id: "d9", direction: "owe", name: "X", principal: 1, payments: [] }], loans: [] });
ok(n && n.net === -1 && n.accounts === 0, "one qapik owed, no accounts: -0.01 exactly (whole-cent arithmetic)", n);
finish("run28networth");