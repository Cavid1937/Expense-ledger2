// Run 24: bank-statement CSV layouts become reviewable import records. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { bankMoney, bankDate, planImport } = H;
reset();

section("R24-BK1. Amounts and dates");
ok(bankMoney("1 234,56") === 123456 && bankMoney("1.234,56") === 123456 && bankMoney("1,234.56") === 123456, "three thousand styles of 1234.56 all read as 123456 cents");
ok(bankMoney("-12,5 AZN") === -1250 && bankMoney("(45.00)") === -4500 && bankMoney("12.345,6") === 1234560, "negative with currency text, brackets = negative, 12.345,6 = 12345.60");
ok(bankMoney("") === null && bankMoney("abc") === null && bankMoney("1,2,3x") !== 99, "empty and text are not money");
ok(bankDate("05.11.2026") === "2026-11-05" && bankDate("5/11/2026") === "2026-11-05" && bankDate("2026-11-05 14:30:00") === "2026-11-05", "day-first dates and ISO with time");
ok(bankDate("31.02.2026") === null && bankDate("13/13/2026") === null && bankDate("") === null, "impossible dates are rejected, never guessed");

section("R24-BK2. A semicolon file with Debit and Credit columns");
const f = "Transaction Date;Description;Debit;Credit;Balance\n05.11.2026;Bravo Market;45,50;;1000,00\n06.11.2026;Salary Oct;;2 000,00;3000,00\n07.11.2026;ATM;;;\n32.11.2026;Bad date;5,00;;\n";
const p = planImport(f, "statement.csv");
ok(p.ok !== false, "the file is accepted", p.error);
const tr = p.transactions || [];
const a = tr.find((x) => x.merchant === "Bravo Market"), b = tr.find((x) => x.type === "income");
ok(tr.length === 2 && a && a.amount === 45.5 && a.type === "expense" && a.date === "2026-11-05" && b && b.amount === 2000 && b.date === "2026-11-06", "two entries: expense 45.50 on 5 Nov, income 2000.00 on 6 Nov", tr);
ok((p.warnings || []).some((w) => /\b2\b/.test(w)), "the 2 unreadable rows (no amount, impossible date) are reported, not dropped silently", p.warnings);

section("R24-BK3. The app's own CSV is untouched");
const own = "date,amount,type,category,merchant,note\n2026-10-05,12.50,expense,food,Shop,\n";
const q = planImport(own, "own.csv");
ok(q.ok !== false && q.transactions.length === 1 && q.transactions[0].amount === 12.5 && q.transactions[0].category === "food", "an ISO-dated file with a Category column keeps its category", q.transactions);
finish("run24bank");
