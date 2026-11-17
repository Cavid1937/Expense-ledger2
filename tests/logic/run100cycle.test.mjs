// Run 100: the "until your next income" figure is also worked out AFTER this month's income is recorded (opts.afterIncome), for the
// line under Safe to Spend. Safe to Spend itself is unchanged. Every expected figure is worked out by hand; all data is invented.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcUntilPay, calcSafeToSpend } = H;
reset();
const bill = (o) => ({ name: "Bill", type: "expense", category: "housing", subcategory: "", amount: 10, freq: "monthly", anchorDate: "2026-10-01", active: true, createdAt: "", ...o });
const salary = bill({ id: "sal", name: "Salary", type: "income", category: "salary", amount: 1200, anchorDate: "2026-10-25" });
const rent = bill({ id: "rent", name: "Rent", amount: 150, anchorDate: "2026-10-07" });
const net = bill({ id: "net", name: "Internet", amount: 20, anchorDate: "2026-10-15" });
const pay = (id, date) => T({ id, type: "income", category: "salary", amount: 1200, date, billId: "sal" });
const paid = (id, billId, amount, date) => T({ id, type: "expense", category: "housing", amount, date, billId });

section("R100-C1. The day after pay day: the salary must last until 25 December");
{
  const NOW = new Date(2026, 10, 26, 12);
  const tx = [pay(1, "2026-10-25"), pay(2, "2026-11-25"), paid(3, "rent", 150, "2026-10-07"), paid(4, "rent", 150, "2026-11-07"), paid(5, "net", 20, "2026-10-15"), paid(6, "net", 20, "2026-11-15"), T({ id: 7, type: "expense", category: "food", amount: 520, date: "2026-11-10" })];
  const bills = [salary, rent, net];
  ok(calcUntilPay(tx, bills, 1540, null, NOW).show === false, "without the option nothing changes: income is recorded this month, so the card stays hidden");
  const r = calcUntilPay(tx, bills, 1540, null, NOW, { afterIncome: true });
  // next income 25 Dec; days to cover 26 Nov .. 24 Dec = 5 + 24 = 29
  ok(r.show === true && r.payDate === "2026-12-25" && r.days === 29, "next income 25 Dec, 29 days", r);
  // due before 25 Dec: rent 7 Dec 150 + internet 15 Dec 20 = 170; 1,540 - 170 = 1,370; 137000 qapik / 29 = 4724.1 -> 47.24 a day
  ok(r.due === 170 && r.dueCount === 2 && r.left === 1370 && r.perDay === 47.24, "1,540 - 170 = 1,370; 47.24 a day", r);
  // Safe to Spend (calendar month, unchanged): 1,200 - 150 - 20 - 520 = 510 for 26..30 Nov = 5 days -> 102.00 a day
  const s = calcSafeToSpend(tx, { enabled: true, savingsTarget: 0 }, [], NOW, bills);
  ok(s.feasible === true && s.remaining === 510 && s.daysRemaining === 5 && s.dailyAllowance === 102, "Safe to Spend is unchanged: 510 for 5 days, 102.00 a day", s);
}

section("R100-C2. A small income earlier this month no longer hides the figure");
{
  const NOW = new Date(2026, 10, 16, 12);
  const elec = bill({ id: "el", name: "Electricity", amount: 60, anchorDate: "2026-10-20" });
  const tx = [pay(1, "2026-10-25"), paid(2, "el", 60, "2026-10-20"), T({ id: 3, type: "income", category: "giftin", amount: 5, date: "2026-11-03" })];
  ok(calcUntilPay(tx, [salary, elec], 400, null, NOW).show === false, "the card (no option) is hidden by the 5.00 received on the 3rd, as before");
  const r = calcUntilPay(tx, [salary, elec], 400, null, NOW, { afterIncome: true });
  // next income 25 Nov; days 16..24 = 9; electricity 60 due 20 Nov; 400 - 60 = 340; 34000 / 9 = 3777.7 -> 37.77
  ok(r.show && r.payDate === "2026-11-25" && r.days === 9 && r.due === 60 && r.left === 340 && r.perDay === 37.77, "400 - 60 = 340 over 9 days: 37.77 a day", r);
}

section("R100-C3. Still silent when the app cannot know");
{
  const NOW = new Date(2026, 10, 26, 12);
  const tx = [pay(1, "2026-10-25"), T({ id: 2, type: "income", category: "giftin", amount: 5, date: "2026-11-03" })];
  ok(calcUntilPay(tx, [salary], 400, null, NOW, { afterIncome: true }).show === false, "the salary was due on the 25th and is not recorded: nothing is shown");
  ok(calcUntilPay([pay(1, "2026-11-25")], [], 400, null, NOW, { afterIncome: true }).show === false, "no next income date known: nothing is shown");
  ok(calcUntilPay([pay(1, "2026-10-25"), pay(2, "2026-11-25")], [salary], null, null, NOW, { afterIncome: true }).show === false, "no accounts: nothing is shown");
  // more owed than held: 100 - 150 rent (7 Dec) = -50
  const o = calcUntilPay([pay(1, "2026-10-25"), pay(2, "2026-11-25"), paid(3, "rent", 150, "2026-11-07")], [salary, rent], 100, null, NOW, { afterIncome: true });
  ok(o.show && o.left === -50 && o.perDay === 0, "100 held, 150 due: 50.00 short, no per-day figure", o);
}
finish("run100cycle");
