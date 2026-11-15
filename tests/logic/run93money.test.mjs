// Run 93: strict amount reading for bank statements, bank CSV files and bank notifications (audit 15 Nov, items A4a/A4b).
// Expected values worked out by hand. Synthetic values only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
import { stMoney } from "../../statement.js";
const { bankMoney, planImport } = H;
reset();

const both = (s) => [stMoney(s), bankMoney(s)];
const same = (s, want) => eq(both(s), [want, want]);

section("R93-M1. Formats that must keep working");
const good = [["35.00 AZN", 3500], ["-0.02 AZN", -2], [".90", 90], ["1,234.56", 123456], ["1 234,56", 123456], ["1.234,56", 123456],
  ["1'234.56", 123456], ["12.345,6", 1234560], ["1.234.567", 123456700], ["1,234,567", 123456700], ["1 234 567,89", 123456789],
  ["AZN0.90", 90], ["-0.90₼", -90], ["(45.00)", -4500], ["+12", 1200], ["600", 60000], ["600.", 60000], ["0,5", 50], ["12,5", 1250],
  ["12,50", 1250], ["1,234", 123400], ["1,005", 100500], ["12,500", 1250000], ["−12,5", -1250], ["–7.00", -700], ["0.10", 10], ["0.29", 29], ["1.15", 115]];
for (const [s, want] of good) ok(same(s, want), `"${s}" reads as ${want} qapik in both readers`, both(s));

section("R93-M2. A trailing minus means money going out");
ok(same("45-", -4500), '"45-" is minus 45.00 (was +45.00 in bank CSV: an expense became income)', both("45-"));
ok(same("45.00-", -4500) && same("1 234,56-", -123456) && same("12,50 −", -1250), "trailing minus after decimals, groups and a space", [both("45.00-"), both("1 234,56-"), both("12,50 −")]);
ok(same("(45.00)-", null), "brackets plus a trailing minus is unclear and refused", both("(45.00)-"));

section("R93-M3. Malformed or ambiguous text is refused, never guessed");
const bad = ["1e3", "1E3", "2e-2", "0,015", "0.015", "1.005", "2.675", "12.345", "1.234", "12.3456", "1.2.3", "1,2,3", "1,2,3x", "12.3.4x",
  "1.234.56", "1,234,56", "12 34", "1234,567", "01,234", "1,23,456", "1 234.567", "abc", "", "-", "–", "+", "()", "12abc", "1.234,567", "Infinity", "NaN", "0x1A"];
for (const s of bad) ok(same(s, null), `"${s}" is not read as money`, both(s));

section("R93-M4. Exact whole-number arithmetic");
let miss = 0, first = "";
for (let i = 0; i <= 2000000; i += 7) { const v = (i / 100).toFixed(2); if (stMoney(v) !== i || bankMoney(v) !== i || bankMoney(v.replace(".", ",")) !== i) { miss++; if (!first) first = v; } }
ok(miss === 0, "every 2-decimal value 0.00..20000.00 (step 0.07) reads exactly with a dot and with a comma", first);
ok(stMoney("999999999999.99") === 99999999999999 && stMoney("9999999999999.99") === null, "amounts above one trillion are refused");

section("R93-M5. The two readers agree on a wide set of inputs");
const chars = ["1", "2", "0", "5", ".", ",", " ", "-", "'", "e"];
let diff = 0, ex = "";
for (let n = 0; n < 6000; n++) {
  let s = ""; let x = n * 2654435761 % 4294967296; const len = 1 + (x % 7);
  for (let k = 0; k < len; k++) { x = (x * 1103515245 + 12345) % 2147483648; s += chars[x % chars.length]; }
  if (stMoney(s) !== bankMoney(s)) { diff++; if (!ex) ex = JSON.stringify(s); }
}
ok(diff === 0, "6000 generated strings give the same result in statement.js and App.jsx", ex);

section("R93-M6. A bank CSV file uses the strict rules end to end");
const csv = "Date;Description;Amount\n05.11.2026;Bravo Market;45,50-\n06.11.2026;Salary;2 000,00\n07.11.2026;Odd value;1e3\n08.11.2026;Typo;0,015\n";
const p = planImport(csv, "statement.csv");
const tr = p.transactions || [];
const shop = tr.find((t) => t.merchant === "Bravo Market"), pay = tr.find((t) => t.merchant === "Salary");
ok(p.ok !== false && tr.length === 2, "two rows are imported; the two unreadable values are not", tr);
ok(shop && shop.type === "expense" && shop.amount === 45.5, "45,50- becomes an expense of 45.50", shop);
ok(pay && pay.type === "income" && pay.amount === 2000, "2 000,00 stays income of 2000.00", pay);
ok((p.warnings || []).some((w) => /\b2\b/.test(w)), "the 2 refused rows are reported to the person, not dropped silently", p.warnings);

finish("run93money");
