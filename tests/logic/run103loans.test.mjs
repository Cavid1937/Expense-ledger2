// Run 103 (owner decision D9, 17 Nov 2026): loan instalments from the Debts page come off the money figures in full, counted once.
// Every expected figure is worked out by hand in docs/MONEY_FIGURES.md, section 12 (cases A to J). All data is invented.
// Loan used throughout: flat 12%, 1,200.00 for 12 months: instalment 112.00 = 12.00 interest + 100.00 principal, on the 20th.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcSafeToSpend, calcUntilPay, calcMonthEndForecast, openCommitments, loanOpenRows, loanBill, forSpending, cleanDebtData, mergeDebtData, buildSchedules } = H;
reset();
const NOW = new Date(2026, 10, 17, 12);
const cfg = { savingsTarget: 0 };
const L = (o = {}) => ({ id: "l1", lender: "Kapital Bank", kind: "cash", principal: 120000, ratePct: 12, rateType: "flat", months: 12, firstPayment: "2026-10-20", bankPayment: null, payments: [{ id: "p0", date: "2026-10-20", amount: 11200 }], ...o });
const D = (...loans) => ({ debts: [], loans });
const base = [T({ id: 1, type: "income", category: "salary", amount: 1000, date: "2026-11-03" }), T({ id: 2, amount: 200, date: "2026-11-05" })];
const safe = (raw, debt, bills = [], now = NOW) => calcSafeToSpend(forSpending(raw), cfg, [], now, bills, { debtData: debt, cashTx: raw });
const paidEntry = (amount, interest, o = {}) => T({ id: 3, amount, date: "2026-11-17", category: "finance", merchant: "Kapital Bank", loan: { interest }, ...o });

section("R103-1. Safe to Spend takes the instalment off, and paying it does not change the figure (cases A, B)");
{
  const a = safe(base, D(L()));
  ok(a.remaining === 688 && a.loanDue === 112 && a.loanDueCount === 1, "A: 1,000 - 200 - 112 = 688", a);
  const raw = [...base, paidEntry(112, 12)];
  const b = safe(raw, D(L({ payments: [...L().payments, { id: "p1", date: "2026-11-17", amount: 11200 }] })));
  ok(b.remaining === 688 && b.loanDue === 0 && b.loanPrincipalPaid === 100 && b.curExp === 212, "B: after Mark paid: 1,000 - 212 - 100 = 688 (unchanged)", b);
  const u = safe([...base, paidEntry(112, null)], D(L({ payments: [...L().payments, { id: "p1", date: "2026-11-17", amount: 11200 }] })));
  ok(u.remaining === 688 && u.loanPrincipalPaid === 112 && u.curExp === 200, "B: unknown split: nothing is spending, 112 is money out: still 688", u);
  const r = calcSafeToSpend(raw, cfg, [], NOW, [], { debtData: D(L({ payments: [...L().payments, { id: "p1", date: "2026-11-17", amount: 11200 }] })), cashTx: raw });
  ok(r.remaining === 688 && r.loanPrincipalPaid === 0, "raw entries given as the list: the principal is not taken off twice", r);
  const old = calcSafeToSpend(forSpending(base), cfg, [], NOW, []);
  ok(old.remaining === 800 && old.loanDue === 0, "no Debts data given: the figure is as before (800)", old);
}

section("R103-2. Old loan never recorded: only this month counts; paying today settles this month (case C)");
{
  const old = L({ months: 24, firstPayment: "2025-11-20", payments: [] });
  const c = safe(base, D(old));
  ok(c.loanDue === 62 && c.remaining === 738, "C: 62.00 (not 13 x 62.00): 1,000 - 200 - 62 = 738", c);
  const paid = { ...old, payments: [{ id: "p1", date: "2026-11-17", amount: 6200 }] };
  const c2 = safe([...base, paidEntry(62, 12)], D(paid));
  ok(c2.loanDue === 0 && c2.loanPrincipalPaid === 50 && c2.remaining === 738, "C: after Mark paid today: 1,000 - 212 - 50 = 738 (unchanged)", c2);
  ok(loanOpenRows(paid, NOW)[0].date === "2026-12-20", "the next row still to pay is December's", loanOpenRows(paid, NOW)[0]);
}

section("R103-3. Partial payment and already-paid instalments (case D)");
{
  const part = L({ payments: [...L().payments, { id: "p1", date: "2026-11-10", amount: 8000 }] });
  const r = loanOpenRows(part, NOW)[0];
  ok(r.date === "2026-11-20" && r.due === 3200 && r.interest === 0 && r.principal === 3200 && !r.full, "D: 80.00 paid of 112.00: 32.00 still due, all principal (interest is settled first)", r);
  ok(safe(base, D(part)).remaining === 768, "D: Safe to Spend 1,000 - 200 - 32 = 768", safe(base, D(part)));
  const small = L({ payments: [...L().payments, { id: "p1", date: "2026-11-10", amount: 500 }] });
  const s = loanOpenRows(small, NOW)[0];
  ok(s.due === 10700 && s.interest === 700 && s.principal === 10000, "5.00 paid: 107.00 due = 7.00 interest + 100.00 principal", s);
  const over = L({ payments: [...L().payments, { id: "p1", date: "2026-11-10", amount: 20000 }] });
  ok(loanOpenRows(over, NOW)[0].date === "2026-12-20" && loanOpenRows(over, NOW)[0].due === 11200, "200.00 paid: November settled, December still due in full (no carry)", loanOpenRows(over, NOW)[0]);
  const ahead = L({ payments: [...L().payments, { id: "p1", date: "2026-10-30", amount: 11200 }] });
  ok(safe(base, D(ahead)).loanDue === 0, "November's instalment paid early, on 30 October: nothing due in November", safe(base, D(ahead)));
  // 2 months: total interest 24.00, total 1,224.00, instalment 612.00
  const done = L({ months: 2, payments: [{ id: "a", date: "2026-10-20", amount: 61200 }, { id: "b", date: "2026-11-15", amount: 61200 }] });
  ok(loanOpenRows(done, NOW).length === 0, "a loan fully paid: nothing due");
}

section("R103-4. A loan that is also a recurring payment is counted once (case E)");
{
  const bill = { id: "bk", name: "Kapital Bank", type: "expense", category: "finance", subcategory: "", amount: 112, freq: "monthly", anchorDate: "2026-10-20", active: true, createdAt: "" };
  const e = safe(base, D(L()), [bill]);
  ok(e.remaining === 688 && e.loanDue === 0 && e.loanSkipped === 1 && e.futureCommitments === 112, "E: same name and amount: 112 taken off once, as the recurring payment", e);
  ok(safe(base, D(L({ lender: "  kapital   BANK " })), [bill]).remaining === 688, "case and spaces in the name do not matter");
  const named = { ...bill, name: "Car loan" };
  ok(safe(base, D(L()), [named]).remaining === 576, "different name, no link: both are taken off (576, the cautious side)", safe(base, D(L()), [named]));
  ok(safe(base, D(L({ billId: "bk" })), [named]).remaining === 688, "different name, linked on the loan: once (688)", safe(base, D(L({ billId: "bk" })), [named]));
  ok(safe(base, D(L({ billId: "bk" })), [{ ...named, active: false }]).remaining === 688 - 0 && safe(base, D(L({ billId: "bk" })), [{ ...named, active: false }]).loanDue === 112, "linked to a paused recurring payment: the loan counts (112), the paused one does not");
  ok(safe(base, D(L()), [{ ...bill, amount: 111.99 }]).loanDue === 112, "amount differs by 1 qapik: not the same payment, the loan counts");
  const sch = buildSchedules([], [bill]);
  ok(loanBill(L(), sch, NOW) && loanBill(L(), sch, NOW).billId === "bk" && loanBill(L({ lender: "Other" }), sch, NOW) === null, "loanBill names the recurring payment, or null");
}

section("R103-5. An ordinary entry typed in ahead is the instalment (case F)");
{
  const typed = T({ id: 4, amount: 112, date: "2026-11-20", category: "finance", merchant: "Kapital Bank" });
  const f = safe([...base, typed], D(L()));
  ok(f.remaining === 688 && f.loanDue === 0 && f.matchedAheadCount === 1, "F: 1,000 - 312 = 688 (not 576)", f);
  const two = safe([...base, typed], D(L(), L({ id: "l2" })));
  ok(two.remaining === 576 && two.loanDue === 112, "two loans, one entry typed ahead: the entry settles one of them only (576)", two);
  const past = T({ id: 5, amount: 112, date: "2026-11-16", category: "finance", merchant: "Kapital Bank" });
  ok(safe([...base, past], D(L())).loanDue === 112, "an entry dated before today does not settle it (the person may have paid something else)");
  ok(safe([...base, { ...typed, amount: 100 }], D(L())).loanDue === 112, "a different amount does not settle it");
}

section("R103-6. Until your next income: due on payday, month boundary, old rows, counted once (cases G, H, I)");
{
  const sal = (anchor) => ({ id: "sal", name: "Salary", type: "income", category: "salary", subcategory: "", amount: 1200, freq: "monthly", anchorDate: anchor, active: true, createdAt: "" });
  const last = (d) => [T({ id: 9, type: "income", category: "salary", amount: 1200, date: d, billId: "sal" })];
  const g = calcUntilPay(last("2026-10-20"), [sal("2026-10-20")], 900, D(L({ payments: [] , firstPayment: "2026-11-20" })), NOW);
  ok(g.show && g.payDate === "2026-11-20" && g.due === 0 && g.left === 900, "G: instalment on payday (20th): not counted before that income", g);
  const g2 = calcUntilPay(last("2026-10-20"), [sal("2026-10-20")], 900, D(L({ payments: [], firstPayment: "2026-11-19" })), NOW);
  ok(g2.due === 112 && g2.left === 788, "G: instalment the day before payday: counted (788)", g2);
  const i = calcUntilPay(last("2026-10-25"), [sal("2026-10-25")], 900, D(L({ payments: [{ id: "p0", date: "2026-10-20", amount: 11200 }] })), NOW);
  ok(i.left === 788 && i.days === 8 && i.perDay === 98.5, "I: 900 - 112 = 788 over 8 days = 98.50 a day", i);
  const N28 = new Date(2026, 10, 28, 12);
  const rec = [T({ id: 9, type: "income", category: "salary", amount: 1200, date: "2026-11-05", billId: "sal" }), T({ id: 10, amount: 50, date: "2026-11-06" })];
  const dec = D(L({ firstPayment: "2026-12-01", payments: [] }));
  const h = calcUntilPay(rec, [sal("2026-10-05")], 900, dec, N28, { afterIncome: true });
  ok(h.payDate === "2026-12-05" && h.due === 112, "H: on 28 Nov, instalment 1 Dec, salary 5 Dec: counted in until-income", h);
  ok(calcSafeToSpend(rec, cfg, [], N28, [sal("2026-10-05")], { debtData: dec }).loanDue === 0, "H: and not in November's Safe to Spend");
  const oldRows = D(L({ firstPayment: "2026-08-10", payments: [] }));
  const o = calcUntilPay(last("2026-10-25"), [sal("2026-10-25")], 900, oldRows, NOW);
  ok(o.due === 112 && o.dueCount === 1, "rows from August to October never recorded are not counted; November's (overdue) is, once (was 448)", o);
  const span = calcUntilPay(rec, [sal("2026-10-05")], 900, D(L({ firstPayment: "2026-11-10", payments: [] })), NOW, { afterIncome: true });
  ok(span.payDate === "2026-12-05" && span.due === 112 && span.dueCount === 1, "pay cycle over two months: November's overdue instalment counted once, December's (10th) after payday not at all", span);
}

section("R103-7. Month-end forecast: interest as spending, principal apart (case J)");
{
  const hist = [];
  for (let d = 20; d <= 47; d++) { const dt = new Date(2026, 9, d); hist.push(T({ id: 100 + d, amount: 10, date: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}` })); }
  const tx = forSpending(hist);
  const f0 = calcMonthEndForecast(tx, [], NOW), f1 = calcMonthEndForecast(tx, [], NOW, D(L()));
  ok(f0.available && f1.available && Math.round((f1.commitments - f0.commitments) * 100) === 1200 && f1.loanPrincipal === 100 && f0.loanPrincipal === 0, "J: 12.00 interest added to the fixed part; 100.00 principal returned apart", { f0: f0.commitments, f1: f1.commitments, p: f1.loanPrincipal });
  ok(Math.round((f1.point - f0.point) * 100) === 1200, "the forecast moves by the interest only", { f0: f0.point, f1: f1.point });
  const withPay = forSpending([...hist, T({ id: 99, amount: 112, date: "2026-11-02", category: "finance", merchant: "Kapital Bank", loan: { interest: 12 } })]);
  const f2 = calcMonthEndForecast(withPay, [], NOW);
  ok(f2.usualDaily === f0.usualDaily, "a loan payment entry is not part of the usual daily pace", { f0: f0.usualDaily, f2: f2.usualDaily });
}

section("R103-8. openCommitments returns the loans; the link survives saving, reading and merging");
{
  const o = openCommitments(base, [], "2026-11", NOW, { debtData: D(L()) });
  ok(o.loans.length === 1 && o.loans[0].due === 11200 && o.loans[0].interest === 1200 && o.loans[0].principal === 10000 && o.loans[0].loanId === "l1", "one row: 112.00 = 12.00 + 100.00", o.loans);
  ok(openCommitments(base, [], "2026-11", NOW).loans.length === 0, "without Debts data: no loan rows (callers that do not pass it are unchanged)");
  const c = cleanDebtData({ loans: [L({ billId: "bk1x" }), L({ id: "l2", billId: "<script>" }), L({ id: "l3", billId: 5 })] });
  ok(c.loans[0].billId === "bk1x" && !("billId" in c.loans[1]) && !("billId" in c.loans[2]) && c.loans.length === 3, "a short id is kept; anything else is dropped, the loan itself kept", c.loans.map((l) => l.billId));
  const m = mergeDebtData({ loans: [] }, { loans: [L({ billId: "bk1x" })] });
  ok(m.loans[0].billId === "bk1x", "merging a backup keeps the link");
}
finish("run103loans");
