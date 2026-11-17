// Run 102: "Until your next income" starts from what the accounts hold (all money), so the entries dated ahead that it takes off must be
// counted as money too. Before Run 102 it took them from the spending view, which keeps only the interest of a loan payment, leaves out
// money lent or repaid to a person, and counts only the part of a cost nobody will pay back. Such an entry dated ahead made the figure
// too high by the missing part. Every expected figure is worked out by hand; all data is invented.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcUntilPay } = H;
reset();
const salary = { id: "sal", name: "Salary", type: "income", category: "salary", subcategory: "", amount: 1200, freq: "monthly", anchorDate: "2026-10-25", active: true, createdAt: "" };
const NOW = new Date(2026, 10, 16, 12);
const base = [T({ id: 1, type: "income", category: "salary", amount: 1200, date: "2026-10-25", billId: "sal" })];
// 400 held, next salary 25 Nov, 9 days (16..24)
const loanPay = T({ id: 2, type: "expense", category: "housing", amount: 100, date: "2026-11-20", loan: { interest: 15 } });
const lend = T({ id: 3, type: "expense", category: "other", amount: 100, date: "2026-11-20", debtLink: { debtId: "d1", paymentId: "p1" } });
const shared = T({ id: 4, type: "expense", category: "food", amount: 100, date: "2026-11-20", reimb: { who: "Friend", amt: 40 } });
const plain = T({ id: 5, type: "expense", category: "food", amount: 100, date: "2026-11-20" });
// What the Home screen passes: the spending view as the list, the raw entries as cashTx. The spending view is written out by hand:
// the loan payment keeps only its interest (15), money lent is left out, the shared cost keeps the part nobody pays back (60).
const loanView = { ...loanPay, amount: 15 }, sharedView = { ...shared, amount: 60 };

section("R102-C1. Entries dated ahead are taken off in full when the raw entries are given");
{
  const r0 = calcUntilPay([...base, plain], [salary], 400, null, NOW, { cashTx: [...base, plain] });
  ok(r0.show && r0.planned === 100 && r0.left === 300 && r0.perDay === 33.33, "ordinary entry: 400 - 100 = 300; 30000 / 9 = 3333.3 -> 33.33", r0);
  const r1 = calcUntilPay([...base, loanView], [salary], 400, null, NOW, { cashTx: [...base, loanPay] });
  ok(r1.planned === 100 && r1.left === 300, "loan payment 100 (interest 15): 100 leaves the account, not 15", r1);
  const r2 = calcUntilPay(base, [salary], 400, null, NOW, { cashTx: [...base, lend] });
  ok(r2.planned === 100 && r2.left === 300, "money lent 100 dated ahead: it leaves the account", r2);
  const r3 = calcUntilPay([...base, sharedView], [salary], 400, null, NOW, { cashTx: [...base, shared] });
  ok(r3.planned === 100 && r3.left === 300, "cost 100, 40 to come back later: 100 leaves the account now", r3);
}

section("R102-C2. Without cashTx the old behaviour stays (callers that pass raw entries already)");
{
  const r = calcUntilPay([...base, plain], [salary], 400, null, NOW);
  ok(r.planned === 100 && r.left === 300, "raw list, no option: same as before", r);
  const o = calcUntilPay([...base, loanView], [salary], 400, null, NOW);
  ok(o.planned === 15 && o.left === 385, "spending view, no option: 15 (the old figure; shows why Home must pass cashTx)", o);
}

section("R102-C3. The next income date is still found from the list given, not from cashTx");
{
  // A refund dated ahead (money back for the shared cost) is income in the raw list. It must not become "the next income".
  const back = T({ id: 6, type: "income", category: "refund", amount: 40, date: "2026-11-18", reimbFor: 4 });
  const raw = [...base, shared, back];
  const r = calcUntilPay([...base, sharedView], [salary], 400, null, NOW, { cashTx: raw });
  ok(r.show && r.payDate === "2026-11-25", "pay date is the salary on the 25th, not the refund on the 18th", r);
  ok(r.planned === 100 && r.left === 300, "and the cost dated ahead counts 100", r);
}

section("R102-C4. A bill payment typed in ahead is still counted once (Run 101 rule)");
{
  const elec = { ...salary, id: "el", name: "Electricity", type: "expense", category: "housing", amount: 60, anchorDate: "2026-10-20" };
  const tx = [...base, T({ id: 7, type: "expense", category: "housing", amount: 60, date: "2026-10-20", billId: "el" }), T({ id: 8, type: "expense", category: "housing", merchant: "Electricity", amount: 60, date: "2026-11-20" })];
  const r = calcUntilPay(tx, [salary, elec], 400, null, NOW, { cashTx: tx });
  ok(r.due === 0 && r.planned === 60 && r.left === 340, "400 - 60 = 340, not 280", r);
}
finish("run102cash");
