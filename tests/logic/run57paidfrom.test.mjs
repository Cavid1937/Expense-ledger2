// Run 57 (owner, 10 Nov: "Bank card" + "ABB Card" showed 0 of 257; "Cash is Nağd"): one "paid from" rule for the entry filter and Analytics.
// Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { paidFromKind, paidFromAccount, paidFromMatch, paidFromOptions, accountsMap, calcWalletSpend, PAID_KINDS } = H;
reset();
const E = (id, o = {}) => ({ id, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-10-05", recurring: false, recurFreq: null, isActive: true, ...o });
const A = (id, name, kind) => ({ id, name, kind, opening: { amount: 0, date: "" }, hidden: false });
const accs = accountsMap({ accounts: [A("a_nagd01", "Nağd", "cash"), A("a_abbc01", "ABB Card", "card"), A("a_kapc01", "Kapital Card", "card"), A("a_cred01", "Credit", "credit"), A("a_m10w01", "M10", "wallet"), A("a_bank01", "Savings", "bank"), A("a_othr01", "Box", "other")] });

section("R57-1. The owner's case: older 'Cash' entries and entries on the 'Nağd' account are the same kind");
// 3 entries marked Cash the old way, 2 on Nağd, 2 marked Bank card the old way, 1 on ABB Card, 1 with nothing.
const owner = [E(1, { wallet: "cash" }), E(2, { wallet: "cash" }), E(3, { wallet: "cash" }), E(4, { account: "a_nagd01" }), E(5, { account: "a_nagd01" }),
  E(6, { wallet: "card" }), E(7, { wallet: "card" }), E(8, { account: "a_abbc01" }), E(9)];
const ids = (choice) => owner.filter((x) => paidFromMatch(x, choice, accs)).map((x) => x.id);
ok(eq(ids("k:cash"), [1, 2, 3, 4, 5]), "'All cash' shows the 3 older Cash entries AND the 2 on Nağd (it used to be 0 when both filters were on)", ids("k:cash"));
ok(eq(ids("a:a_nagd01"), [4, 5]), "'Nağd' shows only the 2 entries linked to it");
ok(eq(ids("k:card"), [6, 7, 8]) && eq(ids("a:a_abbc01"), [8]), "'All cards' = the 2 older Bank card entries + the 1 on ABB Card; 'ABB Card' = its 1");
ok(eq(ids("none"), [9]) && eq(ids("all"), owner.map((x) => x.id)), "'Not set' = only the entry with neither; 'All' = everything");

section("R57-2. Every entry has exactly one kind (the 0-of-257 can never happen again)");
const mixed = [...owner, E(10, { account: "a_kapc01" }), E(11, { account: "a_cred01" }), E(12, { account: "a_m10w01" }), E(13, { wallet: "mobile" }), E(14, { account: "a_bank01" }),
  E(15, { account: "a_othr01" }), E(16, { wallet: "e-wallet" }), E(17, { account: "a_gone99" }), E(18, { account: "a_gone99", wallet: "cash" }), E(19, { account: "a_abbc01", wallet: "cash" })];
const groups = [...PAID_KINDS.map((k) => "k:" + k), "none"].map((c) => mixed.filter((x) => paidFromMatch(x, c, accs)).map((x) => x.id));
const flat = groups.flat();
ok(flat.length === mixed.length && new Set(flat).size === mixed.length, "the kind choices plus 'Not set' split all 19 entries with no overlap and nothing missing", groups);
ok(Object.keys(accs).every((id) => mixed.filter((x) => paidFromMatch(x, "a:" + id, accs)).every((x) => paidFromMatch(x, "k:" + paidFromKind(x, accs), accs) && paidFromKind(x, accs) === paidFromKind({ account: id }, accs))), "every account's entries all sit inside that account's kind");
ok(eq([11, 12, 13, 14, 15, 16].map((i) => paidFromKind(mixed.find((x) => x.id === i), accs)), ["card", "mobile", "mobile", "bank", "other", "other"]), "credit card = card; mobile-wallet account and old 'mobile' = mobile; bank account = bank; 'other' account and an unknown wallet word = other");
ok(paidFromKind(mixed.find((x) => x.id === 17), accs) === "none" && paidFromKind(mixed.find((x) => x.id === 18), accs) === "cash" && paidFromAccount(mixed.find((x) => x.id === 17), accs) === "", "an account that no longer exists: the old wallet if there is one, else Not set (never lost)");
ok(paidFromKind(mixed.find((x) => x.id === 19), accs) === "card", "an entry with both an account (ABB Card) and an old wallet (Cash): the account wins");
ok(paidFromKind(E(20, { wallet: "cash" }), null) === "cash" && paidFromKind(E(21, { account: "a_nagd01" }), null) === "none" && paidFromKind(null, accs) === "none", "with no accounts at all only the old wallet counts; nothing breaks on empty input");

section("R57-3. Which choices are offered");
let opts = paidFromOptions(owner, accs).map((o) => o.value);
ok(eq(opts, ["k:cash", "a:a_nagd01", "k:card", "a:a_abbc01", "none"]), "the owner's entries: All cash, Nağd, All cards, ABB Card, Not set (each kind followed by its accounts)", opts);
opts = paidFromOptions([E(1, { account: "a_nagd01" }), E(2, { account: "a_nagd01" }), E(3)], accs).map((o) => o.value);
ok(eq(opts, ["a:a_nagd01", "none"]), "all cash entries are on Nağd: 'All cash' would be the same as 'Nağd', so only Nağd is offered", opts);
opts = paidFromOptions([E(1, { account: "a_abbc01" }), E(2, { account: "a_kapc01" })], accs).map((o) => o.value);
ok(eq(opts, ["k:card", "a:a_abbc01", "a:a_kapc01"]), "two card accounts: All cards, then both accounts in name order; no Not set when every entry has one", opts);
opts = paidFromOptions([E(1, { wallet: "cash" }), E(2, { wallet: "card" })], {}).map((o) => o.value);
ok(eq(opts, ["k:cash", "k:card"]), "no accounts at all: the old wallets are offered as kinds");
ok(paidFromOptions([E(1), E(2)], accs).length === 1 && paidFromOptions([], accs).length === 0 && paidFromOptions(null, null).length === 0, "nothing set anywhere: only Not set (the screen then hides the filter); no entries: nothing");
ok(eq(paidFromOptions(owner, accs).map((o) => o.n), [5, 2, 3, 1, 1]), "each choice carries how many entries it shows");

section("R57-4. Analytics 'Spending by wallet' uses the same rule");
// October 2026, today 13 Oct: Nağd 4 + old Cash 6 = cash 10; ABB Card 20 = card; not set 5. Income and later dates not counted.
const oct = [E(1, { account: "a_nagd01", amount: 4, date: "2026-10-02" }), E(2, { wallet: "cash", amount: 6, date: "2026-10-03" }), E(3, { account: "a_abbc01", amount: 20, date: "2026-10-04" }), E(4, { amount: 5, date: "2026-10-06" }),
  E(5, { type: "income", account: "a_nagd01", amount: 100, date: "2026-10-02" }), E(6, { wallet: "cash", amount: 7, date: "2026-10-20" })];
const w = calcWalletSpend(oct, "2026-10", new Date(2026, 9, 13, 12), accs);
ok(w.byWallet.cash === 10 && w.byWallet.card === 20 && w.byWallet.none === 5 && w.total === 35 && w.used, "with accounts: cash 10 (Nağd 4 + older Cash 6), card 20, not set 5, total 35", w);
const w0 = calcWalletSpend(oct, "2026-10", new Date(2026, 9, 13, 12));
ok(w0.byWallet.cash === 6 && w0.byWallet.none === 29, "called the old way (no accounts): only the old wallet field counts, as before", w0);
finish("run57paidfrom");
