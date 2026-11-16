// Run 98 (audit A4c): when does a bank statement need the person's tick before it can be added? Invented values only.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { statementNeedsOk } = H;
reset();
section("R98-ST1. A statement needs a tick only when a check actually failed");
{
  const sum = (debit, credit, rowsDebit, rowsCredit) => ({ debit, credit, rowsDebit, rowsCredit });
  ok(statementNeedsOk({ check: { has: true, ok: true, breaks: 0 }, summary: null }) === false, "running balance confirms every row: no tick");
  ok(statementNeedsOk({ check: { has: true, ok: false, breaks: 2 }, summary: null }) === true, "2 rows break the running balance: tick needed");
  ok(statementNeedsOk({ check: { has: false, ok: false, breaks: 0 }, summary: null }) === false, "the file has no running balance to check against: nothing failed, no tick");
  ok(statementNeedsOk({ check: { has: true, ok: true }, summary: sum(8780, 5000, 8780, 5000) }) === false, "the bank's totals equal the rows' totals: no tick");
  ok(statementNeedsOk({ check: { has: true, ok: true }, summary: sum(8780, 5000, 8770, 5000) }) === true, "money out differs by 0.10: tick needed");
  ok(statementNeedsOk({ check: { has: false }, summary: sum(8780, 5000, 8780, 4999) }) === true, "money in differs by 0.01: tick needed");
  ok(statementNeedsOk(null) === false && statementNeedsOk(undefined) === false && statementNeedsOk({}) === false && statementNeedsOk("x") === false, "no statement details: no tick, no crash");
}
finish("run98statement");
