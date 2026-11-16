// Run 97: "Until your next income" (calcUntilPay). What the accounts cover before this month's income arrives. Every expected figure
// below is worked out by hand in the comment beside it; all data is invented.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcUntilPay, calcSafeToSpend } = H;
reset();
const NOW = new Date(2026, 10, 5, 12); // Thursday 5 Nov 2026
const bill = (o) => ({ name: "Bill", type: "expense", category: "housing", subcategory: "", amount: 10, freq: "monthly", anchorDate: "2026-10-01", active: true, createdAt: "", ...o });
const salary = bill({ id: "sal", name: "Salary", type: "income", category: "salary", amount: 1200, anchorDate: "2026-10-10" });
const octPay = T({ id: 1, type: "income", category: "salary", amount: 1200, date: "2026-10-10", billId: "sal" });
const rent = bill({ id: "rent", name: "Rent", amount: 150, anchorDate: "2026-10-07" });
const net = bill({ id: "net", name: "Internet", amount: 20, anchorDate: "2026-10-15" });
const phone = bill({ id: "ph", name: "Phone", amount: 25, anchorDate: "2026-10-02" });
const paid = (id, billId, amount, date) => T({ id, type: "expense", category: "housing", amount, date, billId });
const octBills = [paid(2, "rent", 150, "2026-10-07"), paid(3, "net", 20, "2026-10-15"), paid(4, "ph", 25, "2026-10-02")];

section("R97-U1. Pay on the 10th, today the 5th: 5 days to cover (5, 6, 7, 8, 9 Nov)");
{
  // held 300; rent 150 is due 7 Nov (before the 10th); internet is due 15 Nov (after it) -> 300 - 150 = 150; 150 / 5 = 30.00 a day
  const r = calcUntilPay([octPay, ...octBills.slice(0, 2)], [salary, rent, net], 300, null, NOW);
  ok(r.show === true && r.payDate === "2026-11-10" && r.days === 5, "next income 10 Nov, 5 days", r);
  ok(r.held === 300 && r.due === 150 && r.dueCount === 1 && r.planned === 0 && r.left === 150 && r.perDay === 30, "300 - 150 = 150, 30.00 a day; the bill after pay day is not counted", r);
  ok(calcSafeToSpend([octPay, ...octBills.slice(0, 2)], { enabled: true, savingsTarget: 0 }, [], NOW, [salary, rent, net]).feasible === false, "Safe to Spend itself has nothing to show on this day (unchanged)");
}

section("R97-U2. Never optimistic: an unrecorded bill from earlier this month, an entry dated ahead, a loan payment");
{
  // phone 25 was due 2 Nov and is not recorded -> still counted: due 150 + 25 = 175; left 300 - 175 = 125; 125 / 5 = 25.00
  const a = calcUntilPay([octPay, ...octBills], [salary, rent, net, phone], 300, null, NOW);
  ok(a.due === 175 && a.dueCount === 2 && a.left === 125 && a.perDay === 25, "overdue unrecorded bill counts: 175 due, 125 left, 25.00 a day", a);
  // plus an expense of 40.10 dated 8 Nov: left 125 - 40.10 = 84.90; 8490 qapik / 5 = 1698 -> 16.98
  const ahead = T({ id: 9, type: "expense", category: "food", amount: 40.1, date: "2026-11-08" });
  const b = calcUntilPay([octPay, ...octBills, ahead], [salary, rent, net, phone], 300, null, NOW);
  ok(b.planned === 40.1 && b.left === 84.9 && b.perDay === 16.98, "an entry dated ahead is set aside: 84.90 left, 16.98 a day", b);
  // plus a loan: 1,200.00 over 12 months without interest, first payment 8 Nov -> 100.00 due; left 84.90 - 100 = -15.10; nothing per day
  const loans = { debts: [], loans: [{ id: "l1", lender: "Bank", principal: 120000, months: 12, rateType: "none", ratePct: 0, firstPayment: "2026-11-08", bankPayment: null, payments: [] }] };
  const c = calcUntilPay([octPay, ...octBills, ahead], [salary, rent, net, phone], 300, loans, NOW);
  ok(c.due === 275 && c.dueCount === 3 && c.left === -15.1 && c.perDay === 0, "loan payment before pay day counts: short by 15.10, no per-day figure", c);
  // a day on which an entry falls ON pay day or after is not counted
  const onDay = T({ id: 10, type: "expense", category: "food", amount: 60, date: "2026-11-10" });
  ok(calcUntilPay([octPay, ...octBills, onDay], [salary, rent, net, phone], 300, null, NOW).planned === 0, "an expense dated on pay day is covered by the pay, not by today's money");
}

section("R97-U3. A bill paid ahead is counted once, not twice");
{
  // rent paid in advance as an entry dated 7 Nov and linked to the bill: the bill is settled, the entry is the 150
  const r = calcUntilPay([octPay, ...octBills.slice(0, 2), paid(11, "rent", 150, "2026-11-07")], [salary, rent, net], 300, null, NOW);
  ok(r.due === 0 && r.planned === 150 && r.left === 150, "150 once (as the dated entry), 150 left", r);
}

section("R97-U4. When the app cannot know, it shows nothing");
{
  const base = [octPay, ...octBills.slice(0, 2)], bl = [salary, rent, net];
  ok(calcUntilPay(base, bl, null, null, NOW).show === false && calcUntilPay(base, bl, NaN, null, NOW).show === false, "no accounts (held unknown): nothing");
  ok(calcUntilPay(base, [rent, net], 300, null, NOW).show === false, "no income date known: nothing");
  ok(calcUntilPay([...base, T({ id: 20, type: "income", category: "salary", amount: 50, date: "2026-11-02" })], bl, 300, null, NOW).show === false, "income already recorded this month: Safe to Spend takes over");
  // 12 Nov: the salary bill was due on the 10th and nothing is recorded -> the app cannot know whether it arrived
  ok(calcUntilPay(base, bl, 300, null, new Date(2026, 10, 12, 12)).show === false, "income bill overdue and unrecorded: nothing");
  ok(calcUntilPay(base, bl, 300, null, new Date(2026, 10, 10, 12)).show === false, "income bill due today: nothing");
  ok(calcUntilPay(null, null, 300, null, NOW).show === false && calcUntilPay([], [], 300, undefined, NOW).show === false, "empty or missing data: nothing, no crash");
  const far = T({ id: 21, type: "income", category: "freelance", amount: 500, date: "2027-01-15" });
  ok(calcUntilPay([far], [], 300, null, new Date(2026, 10, 28, 12)).show === false, "income more than 45 days away: nothing");
}

section("R97-U5. Across the month end and the year end; rounding down");
{
  // 28 Nov, irregular income: an income entry dated 3 Dec. Days 28, 29, 30 Nov, 1, 2 Dec = 5. Rent (due the 1st, November's paid) is due 1 Dec.
  const rent1 = bill({ id: "r1", name: "Rent", amount: 150, anchorDate: "2026-10-01" });
  const tx = [paid(30, "r1", 150, "2026-10-01"), paid(31, "r1", 150, "2026-11-01"), T({ id: 32, type: "income", category: "freelance", amount: 700, date: "2026-12-03" })];
  const r = calcUntilPay(tx, [rent1], 200, null, new Date(2026, 10, 28, 12));
  ok(r.show && r.payDate === "2026-12-03" && r.days === 5 && r.due === 150 && r.left === 50 && r.perDay === 10, "next month's rent before the income counts: 200 - 150 = 50, 10.00 a day", r);
  // 30 Dec 2026, income entry dated 2 Jan 2027: days 30, 31 Dec, 1 Jan = 3; held 100 -> 10000 / 3 = 3333.3 -> 33.33 (rounded down)
  const y = calcUntilPay([T({ id: 40, type: "income", category: "freelance", amount: 700, date: "2027-01-02" })], [], 100, null, new Date(2026, 11, 30, 12));
  ok(y.show && y.days === 3 && y.left === 100 && y.perDay === 33.33, "year end: 3 days, 33.33 a day (rounded down, 3 x 33.33 = 99.99)", y);
  // held below zero (a card in debt): nothing per day, the shortfall is shown
  const neg = calcUntilPay([T({ id: 41, type: "income", category: "freelance", amount: 700, date: "2026-11-09" })], [], -20.5, null, NOW);
  ok(neg.show && neg.left === -20.5 && neg.perDay === 0, "accounts below zero: -20.50, no per-day figure", neg);
}
finish("run97untilpay");
