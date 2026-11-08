// Run 36 (2026-11-07): a refund marked "Refund of <expense category>" lowers that category's spending in the refund's month (never below
// zero) instead of counting as money in. Expected values worked out by hand before running. Synthetic data only.
import { H, ok, section, eq, reset, T, finish, setNow } from "./lib.mjs";
const { forSpending, calcMonthSummary, calcCategorySpend, calcSafeToSpend, normaliseTxn, migrateAndLoad, buildCsv } = H;
reset();
const now = new Date(2026, 9, 31);
let n = 1;
const e = (category, amount, date) => T({ id: n++, type: "expense", category, amount, date });
const r = (amount, date, refundFor) => T({ id: n++, type: "income", category: "refund", amount, date, ...(refundFor ? { refundFor } : {}) });
const inc = (amount, date) => T({ id: n++, type: "income", category: "salary", amount, date });
const oct = (list) => calcMonthSummary(forSpending(list), "2026-10", "2026-09", now);
const cat = (list, mon = "2026-10") => calcCategorySpend(forSpending(list), mon, now);

section("R36-1. Same month: 100 on food, 30 back for food");
let L = [inc(1000, "2026-10-01"), e("food", 100, "2026-10-03"), r(30, "2026-10-10", "food")];
let s = oct(L);
ok(s.curExp === 70 && cat(L).food === 70, "food spending is 70 (100 - 30)", [s.curExp, cat(L).food]);
ok(s.curInc === 1000 && s.curIn === 1000 && s.curOther === 0, "income 1000; the refund is not also money in", [s.curInc, s.curIn, s.curOther]);
ok(s.curIn - s.curExp === 930, "net 930 = the real cash difference 1000 + 30 - 100", s.curIn - s.curExp);
const safe = calcSafeToSpend(forSpending(L), { enabled: true, savingsTarget: 0 }, [], now);
ok(safe.curInc === 1000 && safe.curExp === 70, "Safe-to-Spend sees money in 1000 and spending 70 (same net, nothing counted twice)", [safe.curInc, safe.curExp]);

section("R36-2. Refund in a later month: the earlier month is not rewritten");
L = [e("food", 100, "2026-09-20"), r(30, "2026-10-05", "food")];
s = oct(L);
ok(s.curExp === 0 && s.curIn === 30 && s.curOther === 30 && s.curInc === 0, "October: nothing to lower, so the 30 stays money in (not income)", [s.curExp, s.curIn, s.curOther, s.curInc]);
ok(cat(L, "2026-09").food === 100, "September food stays 100", cat(L, "2026-09"));

section("R36-3. Refund larger than that month's spending: never below zero");
L = [e("food", 20, "2026-10-02"), r(50, "2026-10-04", "food")];
s = oct(L);
ok(s.curExp === 0 && !("food" in cat(L)), "food is 0 and the fully refunded entry leaves the spending views", cat(L));
ok(s.curIn === 30 && s.curOther === 30, "the remaining 30 is money in", [s.curIn, s.curOther]);

section("R36-4. Several entries: latest on or before the refund first, then later ones");
L = [e("food", 40, "2026-10-01"), e("food", 25, "2026-10-08"), e("food", 60, "2026-10-20"), r(50, "2026-10-10", "food")];
const rows = forSpending(L).filter((x) => x.type === "expense").map((x) => [x.date, x.amount]);
ok(eq(rows, [["2026-10-01", 15], ["2026-10-20", 60]]), "25 on the 8th is used up, 40 on the 1st becomes 15, the 20th is untouched", rows);
ok(cat(L).food === 75, "food total 125 - 50 = 75", cat(L).food);
L = [e("food", 10, "2026-10-01"), e("food", 30, "2026-10-25"), r(25, "2026-10-05", "food")];
ok(eq(forSpending(L).filter((x) => x.type === "expense").map((x) => x.amount), [15]), "10 before the refund, then 15 of the 30 after it: 15 left", forSpending(L));

section("R36-5. Only the named category; refunds without a category behave as before");
L = [e("food", 50, "2026-10-02"), e("transport", 50, "2026-10-02"), r(20, "2026-10-03", "transport"), r(5, "2026-10-03")];
ok(cat(L).food === 50 && cat(L).transport === 30, "food untouched, transport 50 - 20 = 30", cat(L));
s = oct(L);
ok(s.curOther === 5 && s.curIn === 5, "the refund without 'Refund of' is 5 of money in, as before", [s.curOther, s.curIn]);
L = [e("food", 50, "2026-10-02"), r(20, "2026-10-03", "salary")];
ok(cat(L).food === 50 && oct(L).curIn === 20, "a 'refund of' an income category lowers nothing and stays money in", [cat(L), oct(L).curIn]);

section("R36-6. Whole cents and no change to the stored list");
L = [e("food", 0.3, "2026-10-02"), r(0.1, "2026-10-03", "food")];
ok(cat(L).food === 0.2, "0.30 - 0.10 = exactly 0.20", cat(L).food);
const before = JSON.stringify(L);
forSpending(L);
ok(JSON.stringify(L) === before, "the stored entries are not changed");

section("R36-7. The field is kept in saved data, backups and CSV");
ok(normaliseTxn(r(30, "2026-10-10", "food")).refundFor === "food", "kept on a refund");
ok(!("refundFor" in normaliseTxn({ ...e("food", 5, "2026-10-01"), refundFor: "food" })), "never kept on an expense");
ok(!("refundFor" in normaliseTxn(r(30, "2026-10-10", "Food!"))), "junk text is not kept");
ok(!("refundFor" in normaliseTxn(r(30, "2026-10-10"))), "a refund without it gets no new field (older data keeps its shape)");
globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [r(30, "2026-10-10", "u_abc123")], language: "en" }));
ok(migrateAndLoad().transactions[0].refundFor === "u_abc123", "a user's own category id survives a reload");
const csv = buildCsv([r(30, "2026-10-10", "food")]);
const lines = csv.replace(/^﻿/, "").split("\r\n");
ok(/"DebtRepayment","RefundOf","PaidAmount","PaidCurrency","Rate","SpreadMonths"$/.test(lines[0]) && /"Food & Dining","","","",""$|"Food","","","",""$/.test(lines[1]), "CSV: RefundOf is the last column and names the category", lines);
section("R36-7b. A refund dated in the future lowers nothing until its day");
setNow(2026, 9, 13);   // today = 13 Oct 2026
L = [e("food", 100, "2026-10-03"), r(30, "2026-10-20", "food")];
const fut = calcMonthSummary(forSpending(L), "2026-10", "2026-09", new Date(2026, 9, 13));
ok(cat(L).food === 100 && fut.curIn === 0 && forSpending(L).some((x) => x.category === "refund" && x.amount === 30), "on 13 Oct a refund dated 20 Oct leaves food at 100 and is not yet money in (still listed for later)", [cat(L), fut.curIn]);
setNow(2026, 9, 25);
ok(cat(L).food === 70, "on 25 Oct it has happened: food 70", cat(L));
setNow(2026, 9, 13);

section("R36-8. How much refunds lowered spending (the Analytics note)");
const { refundsNetted } = H;
ok(refundsNetted([e("food", 100, "2026-10-03"), r(30, "2026-10-10", "food")], "2026-10") === 30 && refundsNetted([e("food", 20, "2026-10-02"), r(50, "2026-10-04", "food")], "2026-10") === 20 && refundsNetted([e("food", 100, "2026-09-20"), r(30, "2026-10-05", "food")], "2026-10") === 0, "30 when fully used; 20 when only 20 was spent; 0 when nothing was spent that month");
finish("run36refund");
