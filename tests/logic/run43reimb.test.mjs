// Run 43: money others will pay back ("float"). Spending views count only the user's share; balances keep the full amount.
// Expected figures are worked out by hand in the comments, not by the code under test. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { cleanReimb, reimbForRef, reimbStatus, reimbOwedMap, reimbOwedTotal, forSpending, normaliseTxn, calcMonthSummary, calcCategorySpend, buildBackup, planImportWithCats, applyImport, buildCsv } = H;
reset();
const D = "2026-10-10", now = new Date(2026, 9, 20);
const dinner = T({ id: 11, type: "expense", category: "food", amount: 100, date: D, reimb: { amt: 60, who: "Aysel" } });
const lunch = T({ id: 12, type: "expense", category: "food", amount: 20, date: D });

section("R43-1. Validation of the field");
ok(eq(cleanReimb({ amt: 60, who: "Aysel" }), { amt: 60, who: "Aysel" }), "a valid amount and name are kept");
ok(cleanReimb({ amt: 0, who: "x" }) === null && cleanReimb({ amt: -5 }) === null && cleanReimb({ amt: "60" }) === null && cleanReimb({ amt: 10.005 }) === null && cleanReimb(null) === null && cleanReimb([]) === null && cleanReimb({ amt: Infinity }) === null && cleanReimb({ amt: NaN }) === null, "zero, negative, text, 3 decimals, null, array, Infinity, NaN are all refused");
ok(cleanReimb({ amt: 5 }).who === "" && cleanReimb({ amt: 5, who: "A\nB" }).who === "A B" && cleanReimb({ amt: 5, who: "x".repeat(60) }).who.length === 40, "name is optional, control characters become spaces, 40 characters at most");
ok(reimbForRef(12) === 12 && reimbForRef("abc") === "abc" && reimbForRef("") === null && reimbForRef(NaN) === null && reimbForRef({}) === null && reimbForRef(null) === null, "the link to an expense is a number or a text id, nothing else");
const nx = normaliseTxn({ ...dinner, reimb: { amt: 60, who: "Aysel" } });
ok(nx.reimb && nx.reimb.amt === 60, "normaliseTxn keeps reimb on an expense");
ok(!("reimb" in normaliseTxn({ ...dinner, type: "income", category: "salary", reimb: { amt: 60 } })), "an income entry never keeps reimb");
ok(!("reimbFor" in normaliseTxn({ ...dinner })) && normaliseTxn({ ...dinner, type: "income", category: "refund", reimbFor: 11 }).reimbFor === 11, "reimbFor is kept only on income entries");
ok(!("reimb" in normaliseTxn({ ...dinner, reimb: { amt: -1 } })), "an invalid reimb is dropped, the entry itself is kept");

section("R43-2. Spending counts only the user's share");
// 100 paid, 60 will come back -> 40 is the user's share; plus the unrelated 20 lunch = 60 food in the month.
let v = forSpending([dinner, lunch]);
ok(v.length === 2 && v.find((x) => x.id === 11).amount === 40, "the 100 dinner with 60 coming back counts as 40", v.map((x) => x.amount));
ok(calcCategorySpend(v, "2026-10", now).food === 60, "food for the month is 40 + 20 = 60", calcCategorySpend(v, "2026-10", now));
ok(calcMonthSummary(v, "2026-10", "2026-09", now).curExp === 60, "the month's spending is 60");
ok(dinner.amount === 100 && dinner.reimb.amt === 60, "the stored entry is untouched (100 and 60)");
v = forSpending([T({ ...dinner, reimb: { amt: 100, who: "" } })]);
ok(v.length === 0, "all of it coming back: the entry leaves the spending views");
v = forSpending([T({ ...dinner, reimb: { amt: 150, who: "" } })]);
ok(v.length === 0, "more than the total is capped at the total, never negative");

section("R43-3. Repayments are folded in, never counted twice");
const pay1 = T({ id: 21, type: "income", category: "refund", amount: 30, date: "2026-10-12", reimbFor: 11 });
const pay2 = T({ id: 22, type: "income", category: "refund", amount: 30, date: "2026-10-14", reimbFor: 11 });
const all2 = [dinner, lunch, pay1];
ok(eq(reimbStatus(all2, dinner), { who: "Aysel", expected: 60, received: 30, owed: 30, extra: 0 }), "after 30 of 60 is paid: owed 30", reimbStatus(all2, dinner));
v = forSpending(all2);
ok(!v.some((x) => x.id === 21) && v.find((x) => x.id === 11).amount === 40, "the repayment is not money in again, the share stays 40");
ok(calcMonthSummary(v, "2026-10", "2026-09", now).curIn === 0, "month money in is 0 (the repayment is already inside the share)");
const all3 = [dinner, lunch, pay1, pay2];
ok(eq(reimbStatus(all3, dinner), { who: "Aysel", expected: 60, received: 60, owed: 0, extra: 0 }), "fully paid back: owed 0", reimbStatus(all3, dinner));
const over = T({ id: 23, type: "income", category: "refund", amount: 15, date: "2026-10-15", reimbFor: 11 });
const all4 = [dinner, pay1, pay2, over];
ok(reimbStatus(all4, dinner).extra === 15 && reimbStatus(all4, dinner).owed === 0, "paying 15 more than agreed is reported as extra 15");
v = forSpending(all4);
ok(v.filter((x) => x.type === "income").length === 1 && v.find((x) => x.type === "income").amount === 15, "the extra 15 stays visible as money in", v.map((x) => x.amount));
v = forSpending([pay1]);
ok(v.length === 1 && v[0].amount === 30, "if the expense was deleted, the repayment is ordinary money in again");
// raw cash: -100 dinner -20 lunch +30 +30 repaid = -60; share view: dinner 40 + lunch 20 = -60
const rawNet = all3.reduce((s, x) => s + (x.type === "income" ? x.amount : -x.amount), 0);
v = forSpending(all3);
const viewNet = v.reduce((s, x) => s + (x.type === "income" ? x.amount : -x.amount), 0);
ok(rawNet === -60 && viewNet === -60, "money in minus spending is the same either way: -100 -20 +60 = -60, and share 40 + 20 = -60 (nothing lost or counted twice)", [rawNet, viewNet]);

section("R43-4. Owed totals for Home and the ledger rows");
const m = reimbOwedMap(all2);
ok(m.size === 1 && m.get("11") === 30, "only the dinner is still owed, 30", [...m]);
ok(reimbOwedMap(all3).size === 0, "nothing owed once paid back");
const other = T({ id: 13, type: "expense", category: "transport", amount: 40, date: D, reimb: { amt: 10, who: "Murad" } });
const tot = reimbOwedTotal([dinner, other, pay1]);
ok(tot.total === 40 && tot.n === 2, "30 from Aysel + 10 from Murad = 40 owed by 2 people", tot);
ok(reimbStatus([lunch], lunch) === null && reimbStatus([], null) === null, "an entry without the field has no status");

section("R43-5. Backup round trip");
const base = { transactions: [dinner, pay1], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 }, bills: [] };
const plan = planImportWithCats(JSON.stringify(buildBackup(base)), "b.json");
ok(plan.ok, "the file reads back", plan.error);
const by = Object.fromEntries(plan.transactions.map((x) => [String(x.id), x]));
ok(by["11"] && by["11"].reimb && by["11"].reimb.amt === 60 && by["11"].reimb.who === "Aysel" && by["21"] && by["21"].reimbFor === 11, "reimb and reimbFor survive a backup", by);
finish("run43reimb");
