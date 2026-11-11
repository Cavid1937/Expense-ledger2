// Run 51 (owner reports, 10 Nov): a merge double counted, and an account could vanish without a question or an Undo.
// Expected values are worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { planMerge, planAccountMerge, remapEntryAccounts, mergeCounts, applyImport, planImport, buildBackup, accountBalances, accountInUse, accountRemovalPlan, removeAccountSafely, restoreRemovedAccount, cleanAccountData } = H;
reset();

const E = (id, date, amount, o = {}) => ({ id, type: "expense", amount, category: "food", subcategory: "", merchant: "", note: "", date, recurring: false, recurFreq: null, isActive: true, createdAt: date + "T00:00:00.000Z", ...o });
const cents = (l) => l.reduce((s, x) => s + Math.round(x.amount * 100) * (x.type === "income" ? 1 : -1), 0);
const base = { budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] };
const viaFile = (txns, accountData) => planImport(JSON.stringify(buildBackup({ ...base, transactions: txns, ...(accountData ? { accountData } : {}) })), "phone.json");

section("R51-M1. The same payments typed on two devices are not counted twice");
// Browser: four payments. Phone: the same four real payments, typed separately (other ids; three have other words, one other category).
const browser = [E(101, "2026-10-01", 0.6, { note: "Metro" }), E(102, "2026-10-01", 12.5, { merchant: "Bravo" }), E(103, "2026-10-02", 30, { note: "Taxi home" }), E(104, "2026-10-03", 8, { merchant: "Cafe" })];
const phone = [E(901, "2026-10-01", 0.6, { note: "8 Noyabr Metro", category: "transport" }), E(902, "2026-10-01", 12.5, { merchant: "Bravo", subcategory: "Groceries" }), E(903, "2026-10-02", 30, { note: "Taxi" }), E(904, "2026-10-03", 8, { merchant: "Cafe" })];
let plan = viaFile(phone);
let mp = planMerge(browser, plan.transactions);
ok(mp.sameId.length === 0 && mp.identical.length === 1 && mp.similar.length === 3 && mp.fresh.length === 0, "0 same record, 1 identical (Cafe), 3 look the same, 0 new", [mp.sameId.length, mp.identical.length, mp.similar.length, mp.fresh.length]);
let st = applyImport({ ...base, transactions: browser }, plan, "merge", { skipDuplicates: true, skipSimilar: true });
ok(st.transactions.length === 4 && cents(st.transactions) === -5110, "both choices on (the default): still 4 entries and 51.10 spent, not 94.20", [st.transactions.length, cents(st.transactions)]);
ok(eq(st.transactions.map((x) => x.id).sort(), [101, 102, 103, 104]), "the entries that were here are the ones kept, untouched");
st = applyImport({ ...base, transactions: browser }, plan, "merge", { skipDuplicates: true, skipSimilar: false });
ok(st.transactions.length === 7 && cents(st.transactions) === -(5110 + 60 + 1250 + 3000), "the person unticks 'look the same': those 3 are added (0.60 + 12.50 + 30.00), the identical one is not", [st.transactions.length, cents(st.transactions)]);
st = applyImport({ ...base, transactions: browser }, plan, "merge", {});
ok(st.transactions.length === 8, "both choices off: all 4 are added (the person's decision, as before)");
ok(mp.similar[0].here && mp.similar[0].file && mp.similar.every((p) => p.here.date === p.file.date && p.here.amount === p.file.amount), "each look-alike is a pair (here, in the file) on the same day for the same amount, so the sheet can show examples");

section("R51-M2. Matching is one to one: nothing real is dropped");
// Here: one coffee 3.00. File: two coffees 3.00 on that day (two real purchases). One matches, one is new.
let here = [E(1, "2026-10-05", 3, { merchant: "Coffee" })];
let inc = [E(11, "2026-10-05", 3, { merchant: "Coffee" }), E(12, "2026-10-05", 3, { merchant: "Coffee" })];
mp = planMerge(here, inc);
ok(mp.identical.length === 1 && mp.fresh.length === 1 && mp.similar.length === 0, "one entry here stands for only one entry of the file: 1 identical, 1 new");
st = applyImport({ ...base, transactions: here }, { transactions: inc, settings: {} }, "merge", { skipDuplicates: true, skipSimilar: true });
ok(st.transactions.length === 2 && cents(st.transactions) === -600, "after the merge there are exactly 2 coffees (6.00), not 1 and not 3", [st.transactions.length, cents(st.transactions)]);
// Same day, same amount, but income against expense is never a match; another day is never a match; one qapik apart is never a match.
mp = planMerge([E(1, "2026-10-05", 3)], [E(21, "2026-10-05", 3, { type: "income", category: "salary" }), E(22, "2026-10-06", 3), E(23, "2026-10-05", 3.01)]);
ok(mp.fresh.length === 3 && mp.similar.length === 0 && mp.identical.length === 0, "other kind, other day or 0.01 apart: all three are new");
// The same id is the same record even when its words changed; and it is used up, so it cannot also match a second entry.
mp = planMerge([E(5, "2026-10-07", 9, { note: "old words" })], [E(5, "2026-10-07", 9, { note: "new words" }), E(55, "2026-10-07", 9, { note: "another purchase" })]);
ok(mp.sameId.length === 1 && mp.fresh.length === 1 && mp.similar.length === 0, "same id = same record (not added); a second 9.00 that day is new, not a look-alike of the record already matched");
// Ids are compared as text: 7 and "7" are the same record.
ok(planMerge([E(7, "2026-10-07", 1)], [E("7", "2026-10-07", 1)]).sameId.length === 1, "id 7 and id \"7\" are the same record");
// Importing the very same backup twice adds nothing the second time.
plan = viaFile(phone);
st = applyImport({ ...base, transactions: [] }, plan, "merge", { skipDuplicates: true, skipSimilar: true });
const twice = applyImport(st, viaFile(phone), "merge", { skipDuplicates: true, skipSimilar: true });
ok(st.transactions.length === 4 && twice.transactions.length === 4 && cents(twice.transactions) === cents(st.transactions), "the same file merged twice: 4 entries both times");
ok(planMerge(null, null).fresh.length === 0 && planMerge([], phone).fresh.length === 4, "nothing here: everything is new; no data: empty result");

section("R51-M3. Replace is unchanged; the counts the sheet shows");
st = applyImport({ ...base, transactions: browser }, viaFile(phone), "replace", { skipDuplicates: true, skipSimilar: true });
ok(st.transactions.length === 4 && eq(st.transactions.map((x) => x.id).sort(), [901, 902, 903, 904]), "Replace still swaps the entries for the file's");
const mc = mergeCounts(browser, viaFile(phone));
ok(mc.dupCount === 1 && eq([mc.mergeInfo.sameId, mc.mergeInfo.identical, mc.mergeInfo.similar, mc.mergeInfo.fresh], [0, 1, 3, 0]) && mc.mergeInfo.examples.length === 3 && mc.mergeInfo.sameAccounts === 0, "the sheet gets: 0 already here, 1 identical, 3 look the same, 0 new, three examples", mc.mergeInfo);

section("R51-A1. An account with the same name on both sides is one account");
// Here: "ABB Card" (opening 100). File: "abb card" under another id (opening 250) with two payments 5.00 and 7.00, plus "Cash" (new) and a transfer 20 card -> cash.
const mine = { accounts: [{ id: "a_bbbbbb", name: "ABB Card", kind: "card", opening: { amount: 100, date: "" } }], transfers: [] };
const theirs = { accounts: [{ id: "a_pppppp", name: "abb  card", kind: "card", opening: { amount: 250, date: "" } }, { id: "a_cccccc", name: "Cash", kind: "cash", opening: { amount: 10, date: "" } }], transfers: [{ id: "t_abc123", from: "a_pppppp", to: "a_cccccc", amount: 20, date: "2026-10-06", note: "" }] };
const pay = [E(911, "2026-10-04", 5, { account: "a_pppppp" }), E(912, "2026-10-05", 7, { account: "a_pppppp" }), E(913, "2026-10-05", 2, { account: "a_cccccc" })];
plan = viaFile(pay, theirs);
let ap = planAccountMerge(mine, plan.accountData);
ok(ap.renamed === 1 && ap.remap["a_pppppp"] === "a_bbbbbb" && ap.data.accounts.length === 2 && ap.data.accounts[0].opening.amount === 100, "the file's card maps to the card here; 2 accounts in all; the opening balance here (100) stays, 250 is not added");
ok(ap.data.transfers.length === 1 && ap.data.transfers[0].from === "a_bbbbbb" && ap.data.transfers[0].to === "a_cccccc", "the file's transfer now leaves from the card here");
let merged = applyImport({ ...base, transactions: [] }, { ...plan, transactions: remapEntryAccounts(plan.transactions, ap.remap) }, "merge", {}).transactions;
let bal = accountBalances(ap.data, merged);
ok(bal["a_bbbbbb"] === 68 && bal["a_cccccc"] === 28, "card: 100 - 5 - 7 - 20 = 68; cash: 10 - 2 + 20 = 28", bal);
ok(merged.every((x) => x.account in bal) && accountInUse(ap.data, "a_bbbbbb", merged), "no entry points to an account that does not exist, and the card counts as in use");
// The same file again: nothing is doubled (the transfer is recognised although the account id differs from the file's).
const ap2 = planAccountMerge(ap.data, plan.accountData);
ok(ap2.data.accounts.length === 2 && ap2.data.transfers.length === 1, "merging the same file again: still 2 accounts and 1 transfer");
// A transfer with another id but the same accounts, amount, day and note is the same transfer; a second real one that day is kept once more.
const two = planAccountMerge(ap.data, { accounts: theirs.accounts, transfers: [{ ...theirs.transfers[0], id: "t_zzz999" }, { ...theirs.transfers[0], id: "t_yyy888" }] });
ok(two.data.transfers.length === 2, "two equal transfers in the file against one here: one matches, one is added (one to one)");
ok(remapEntryAccounts(pay, {}) === pay && planAccountMerge(null, null).data.accounts.length === 0 && planAccountMerge(mine, { accounts: [], transfers: [] }).data.accounts.length === 1, "nothing to map: the list is returned as it is; empty sides are safe");
// Same id on both sides: what is here wins, as before.
const sameId = planAccountMerge(mine, { accounts: [{ id: "a_bbbbbb", name: "Renamed", kind: "card", opening: { amount: 999, date: "" } }], transfers: [] });
ok(sameId.renamed === 0 && sameId.data.accounts.length === 1 && sameId.data.accounts[0].name === "ABB Card" && sameId.data.accounts[0].opening.amount === 100, "same id: the account here wins (name and opening balance unchanged)");

section("R51-D1. Removing an account: what it touches, and nothing is lost");
const d0 = cleanAccountData({ accounts: [{ id: "a_card01", name: "Card", kind: "card", opening: { amount: 100, date: "" } }, { id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 50, date: "" } }, { id: "a_empty1", name: "Spare", kind: "other", opening: { amount: 0, date: "" } }], transfers: [{ id: "t_one111", from: "a_card01", to: "a_cash01", amount: 30, date: "2026-10-02", note: "" }] });
const tx = [E(1, "2026-10-03", 12, { account: "a_card01" }), E(2, "2026-10-04", 8, { account: "a_card01" }), E(3, "2026-10-04", 5, { account: "a_cash01" }), E(4, "2026-10-04", 4, { wallet: "card" }), E(5, "2026-10-05", 6)];
let p = accountRemovalPlan(d0, "a_card01", tx);
ok(p.entries === 2 && p.transfers === 1 && p.balance === 50 && p.account.name === "Card", "Card: 2 entries, 1 transfer, balance 100 - 30 - 12 - 8 = 50", p);
p = accountRemovalPlan(d0, "a_empty1", tx);
ok(p.entries === 0 && p.transfers === 0 && p.balance === 0, "Spare: nothing uses it");
ok(accountRemovalPlan(d0, "a_nope999", tx).account === null, "an unknown account: no plan");
// Entry 4 was paid by 'bank card' the older way (wallet) and has no account: it does not belong to the Card account and is never touched.
let r = removeAccountSafely(d0, "a_card01", tx, "");
ok(r.ok && r.data.accounts.length === 2 && r.data.transfers.length === 0 && r.transactions.length === 5, "Card removed to 'no account': 2 accounts left, its transfer gone, all 5 entries still there");
ok(!("account" in r.transactions[0]) && !("account" in r.transactions[1]) && r.transactions[2].account === "a_cash01" && r.transactions[3].wallet === "card" && r.transactions[4] === tx[4], "its 2 entries now have no account; the others are untouched");
ok(cents(r.transactions) === cents(tx) && eq(r.transactions.map((x) => [x.id, x.amount, x.date]), tx.map((x) => [x.id, x.amount, x.date])), "no amount, date or id changed: total spending is the same to the qapik");
ok(accountBalances(r.data, r.transactions)["a_cash01"] === 45, "Cash is now 50 - 5 = 45 (the 30 transfer went with the removed account)");
ok(eq(r.removed.movedIds, [1, 2]) && r.removed.transfers.length === 1 && r.removed.index === 0 && r.removed.movedTo === "", "what was removed is handed back for Undo");
r = removeAccountSafely(d0, "a_card01", tx, "a_cash01");
ok(r.ok && r.transactions[0].account === "a_cash01" && r.transactions[1].account === "a_cash01" && accountBalances(r.data, r.transactions)["a_cash01"] === 25, "Card removed, entries moved to Cash: Cash is 50 - 5 - 12 - 8 = 25");
ok(removeAccountSafely(d0, "a_card01", tx, "a_card01").reason === "target" && removeAccountSafely(d0, "a_card01", tx, "a_nope999").reason === "target" && removeAccountSafely(d0, "a_nope999", tx, "").reason === "account", "moving to itself, to an unknown account, or removing an unknown account is refused");
r = removeAccountSafely(d0, "a_empty1", tx, "");
ok(r.ok && r.transactions === tx && r.data.accounts.length === 2 && r.data.transfers.length === 1, "an unused account: the entries list is not touched at all");

section("R51-D2. Undo puts everything back exactly");
r = removeAccountSafely(d0, "a_card01", tx, "a_cash01");
let u = restoreRemovedAccount(r.data, r.transactions, r.removed);
ok(u.ok && eq(u.data, d0) && eq(u.transactions, tx), "undo right after: accounts, transfer and entries are identical to before");
ok(eq(accountBalances(u.data, u.transactions), accountBalances(d0, tx)), "every balance is back: Card 50, Cash 75, Spare 0", accountBalances(u.data, u.transactions));
// Work done in between is kept: a new entry was added and one of the moved entries was re-assigned by hand to Spare.
const later = [E(6, "2026-10-06", 1, { account: "a_cash01" }), ...r.transactions.map((x) => x.id === 2 ? { ...x, account: "a_empty1" } : x)];
u = restoreRemovedAccount(r.data, later, r.removed);
ok(u.ok && u.transactions.length === 6 && u.transactions.find((x) => x.id === 1).account === "a_card01" && u.transactions.find((x) => x.id === 2).account === "a_empty1" && u.transactions.find((x) => x.id === 6).account === "a_cash01", "undo later: entry 1 returns to Card; entry 2 (moved by hand since) and the new entry stay as the person left them");
r = removeAccountSafely(d0, "a_card01", tx, "");
u = restoreRemovedAccount(r.data, r.transactions, r.removed);
ok(u.ok && eq(u.data, d0) && eq(u.transactions.map((x) => x.account || ""), tx.map((x) => x.account || "")), "undo after 'no account': the 2 entries point to Card again");
// Undo is refused when an account with that name exists again (it would be a second "Card").
const again = cleanAccountData({ accounts: [...r.data.accounts, { id: "a_new001", name: "card", kind: "card", opening: { amount: 0, date: "" } }], transfers: [] });
u = restoreRemovedAccount(again, r.transactions, r.removed);
ok(!u.ok && u.data.accounts.length === 3 && u.transactions === r.transactions, "a 'card' was created in between: undo is refused and nothing changes");
ok(!restoreRemovedAccount(d0, tx, null).ok && !restoreRemovedAccount(d0, tx, r.removed).ok, "nothing to undo, or the account is still there: refused");
// Two removals in a row, undone in reverse order.
const r1 = removeAccountSafely(d0, "a_card01", tx, ""), r2 = removeAccountSafely(r1.data, "a_cash01", r1.transactions, "");
const u2 = restoreRemovedAccount(r2.data, r2.transactions, r2.removed), u1 = restoreRemovedAccount(u2.data, u2.transactions, r1.removed);
ok(r2.data.accounts.length === 1 && u1.ok && eq(u1.data, d0) && eq(u1.transactions, tx), "two accounts removed, then both undone: everything is as it was");
finish("run51integrity");
