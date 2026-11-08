// Run 41: credit-card accounts and "still owed" (creditOwed). Hand-computed. Synthetic data.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { creditOwed, cleanAccountData } = H;
reset();
const acc = (id, kind, amount = 0) => ({ id, name: id, kind, opening: { amount, date: "" }, hidden: false });
const ex = (id, amount, account, date = "2026-10-05") => T({ id, type: "expense", category: "shopping", amount, date, account });
const NOW = "2026-10-20";

section("R41-C1. Kind is kept");
const d = cleanAccountData({ accounts: [acc("a_cash1", "cash"), acc("a_cred1", "credit"), acc("a_weird", "spaceship")], transfers: [] });
ok(d.accounts[1].kind === "credit", "credit is a known kind");
ok(d.accounts[2].kind === "other", "an unknown kind still becomes other");

section("R41-C2. Owed");
const data = { accounts: [acc("a_bank1", "bank", 1000), acc("a_cred1", "credit", 0)], transfers: [] };
ok(creditOwed(data, [], NOW) === 0, "nothing spent: nothing owed");
ok(creditOwed(data, [ex("1", 1200, "a_cred1"), ex("2", 0.1, "a_cred1"), ex("3", 0.2, "a_cred1")], NOW) === 1200.3, "1200 + 0.10 + 0.20 = exactly 1200.30 owed");
ok(creditOwed(data, [ex("1", 1200, "a_bank1")], NOW) === 0, "spending from the bank account is not owed");
const paid = { ...data, transfers: [{ id: "t_pay1", from: "a_bank1", to: "a_cred1", amount: 500, date: "2026-10-10", note: "" }] };
ok(creditOwed(paid, [ex("1", 1200, "a_cred1")], NOW) === 700, "a 500 transfer to the card leaves 700 owed");
const over = { ...data, transfers: [{ id: "t_pay1", from: "a_bank1", to: "a_cred1", amount: 1500, date: "2026-10-10", note: "" }] };
ok(creditOwed(over, [ex("1", 1200, "a_cred1")], NOW) === 0, "overpaid card: owed is 0, never negative");
ok(creditOwed(data, [ex("1", 300, "a_cred1", "2026-10-25")], NOW) === 0, "a purchase dated after today is not owed yet");
const two = { accounts: [acc("a_cred1", "credit"), acc("a_cred2", "credit", -50)], transfers: [] };
ok(creditOwed(two, [ex("1", 100, "a_cred1")], NOW) === 150, "two cards add up; an opening balance of -50 is a debt of 50");
ok(creditOwed({ accounts: [acc("a_cash1", "cash", -40)], transfers: [] }, [], NOW) === 0, "a cash account below zero is not credit");
ok(creditOwed(null, null, NOW) === 0, "bad input: 0");
finish();
