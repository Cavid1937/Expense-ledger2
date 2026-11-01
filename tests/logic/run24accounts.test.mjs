// Run 24: accounts, derived balances and transfers. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { cleanAccountData, accountBalances, addAccount, addTransfer, accountInUse, mergeAccountData, buildBackup, planImport } = H;
reset();

let d = { accounts: [], transfers: [] };
let r = addAccount(d, " Kapital  card ", "card", 100.1, "2026-10-01"); d = r.data; const A = r.id;
r = addAccount(d, "Cash", "cash", 0, ""); d = r.data; const B = r.id;
const e = (account, type, amount) => ({ id: Math.random(), date: "2026-10-05", type, amount, category: type === "income" ? "salary" : "food", ...(account ? { account } : {}) });

section("R24-AC1. Balances are derived, to the cent");
const txns = [e(A, "income", 50), e(A, "expense", 20.05), e(B, "expense", 10), e(null, "expense", 999)];
r = addTransfer(d, A, B, 30, "2026-10-06"); d = r.data;
let bal = accountBalances(d, txns);
ok(r.added && bal[A] === 100.05 && bal[B] === 20, "A: 100.10 + 50 − 20.05 − 30 = 100.05; B: 0 − 10 + 30 = 20.00; the entry with no account counts nowhere", bal);
const tiny = addAccount({ accounts: [], transfers: [] }, "T", "other", 0.1, "");
ok(accountBalances(tiny.data, [e(tiny.id, "income", 0.2)])[tiny.id] === 0.3, "0.10 opening + 0.20 income is exactly 0.30");
ok(accountBalances(d, [...txns, e("a_zzzzzz", "expense", 5)])[A] === 100.05 && Object.keys(accountBalances(d, txns)).length === 2, "an entry with an account this phone does not know changes nothing");
const negative = accountBalances(d, [e(B, "expense", 500)]);
ok(negative[B] === 30 - 500, "a balance may go negative (credit card, overdraft) and is shown as is", negative);
ok(accountBalances(d, [e(A, "income", 1)]).__proto__ !== undefined && accountBalances(null, null) && Object.keys(accountBalances(null, null)).length === 0, "no data: empty result");

section("R24-AC2. Transfers and refusals");
ok(addTransfer(d, A, A, 5, "2026-10-06").reason === "same" && addTransfer(d, A, "a_nope123", 5, "2026-10-06").reason === "account", "same account and unknown account are refused");
ok(addTransfer(d, A, B, 0, "2026-10-06").reason === "amount" && addTransfer(d, A, B, 5, "31.02.2026").reason === "date", "zero amount and a bad date are refused");
ok(addAccount(d, "kapital CARD", "card", 0, "").reason === "dup" && addAccount(d, "", "card", 0, "").reason === "empty" && addAccount(d, "x".repeat(41), "card", 0, "").reason === "long", "duplicate (ignoring case), empty and 41-character names are refused");
ok(accountInUse(d, A, []) && accountInUse(d, B, []) && !accountInUse(d, A, []) === false, "an account with a transfer is in use");
const solo = addAccount({ accounts: [], transfers: [] }, "Solo", "cash", 0, "");
ok(!accountInUse(solo.data, solo.id, []) && accountInUse(solo.data, solo.id, [e(solo.id, "expense", 1)]), "an unused account may be removed; one with an entry may not");

section("R24-AC3. Storage, backup and import");
ok(cleanAccountData({ accounts: [{ id: "bad", name: "x" }, { id: A, name: "Ok" }], transfers: [{ id: "t_abc123", from: A, to: "a_missing", amount: 5, date: "2026-10-01" }] }).transfers.length === 0, "junk accounts are dropped, and a transfer to a missing account is dropped");
const m = mergeAccountData(d, { accounts: [{ id: A, name: "Renamed", opening: { amount: 999 } }], transfers: [] });
ok(m.accounts.find((a) => a.id === A).name === "Kapital card" && m.accounts.length === 2 && m.transfers.length === 1, "merge: what is already here wins; nothing is doubled");
const bk = buildBackup({ transactions: txns, budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [], accountData: d });
ok(bk.accounts.length === 2 && bk.transfers.length === 1 && bk.transactions.filter((x) => x.account === A).length === 2, "the backup carries accounts, the transfer and each entry's account");
ok(!("accounts" in buildBackup({ transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] })), "no accounts: the file is identical to before");
const plan = planImport(JSON.stringify(bk), "b.json");
ok(plan.ok && plan.accountData.accounts.length === 2 && plan.accountData.transfers.length === 1 && plan.transactions.filter((x) => x.account === A).length === 2, "importing keeps the accounts, the transfer and the entries' accounts");
finish("run24accounts");
