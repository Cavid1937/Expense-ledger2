// Run 24: an account can be renamed and its balance corrected afterwards. Expected values by hand; synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { addAccount, editAccount, accountBalances } = H;
reset();
let d = addAccount({ accounts: [], transfers: [] }, "Card", "card", 100, "2026-10-01").data;
d = addAccount(d, "Cash", "cash", 0, "").data;
const id = d.accounts[0].id, id2 = d.accounts[1].id;

section("R24-AE1. Rename and re-set the opening balance");
const r = editAccount(d, id, "  Kapital   card ", 250.5, "2026-11-01");
ok(r.edited && r.data.accounts[0].name === "Kapital card" && r.data.accounts[0].opening.amount === 250.5, "name trimmed/collapsed, opening amount 250.50", r);
ok(r.data.accounts[0].opening.date === "2026-10-01", "an existing opening date is kept", r.data.accounts[0]);
ok(accountBalances(r.data, [])[id] === 250.5, "balance follows the new opening amount");
const r0 = editAccount(d, id2, "Cash", 20, "2026-11-01");
ok(r0.edited && r0.data.accounts[1].opening.date === "2026-11-01", "an account with no opening date gets the given one", r0);

section("R24-AE2. Refusals leave the data unchanged");
ok(editAccount(d, id, "  ", 1, "").reason === "empty", "empty name refused");
ok(editAccount(d, id, "x".repeat(41), 1, "").reason === "long", "name over 40 characters refused");
ok(editAccount(d, id, "CASH", 1, "").reason === "dup", "another account's name (any case) refused");
ok(editAccount(d, id, "Card", 1, "").edited, "keeping its own name is fine");
ok(editAccount(d, id, "Card", NaN, "").reason === "amount", "a non-number amount refused");
ok(editAccount(d, "a_nope123", "Card", 1, "").reason === "account", "unknown account refused");
finish("run24accedit");
