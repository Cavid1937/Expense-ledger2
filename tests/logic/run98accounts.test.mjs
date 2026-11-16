// Run 98: entries with no account. unassignedSpend says how much spending moves no balance (so balance-based figures can be read with
// that in mind); lastAccountFor gives the Add form "same as last time". Expected figures are worked out by hand; all data is invented.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { unassignedSpend, lastAccountFor, accountBalances } = H;
reset();
const NOW = new Date(2026, 10, 16, 12); // 16 Nov 2026
const acc = (id, date, hidden = false) => ({ id, name: id, kind: "card", opening: { amount: 100, date }, hidden });
const data = (...accounts) => ({ version: 1, accounts, transfers: [] });
const ex = (id, amount, date, account, more = {}) => T({ id, type: "expense", category: "food", amount, date, ...(account ? { account } : {}), ...more });

section("R98-A1. How much spending is in no balance");
{
  const d = data(acc("a_card01", "2026-11-01"), acc("a_cash01", "2026-11-10"));
  const tx = [
    ex(1, 12.34, "2026-11-05"),               // no account, after the earliest opening -> counted
    ex(2, 0.66, "2026-11-16"),                // today -> counted
    ex(3, 50, "2026-10-31"),                  // before the earliest opening: the typed balance already includes it
    ex(4, 40, "2026-11-17"),                  // dated ahead: has not happened
    ex(5, 20, "2026-11-06", "a_card01"),      // has an account
    ex(6, 7, "2026-11-07", "a_gone999"),      // account that no longer exists -> in no balance -> counted
    T({ id: 7, type: "income", category: "salary", amount: 900, date: "2026-11-08" }), // income is not spending
  ];
  // 12.34 + 0.66 + 7.00 = 20.00, three entries, since 1 Nov (the earlier of the two opening dates)
  const r = unassignedSpend(d, tx, NOW);
  ok(r.known === true && r.since === "2026-11-01" && r.count === 3 && r.sum === 20, "3 entries, 20.00, since 1 Nov", r);
  // the balances are untouched by them: card 100 - 20 = 80, cash 100
  const b = accountBalances(d, tx, "2026-11-16");
  ok(b.a_card01 === 80 && b.a_cash01 === 100, "balances do not move for entries with no account (80 and 100)", b);
}

section("R98-A2. When the app cannot know, it says nothing");
{
  const tx = [ex(1, 10, "2026-11-05")];
  ok(unassignedSpend(data(acc("a_card01", "")), tx, NOW).known === false, "no opening date on any account: unknown");
  ok(unassignedSpend(data(), tx, NOW).known === false && unassignedSpend(null, null, NOW).known === false, "no accounts or no data: unknown, no crash");
  // a hidden account's date is not used; the shown account (10 Nov) decides -> the 5 Nov entry is before it
  const r = unassignedSpend(data(acc("a_old0001", "2026-01-01", true), acc("a_card01", "2026-11-10")), tx, NOW);
  ok(r.known === true && r.since === "2026-11-10" && r.count === 0 && r.sum === 0, "hidden account's date ignored; nothing to report", r);
  // but an entry paid from a hidden account is not 'no account'
  const h = unassignedSpend(data(acc("a_old0001", "2026-01-01", true), acc("a_card01", "2026-11-01")), [ex(2, 9, "2026-11-05", "a_old0001")], NOW);
  ok(h.count === 0, "an entry on a hidden account has an account", h);
  ok(unassignedSpend(data(acc("a_card01", "2026-11-01")), [ex(3, 5, "not-a-date")], NOW).count === 0, "an undated entry is not counted");
}

section("R98-A3. Same as last time for the Add form");
{
  const d = data(acc("a_card01", ""), acc("a_cash01", ""), acc("a_hide001", "", true));
  const at = (s) => ({ createdAt: `2026-11-${s}T10:00:00.000Z` });
  const tx = [
    ex(1, 5, "2026-11-01", "a_card01", at("01")),
    ex(2, 5, "2026-11-15", "a_cash01", at("03")),            // recorded last among expenses (dated earlier entries do not matter)
    ex(3, 5, "2026-11-16", "a_card01", at("02")),
    T({ id: 4, type: "income", category: "salary", amount: 900, date: "2026-11-10", account: "a_card01", ...at("04") }),
  ];
  ok(lastAccountFor(d, tx, "expense") === "a_cash01", "expense: the account of the expense recorded last (by when it was recorded, not its date)");
  ok(lastAccountFor(d, tx, "income") === "a_card01", "income: its own last account");
  ok(lastAccountFor(d, [...tx, ex(5, 5, "2026-11-16", "", at("05"))], "expense") === "", "last expense had no account: none is chosen (cash from a pocket stays that way)");
  ok(lastAccountFor(d, [...tx, ex(6, 5, "2026-11-16", "a_hide001", at("06"))], "expense") === "", "last account is hidden now: none");
  ok(lastAccountFor(d, [...tx, ex(7, 5, "2026-11-16", "a_gone999", at("07"))], "expense") === "", "last account no longer exists: none");
  ok(lastAccountFor(d, [], "expense") === "" && lastAccountFor(null, null, "expense") === "" && lastAccountFor(data(), tx, "expense") === "", "no entries, no data, no accounts: none, no crash");
  // same recording time: the larger id wins
  ok(lastAccountFor(d, [ex(10, 5, "2026-11-16", "a_card01", at("09")), ex(11, 5, "2026-11-16", "a_cash01", at("09"))], "expense") === "a_cash01", "same moment: the later id");
}
finish("run98accounts");
