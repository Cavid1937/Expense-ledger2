// Run 108 (M1, found on the owner's Poco F6, 18 Nov): in the bank-notice review a second real payment of the same amount on the same day
// (two metro rides of 0.90) was called "looks like an entry you already made", the skip box was ticked, and the sheet said "All of these are
// already in your entries". Now an entry made from an earlier notice stands only for that notice. Expected values worked out by hand.
// Every notice text is invented. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
import { readNoticeItems } from "../../notify.js";
import { statementEntries } from "../../statement.js";
const { planMerge, mergeCounts, applyImport, readNoticeIds, rememberNoticeIds, NOTICE_IDS_KEY } = H;
reset();

const base = { budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] };
const cents = (l) => l.reduce((s, x) => s + Math.round(x.amount * 100) * (x.type === "income" ? 1 : -1), 0);
const ride = (h, m, bal) => ({ text: `💳 Payment: -0.90 ₼\nBAKU METRO\nCard: **4321\nBalance: ${bal} ₼`, time: new Date(2026, 10, 18, h, m).getTime() });
const notices = (items) => statementEntries("notification", readNoticeItems(items).rows);
const metaOf = (txns) => Object.fromEntries(txns.map((x) => [String(x.id), x._st]));
const plan = (txns, fromNotices = true) => ({ transactions: txns, settings: {}, ...(fromNotices ? { fromNotices: true, stMeta: metaOf(txns) } : {}) });
const skip = { skipDuplicates: true, skipSimilar: true };
// The review as the app runs it: counts first (what the sheet shows), then the add, then only the ids really added are remembered.
const review = (state, txns) => {
  const p = plan(txns), c = mergeCounts(state.transactions, p).mergeInfo;
  const next = applyImport(state, p, "merge", skip), had = new Set(state.transactions.map((x) => String(x.id)));
  rememberNoticeIds(next.transactions.map((x) => String(x.id)).filter((id) => !had.has(id)), p.stMeta);
  return { c, next, shown: c.fresh, added: next.transactions.length - state.transactions.length };
};

section("R108-M1a. Two metro rides read from two notices, reviewed at different times: both are added");
const morning = notices([ride(8, 10, "4.16")]), evening = notices([ride(18, 40, "3.26")]);
ok(morning.length === 1 && evening.length === 1 && morning[0].id !== evening[0].id, "each notice gives one entry with its own id", [morning.map((x) => x.id), evening.map((x) => x.id)]);
let st = { ...base, transactions: [] };
let r = review(st, morning); st = r.next;
ok(r.added === 1 && r.shown === 1, "the morning ride is added");
r = review(st, evening); st = r.next;
ok(r.c.similar === 0 && r.c.identical === 0 && r.c.fresh === 1, "the evening ride is new: not a look-alike, not 'already in your entries'", r.c);
ok(r.added === 1 && r.shown === r.added, "the number on the Add button (1) is the number added", [r.shown, r.added]);
ok(st.transactions.length === 2 && cents(st.transactions) === -180, "two rides, 1.80 spent", [st.transactions.length, cents(st.transactions)]);

section("R108-M1b. Same notice delivered again (same id): still nothing added");
r = review(st, evening);
ok(r.c.sameId === 1 && r.added === 0, "the same notice again is the same record", r.c);

section("R108-M1c. A payment typed by hand, then its notice: still offered as a look-alike and skipped by default");
reset();
const typed = { id: 1763450000000.123, type: "expense", amount: 0.9, category: "transport", subcategory: "Metro", merchant: "", note: "metro", date: "2026-11-18", recurring: false, recurFreq: null, isActive: true };
st = { ...base, transactions: [typed] };
r = review(st, morning);
ok(r.c.similar === 1 && r.c.fresh === 0 && r.added === 0, "hand-typed 0.90 + notice 0.90: look-alike, not added twice", r.c);
ok(applyImport(st, plan(morning), "merge", { skipDuplicates: true, skipSimilar: false }).transactions.length === 2, "unticking the box adds it (the person's choice)");

section("R108-M1d. A statement row already imported, then a notice of the same payment: not added twice");
reset();
const fromStatement = statementEntries("abb", [{ date: "2026-11-18", time: "08:10", type: "expense", cents: 90, desc: "BAKI METROPOLITENI", merchant: "BAKI METROPOLITENI" }]);
st = { ...base, transactions: fromStatement };
r = review(st, morning);
ok(r.added === 0 && r.c.similar + r.c.identical === 1, "a statement entry is never treated as a notice entry", r.c);

section("R108-M1e. Nothing remembered (new phone, restore, cleared side store): the older strict check");
reset();
st = { ...base, transactions: morning.slice() };
r = review(st, evening);
ok(r.added === 0 && r.c.similar + r.c.identical === 1, "without the remembered ids the second ride is held back (can be left out, never counted twice)", r.c);

section("R108-M1f. Backups and files are unchanged (only a notice review uses the remembered ids)");
reset();
rememberNoticeIds(morning.map((x) => x.id), metaOf(morning));
st = { ...base, transactions: morning.slice() };
const copy = { ...evening[0], id: "file1" };
const mp = planMerge(st.transactions, [copy]);
ok(mp.similar.length + mp.identical.length === 1 && mp.fresh.length === 0, "a backup file's look-alike is still a look-alike", mp);
ok(applyImport(st, plan([copy], false), "merge", skip).transactions.length === 1, "and is skipped by default");

section("R108-M1g. The side store is safe");
reset();
ok(readNoticeIds().size === 0, "empty when nothing is stored");
globalThis.localStorage.setItem(NOTICE_IDS_KEY, "{bad");
ok(readNoticeIds().size === 0, "damaged text reads as empty");
globalThis.localStorage.setItem(NOTICE_IDS_KEY, JSON.stringify({ a: "08:10", n: 5, z: null, b: "" }));
ok(readNoticeIds().size === 2, "only text times are kept");
rememberNoticeIds(["b", "c"], { b: { time: "09:00" }, c: { time: "09:01" } });
ok(Object.keys(JSON.parse(globalThis.localStorage.getItem(NOTICE_IDS_KEY))).join(",") === "a,b,c" && readNoticeIds().get("b") === "" && readNoticeIds().get("c") === "09:01", "added once each, in order, with the notice time");
rememberNoticeIds(Array.from({ length: 2100 }, (_, i) => "x" + i));
const kept = Object.keys(JSON.parse(globalThis.localStorage.getItem(NOTICE_IDS_KEY)));
ok(kept.length === 2000 && kept[kept.length - 1] === "x2099", "capped at the newest 2000", kept.length);
globalThis.__throwAll = true;
let threw = false; try { rememberNoticeIds(["z"]); readNoticeIds(); } catch { threw = true; }
globalThis.__throwAll = false;
ok(!threw, "a blocked storage never throws");
ok(planMerge([], [], { ownIds: "junk" }).fresh.length === 0, "a wrong option is ignored");

section("R108-M1h. One payment announced by the bank and by a wallet, reviewed separately: never counted twice");
reset();
const at = (h, m) => new Date(2026, 10, 18, h, m).getTime();
const pay = (h, m, shop) => ({ text: `Payment: -12.50 ₼\n${shop}\nCard: **4321`, time: at(h, m) });
const first = notices([pay(8, 10, "BRAVO SUPERMARKET")]);
st = review({ ...base, transactions: [] }, first).next;
r = review(st, notices([pay(8, 12, "Bravo Market")]));
ok(r.c.similar === 1 && r.c.fresh === 0 && r.added === 0, "2 minutes later, other wording: a look-alike, skipped by default", r.c);
ok(applyImport(st, plan(notices([pay(8, 12, "Bravo Market")])), "merge", { skipDuplicates: true, skipSimilar: false }).transactions.length === 2, "unticking the box still adds it (the person's choice)");
ok(review(st, notices([pay(8, 15, "Other Shop")])).c.similar === 1, "exactly 5 minutes apart: still a look-alike");
ok(review(st, notices([pay(8, 5, "Earlier Shop")])).c.similar === 1, "also when the second notice is the earlier one");
r = review(st, notices([pay(8, 16, "BRAVO SUPERMARKET")]));
ok(r.c.fresh === 1 && r.added === 1, "6 minutes apart: a separate payment", r.c);
reset();
rememberNoticeIds(first.map((x) => x.id));
ok(mergeCounts(first, plan(notices([pay(18, 0, "BRAVO SUPERMARKET")]))).mergeInfo.similar === 1, "time of the earlier notice unknown: held back, never counted twice");
reset();
rememberNoticeIds(first.map((x) => x.id), metaOf(first));
const two = notices([pay(8, 11, "Shop A"), pay(8, 12, "Shop B")]);
const c2 = mergeCounts(first, plan(two)).mergeInfo;
ok(c2.similar === 1 && c2.fresh === 1, "one earlier entry can stand for only one later notice", c2);

section("R108-M1i. Only entries really added are remembered");
reset();
st = { ...base, transactions: [typed] };
r = review(st, morning);
ok(r.added === 0 && readNoticeIds().size === 0, "a notice held back as a look-alike is not remembered", [...readNoticeIds().keys()]);

finish("run108noticesim");
