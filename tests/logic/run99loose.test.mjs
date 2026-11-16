// Run 99: putting entries with no account onto an account (the person's own choice), and the widget not showing hidden accounts.
// Expected figures are worked out by hand in the comments; all data is invented.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { unassignedEntries, unassignedSpend, assignAccount, accountBalances, widgetSnapshot, setLang, writeTheme } = H;
reset();
const NOW = new Date(2026, 10, 16, 12);
const acc = (id, date, hidden = false, amount = 100) => ({ id, name: id, kind: "card", opening: { amount, date }, hidden });
const data = (...accounts) => ({ version: 1, accounts, transfers: [] });
const ex = (id, amount, date, account) => T({ id, type: "expense", category: "food", amount, date, ...(account ? { account } : {}) });

section("R99-L1. Which entries are in no balance (the list behind the amount)");
{
  const d = data(acc("a_card01", "2026-11-01"), acc("a_cash01", "2026-11-01"));
  const tx = [ex(1, 12.34, "2026-11-05"), ex(2, 0.66, "2026-11-16"), ex(3, 50, "2026-10-31"), ex(4, 20, "2026-11-06", "a_card01"), T({ id: 5, type: "income", category: "salary", amount: 900, date: "2026-11-08" })];
  const r = unassignedEntries(d, tx, NOW), s = unassignedSpend(d, tx, NOW);
  ok(r.known && r.since === "2026-11-01" && r.list.map((x) => x.id).join() === "1,2", "entries 1 and 2 (not the one before the opening date, not the one on the card, not income)", r.list.map((x) => x.id));
  // 12.34 + 0.66 = 13.00
  ok(s.count === 2 && s.sum === 13, "the amount is the sum of that same list: 13.00", s);
}

section("R99-L2. Putting them on an account moves that balance, and only that");
{
  const d = data(acc("a_card01", "2026-11-01"), acc("a_cash01", "2026-11-01"));
  const tx = [ex(1, 12.34, "2026-11-05"), ex(2, 0.66, "2026-11-16"), ex(3, 50, "2026-10-31"), ex(4, 20, "2026-11-06", "a_card01")];
  // before: card 100 - 20 = 80, cash 100
  const before = accountBalances(d, tx, "2026-11-16");
  ok(before.a_card01 === 80 && before.a_cash01 === 100, "before: card 80, cash 100", before);
  const r = assignAccount(tx, [1], d, "a_cash01");
  // entry 1 (12.34) onto cash: cash 100 - 12.34 = 87.66; card unchanged
  const after = accountBalances(d, r.list, "2026-11-16");
  ok(r.changed.join() === "1" && after.a_cash01 === 87.66 && after.a_card01 === 80, "one entry on cash: cash 87.66, card still 80", after);
  ok(unassignedSpend(d, r.list, NOW).sum === 0.66 && unassignedSpend(d, r.list, NOW).count === 1, "0.66 in one entry is still in no balance");
  ok(tx[0].account === undefined && r.list[0] !== tx[0] && r.list[1] === tx[1] && r.list[0].amount === 12.34 && r.list[0].date === "2026-11-05" && r.list[0].id === 1, "the original list is not altered; only the account of that entry changed (amount, date and id kept)");
  const all = assignAccount(tx, [1, 2, 3, 4], d, "a_cash01");
  // 1, 2 and 3 have no account -> changed; 4 is on the card -> left alone. cash 100 - 12.34 - 0.66 - 50 = 37.00
  ok(all.changed.join() === "1,2,3" && all.list[3].account === "a_card01" && accountBalances(d, all.list, "2026-11-16").a_cash01 === 37, "an entry that already has an account is never moved; cash 37.00", all.changed);
}

section("R99-L3. Refusals: nothing changes");
{
  const d = data(acc("a_card01", "2026-11-01"));
  const tx = [ex(1, 5, "2026-11-05"), ex(2, 6, "2026-11-05", "a_gone999")];
  ok(assignAccount(tx, [1], d, "a_nothere").changed.length === 0 && assignAccount(tx, [1], d, "").changed.length === 0 && assignAccount(tx, [1], d, null).changed.length === 0, "an account that does not exist, or none: no change");
  ok(assignAccount(tx, [], d, "a_card01").changed.length === 0 && assignAccount(tx, [99], d, "a_card01").changed.length === 0 && assignAccount(null, [1], d, "a_card01").list.length === 0, "no ids, unknown id, no entries: no change, no crash");
  // an entry whose account was removed is in no balance, so it can be put on one
  ok(assignAccount(tx, [2], d, "a_card01").changed.join() === "2", "an entry on a removed account can be given a real one");
}

section("R99-W1. The home-screen widget does not show an account the person hid");
{
  setLang("en"); writeTheme("ivory");
  localStorage.setItem("expense_ledger_v5__accounts", JSON.stringify(data(acc("a_hide001", "", true, 5000), acc("a_card01", "", false, 100), acc("a_cash01", "", false, 40))));
  const state = { transactions: [], budgets: {}, goals: [], bills: [], currency: "₼", language: "en", safeToSpend: { enabled: false, savingsTarget: 0 } };
  const s = widgetSnapshot(state, [], {}, NOW);
  ok(s.accounts.list.length === 2 && s.accounts.list.map((a) => a.name).join() === "a_card01,a_cash01" && !s.accounts.list.some((a) => /5,000/.test(a.amount)), "two shown accounts; the hidden one (5,000) is not sent to the widget", s.accounts.list);
  localStorage.removeItem("expense_ledger_v5__accounts");
}
finish("run99loose");
