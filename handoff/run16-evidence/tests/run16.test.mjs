// Run 16 (2026-10-29): which wallet an entry was paid from (cash, bank card, mobile wallet, other). Written BEFORE the code (test-first).
// Storage: an OPTIONAL `wallet` text id on an entry. No wallet = "not set", and the entry keeps exactly the shape older versions wrote.
// There are no wallet balances here (no opening balance, no transfers): this is a tag that answers "how did I pay?".
// Synthetic data only; expected values are worked out by hand in the comments. The harness clock is 13 Oct 2026.
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { walletId, WALLET_IDS, lastWallet, calcWalletSpend, normaliseTxn, buildCsv, buildBackup, planImport, applyImport, txnFingerprint } = H;
reset();
const T = (o) => ({ id: 1, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-10-01", recurring: false, recurFreq: null, isActive: true, createdAt: "2026-10-01T00:00:00Z", ...o });
const empty = { transactions: [], bills: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } };

section("R16-1. The pieces exist");
ok(typeof walletId === "function" && Array.isArray(WALLET_IDS) && typeof lastWallet === "function" && typeof calcWalletSpend === "function", "walletId, WALLET_IDS, lastWallet and calcWalletSpend are defined");
if (typeof walletId !== "function") { console.log("  (remaining checks skipped: not written yet)"); finish("run16"); }
ok(eq(WALLET_IDS, ["cash", "card", "mobile", "other"]), "the built-in wallets are cash, card, mobile and other", WALLET_IDS);

section("R16-2. An entry's wallet is kept exactly, and only when it is usable");
ok(normaliseTxn(T({ wallet: "cash" })).wallet === "cash", "cash is kept");
ok(normaliseTxn(T({ wallet: "  Card " })).wallet === "card", "surrounding spaces and capitals are tidied: ' Card ' becomes card");
ok(normaliseTxn(T({ wallet: "e-wallet" })).wallet === "e-wallet", "an id this version does not know (a future wallet) is KEPT, never dropped or turned into another wallet");
for (const bad of ["", "  ", "bank card", 5, null, true, {}, [], "x".repeat(33), "a/b", "<b>"]) ok(!("wallet" in normaliseTxn(T({ wallet: bad }))), `${JSON.stringify(bad)} is not a wallet: the entry gets no wallet field`);
const oldShape = normaliseTxn(T({}));
ok(!("wallet" in oldShape) && eq(Object.keys(oldShape), ["id", "type", "amount", "category", "subcategory", "merchant", "note", "date", "recurring", "recurFreq", "isActive", "createdAt"]), "an entry without a wallet has EXACTLY the fields older versions wrote (no new key, nothing changes for existing data)", Object.keys(oldShape));
ok(walletId("CASH") === "cash" && walletId("mobile") === "mobile" && walletId(undefined) === "" && walletId("a b") === "", "walletId: lower-cased id, or empty text when unusable");

section("R16-3. The wallet used last is the default for the next entry");
ok(lastWallet([T({ id: 3 }), T({ id: 2, wallet: "card" }), T({ id: 1, wallet: "cash" })]) === "card", "newest entry that has a wallet wins (the list is newest first): card");
ok(lastWallet([T({ id: 1 }), T({ id: 2 })]) === "", "no entry has a wallet: nothing is pre-selected");
ok(lastWallet([]) === "" && lastWallet(undefined) === "", "an empty or missing list is safe");

section("R16-4. Spending by wallet for one month (same rule as the category totals)");
// October 2026, today = 13 Oct: cash 10 (1 Oct); card 20 (5 Oct); no wallet 5 (6 Oct). Not counted: 7 cash on 20 Oct (still to come),
// income 100 in cash, and 3 cash on 30 Sep (another month).
const tx = [T({ id: 1, amount: 10, wallet: "cash", date: "2026-10-01" }), T({ id: 2, amount: 20, wallet: "card", date: "2026-10-05" }), T({ id: 3, amount: 5, date: "2026-10-06" }),
  T({ id: 4, amount: 7, wallet: "cash", date: "2026-10-20" }), T({ id: 5, type: "income", amount: 100, wallet: "cash", date: "2026-10-02" }), T({ id: 6, amount: 3, wallet: "cash", date: "2026-09-30" })];
const w = calcWalletSpend(tx, "2026-10", new Date(2026, 9, 13, 12));
ok(w.byWallet.cash === 10 && w.byWallet.card === 20 && w.byWallet.none === 5 && w.total === 35, "cash 10, card 20, not set 5, total 35", w);
ok(!("mobile" in w.byWallet) && w.used === true, "wallets with no spending are absent, and 'used' says at least one entry has a wallet");
ok(calcWalletSpend([T({ amount: 4 })], "2026-10", new Date(2026, 9, 13, 12)).used === false, "no entry has a wallet: used is false (the Analytics card stays hidden)");
ok(calcWalletSpend([T({ amount: 0.1, wallet: "cash" }), T({ id: 2, amount: 0.2, wallet: "cash" })], "2026-10", new Date(2026, 9, 13, 12)).byWallet.cash === 0.3, "0.1 + 0.2 is exactly 0.30 (no floating-point drift)");

section("R16-5. CSV: a Wallet column at the end; older files still import");
const csv = buildCsv([T({ id: 1, wallet: "cash", merchant: "Bravo" }), T({ id: 2, merchant: "Rent" }), T({ id: 3, wallet: "e-wallet", merchant: "X" })]);
const lines = csv.replace(/^﻿/, "").split("\r\n"); const head = lines[0].replace(/"/g, "").split(",");
ok(head[head.length - 1] === "Wallet" && head[8] === "CategoryId", "the header ends with Wallet; the earlier columns did not move", head);
ok(/"cash"$/.test(lines[1]) && /""$/.test(lines[2]) && /"e-wallet"$/.test(lines[3]), "each row ends with its wallet id, empty when not set", lines.slice(1));
const back = planImport(csv, "x.csv");
ok(back.ok && back.transactions.length === 3 && back.transactions[0].wallet === "cash" && !("wallet" in back.transactions[1]) && back.transactions[2].wallet === "e-wallet", "the app's own CSV round trip keeps each wallet (and gives none where none was set)", back.error || back.transactions.map((t) => t.wallet));
const named = planImport("Date,Amount,Type,Category,Wallet\n2026-10-01,1,expense,food,Cash\n2026-10-02,2,expense,food,Bank card\n2026-10-03,3,expense,food,Mobile wallet\n2026-10-04,4,expense,food,Other\n2026-10-05,5,expense,food,some thing\n2026-10-06,6,expense,food,", "n.csv");
ok(named.ok && eq(named.transactions.map((t) => t.wallet ?? null), ["cash", "card", "mobile", "other", null, null]), "names a person would type map to wallets (Cash, Bank card, Mobile wallet, Other); free text or an empty cell gives no wallet", named.error || named.transactions.map((t) => t.wallet ?? null));
const noCol = planImport("Date,Amount,Type,Category\n2026-10-01,9,expense,food\n", "o.csv");
ok(noCol.ok && noCol.transactions.length === 1 && !("wallet" in noCol.transactions[0]), "a CSV without a Wallet column imports as before, with no wallet field");

section("R16-6. Backup: wallets survive export and restore; old files are unchanged");
const full = buildBackup({ ...empty, transactions: [T({ id: 1, wallet: "card" }), T({ id: 2 }), T({ id: 3, wallet: "e-wallet" })] }, "2026-10-13T00:00:00Z");
const plan = planImport(JSON.stringify(full), "b.json"); const r = applyImport(empty, plan, "replace");
ok(plan.ok && eq(r.transactions.map((t) => t.wallet ?? "").sort(), ["", "card", "e-wallet"]), "Replace restores card, nothing and the future id e-wallet exactly", plan.error || r.transactions.map((t) => t.wallet));
ok(full.version === 10, "the backup version stays 10 (an optional field; an older version-10 app ignores it instead of refusing the file)", full.version);
const old = { version: 9, exportedAt: "2026-10-01T00:00:00Z", transactions: [T({ id: 1 })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } };
const po = planImport(JSON.stringify(old), "old.json"); const ro = applyImport(empty, po, "replace");
ok(po.ok && !("wallet" in ro.transactions[0]), "a version-9 file imports with no wallet field", po.error);

section("R16-7. The wallet does not make two look-alike entries different");
ok(txnFingerprint(T({ wallet: "cash" })) === txnFingerprint(T({ wallet: "card" })) && txnFingerprint(T({ wallet: "cash" })) === txnFingerprint(T({})), "the look-alike check ignores the wallet, so a file that adds wallets to entries you already have is still recognised as the same purchases");

finish("run16");
