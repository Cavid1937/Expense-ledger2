// Run 67: bank CSV files through the statement reader, and "Match the columns" for tables the app cannot work out (statement.js).
// The layouts below are made up; every name and amount is invented. Expected values worked out by hand.
import { ok, section, finish, eq } from "./lib.mjs";
import { gridFromCsv, guessMap, readMapped, readStatement, linesFromGrid } from "../../statement.js";

section("R67-1. CSV text to a table");
const g = gridFromCsv('﻿Fecha;Concepto;Importe;Saldo\r\n05/10/2026;"Bravo; market";-12,50;87,50\r\n06/10/2026;"Salary ""Oct""";1.000,00;1.087,50\r\n\r\n');
ok(eq(g, [["Fecha", "Concepto", "Importe", "Saldo"], ["05/10/2026", "Bravo; market", "-12,50", "87,50"], ["06/10/2026", 'Salary "Oct"', "1.000,00", "1.087,50"]]), "the separator (;) is found, quotes keep a ';' inside a cell, \"\" is one quote, empty lines are dropped", g);
ok(eq(gridFromCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]) && eq(gridFromCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]), "commas and tabs too");

section("R67-2. A first guess, then the person's choice");
const m = guessMap(g);
ok(m.header === 0 && m.date === 0 && m.desc === 1 && m.amount === 2 && m.mode === "signed", "date in A, words in B, amount in C, column names in row 1", m);
const r = readMapped(g, m);
ok(eq(r.rows.map((x) => [x.date, x.type, x.cents, x.merchant]), [["2026-10-05", "expense", 1250, "Bravo; market"], ["2026-10-06", "income", 100000, 'Salary "Oct"']]), "-12,50 is 12.50 out; 1.000,00 is 1,000.00 in", r.rows.map((x) => [x.date, x.type, x.cents]));
const withBal = readMapped(g, { ...m, balance: 3 });
ok(withBal.check.has === true && withBal.check.ok === true, "with the balance column chosen, the running balance confirms both rows (87.50 + 1,000.00 = 1,087.50)", withBal.check);

section("R67-3. Two columns (money out, money in), and 'every row is money out'");
const two = [["Tarix", "Təyinat", "Məxaric", "Mədaxil"], ["01.10.2026", "Market A", "12.50", ""], ["02.10.2026", "Maaş", "", "1000"], ["Cəmi", "", "12.50", "1000"]];
const t2 = readMapped(two, { header: 0, date: 0, desc: 1, mode: "inout", debit: 2, credit: 3, balance: -1, amount: -1 });
ok(eq(t2.rows.map((x) => [x.type, x.cents]), [["expense", 1250], ["income", 100000]]) && eq(t2.problems, ["rows:1"]), "12.50 out, 1,000 in; the totals row has no date and is left out and counted", t2);
const out = readMapped([["d", "w", "a"], ["2026-10-01", "Taxi", "6.50"], ["2026-10-02", "Metro", "0.60"]], { header: 0, date: 0, desc: 1, mode: "out", amount: 2, balance: -1, debit: -1, credit: -1 });
ok(out.rows.every((x) => x.type === "expense") && out.rows.map((x) => x.cents).join() === "650,60", "'every row is money out': both rows are spending even without a minus sign");

section("R67-4. Nothing invented");
const none = readMapped(g, { ...m, date: 1 });
ok(none.rows.length === 0, "the wrong date column reads nothing (no row is made up)");
ok(readMapped([], m).rows.length === 0 && readMapped(g, {}).rows.length === 0, "an empty file or no choices: nothing");
ok(r.rows.every((x) => !/\d{13,}/.test(x.desc)), "no long card numbers are kept in the words");

section("R67-5. A bank CSV the reader already understands needs no matching");
const known = gridFromCsv("Date,Description,Debit,Credit,Balance\n01.10.2026,Market,12.50,,87.50\n02.10.2026,Salary,,1000.00,1087.50");
const st = readStatement(linesFromGrid(known));
ok(st.rows.length === 2 && st.check.ok === true, "named columns (Debit, Credit, Balance) are read directly, and the balance confirms them", st.rows.length);
finish("run67map");
