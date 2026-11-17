// Run 101: one shared collector of "scheduled payments with no record yet" (openCommitments) for Safe to Spend, the month-end forecast,
// the run-out day and the until-income figure. Before it, only Safe to Spend knew that a payment typed in ahead as an ordinary entry
// (same category, same name, same amount) IS the scheduled payment; the forecast and the until-income figure counted it twice.
// Every expected figure is worked out by hand; all data is invented.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcUntilPay, calcSafeToSpend, calcMonthEndForecast, openCommitments } = H;
reset();
const bill = (o) => ({ name: "Bill", type: "expense", category: "housing", subcategory: "", amount: 10, freq: "monthly", anchorDate: "2026-10-01", active: true, createdAt: "", ...o });
const salary = bill({ id: "sal", name: "Salary", type: "income", category: "salary", amount: 1200, anchorDate: "2026-10-25" });
const elec = bill({ id: "el", name: "Electricity", amount: 60, anchorDate: "2026-10-20" });
const pay = (id, date) => T({ id, type: "income", category: "salary", amount: 1200, date, billId: "sal" });
const paid = (id, billId, amount, date) => T({ id, type: "expense", category: "housing", amount, date, billId });
const ahead = (id, amount, date, merchant = "Electricity") => T({ id, type: "expense", category: "housing", merchant, amount, date });
const NOW = new Date(2026, 10, 16, 12);
const base = [pay(1, "2026-10-25"), paid(2, "el", 60, "2026-10-20")];

section("R101-D1. The collector itself");
{
  const a = openCommitments(base, [salary, elec], "2026-11", NOW);
  ok(a.rows.length === 1 && a.rows[0].s.billId === "el" && a.rows[0].upcoming.length === 1 && a.rows[0].upcoming[0] === "2026-11-20" && a.rows[0].overdue.length === 0 && a.matchedAhead === 0, "electricity 20 Nov is still due; income schedules are not listed", a);
  const b = openCommitments([...base, ahead(3, 60, "2026-11-20")], [salary, elec], "2026-11", NOW);
  ok(b.rows[0].upcoming.length === 0 && b.matchedAhead === 1, "the same payment typed in ahead settles it (noted as matched)", b);
  const c = openCommitments([...base, ahead(3, 59, "2026-11-20")], [salary, elec], "2026-11", NOW);
  ok(c.rows[0].upcoming.length === 1 && c.matchedAhead === 0, "59.00 is not 60.00: still due", c);
  const d = openCommitments([...base, ahead(3, 60, "2026-11-20", "Water")], [salary, elec], "2026-11", NOW);
  ok(d.rows[0].upcoming.length === 1, "another name: still due");
  const e = openCommitments([...base, ahead(3, 60, "2026-11-10")], [salary, elec], "2026-11", NOW);
  ok(e.rows[0].upcoming.length === 1, "an entry dated in the past does not settle it (Run 12 rule)");
  // overdue: today is the 22nd, nothing recorded -> overdue, and an entry dated ahead never settles an overdue date
  const f = openCommitments([...base, ahead(3, 60, "2026-11-25")], [salary, elec], "2026-11", new Date(2026, 10, 22, 12));
  ok(f.rows[0].overdue.length === 1 && f.rows[0].upcoming.length === 0 && f.matchedAhead === 0, "overdue and unrecorded stays counted");
  // `before`: only dates before that day are listed, and only entries before that day can settle them
  const g = openCommitments([...base, ahead(3, 60, "2026-11-26")], [salary, elec], "2026-11", NOW, { before: "2026-11-25" });
  ok(g.rows[0].upcoming.length === 1 && g.matchedAhead === 0, "an entry dated after the limit cannot settle a payment due before it");
  const h = openCommitments(base, [salary, elec], "2026-11", NOW, { before: "2026-11-20" });
  ok(h.rows[0].upcoming.length === 0, "a payment due ON the limit day is not listed");
}

section("R101-D2. Until your next income: a payment typed in ahead is counted once");
{
  // 400 held, electricity 60 due 20 Nov, next salary 25 Nov, 9 days (16..24)
  const r0 = calcUntilPay(base, [salary, elec], 400, null, NOW);
  ok(r0.show && r0.due === 60 && r0.planned === 0 && r0.left === 340 && r0.perDay === 37.77, "nothing typed ahead: 400 - 60 = 340, 37.77 a day", r0);
  // the person typed the electricity payment in for the 20th: it is the entry (60), not entry + scheduled (120)
  const r1 = calcUntilPay([...base, ahead(3, 60, "2026-11-20")], [salary, elec], 400, null, NOW);
  ok(r1.show && r1.due === 0 && r1.dueCount === 0 && r1.planned === 60 && r1.left === 340 && r1.perDay === 37.77, "typed ahead: still 340 left, not 280", r1);
  // 59.00 is another payment: 400 - 60 - 59 = 281; 28100 / 9 = 3122.2 -> 31.22
  const r2 = calcUntilPay([...base, ahead(3, 59, "2026-11-20")], [salary, elec], 400, null, NOW);
  ok(r2.due === 60 && r2.planned === 59 && r2.left === 281 && r2.perDay === 31.22, "a different amount is not the same payment: 281 left, 31.22 a day", r2);
  // typed for the 26th (after the income): the entry is not before the income, so the scheduled payment on the 20th still counts
  const r3 = calcUntilPay([...base, ahead(3, 60, "2026-11-26")], [salary, elec], 400, null, NOW);
  ok(r3.due === 60 && r3.planned === 0 && r3.left === 340, "an entry dated after the income does not remove the payment due before it", r3);
}

section("R101-D3. Month-end forecast: a payment typed in ahead is counted once");
{
  // food 10.00 every day 20 Oct .. 15 Nov (27 days): usual daily spend 10.00, no spread
  const food = []; let id = 100;
  for (let d = new Date(2026, 9, 20); d <= new Date(2026, 10, 15); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) food.push(T({ id: id++, type: "expense", category: "food", merchant: "Market", amount: 10, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }));
  const f0 = calcMonthEndForecast([...base, ...food], [salary, elec], NOW);
  // spent so far in November: 15 days x 10 = 150; electricity still due 60
  ok(f0.available && f0.spentSoFar === 150 && f0.plannedLater === 0 && f0.commitments === 60 && f0.usualDaily === 10 && f0.point === 210 + 10 * f0.daysLeft, "nothing typed ahead: 150 + 60 + 10 a day", f0);
  const f1 = calcMonthEndForecast([...base, ...food, ahead(3, 60, "2026-11-20")], [salary, elec], NOW);
  ok(f1.plannedLater === 60 && f1.commitments === 0 && f1.point === f0.point, "typed ahead: the forecast is the same, not 60.00 higher", [f1.plannedLater, f1.commitments, f1.point, f0.point]);
}

section("R101-D4. Safe to Spend is unchanged");
{
  const tx = [...base, pay(5, "2026-11-10"), ahead(3, 60, "2026-11-20")];
  // 1,200 income - 60 typed ahead (inside spending) - 0 scheduled = 1,140
  const s = calcSafeToSpend(tx, { enabled: true, savingsTarget: 0 }, [], NOW, [salary, elec]);
  ok(s.remaining === 1140 && s.matchedAheadCount === 1 && s.upcomingCount === 0 && s.laterExp === 60, "1,200 - 60 = 1,140; matched once", s);
  const s2 = calcSafeToSpend([...base, pay(5, "2026-11-10")], { enabled: true, savingsTarget: 0 }, [], NOW, [salary, elec]);
  ok(s2.remaining === 1140 && s2.upcomingCount === 1 && s2.upcomingCommitments === 60, "not typed ahead: 1,200 - 60 scheduled = 1,140", s2);
}
finish("run101due");
