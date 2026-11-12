// Run 52: reading bank statements (statement.js). The layouts copy two real statements (ABB, Unibank), but every name, number and amount
// here is invented. Expected values are worked out by hand.
import { ok, section, finish, eq } from "./lib.mjs";
import zlib from "zlib";
import { stMoney, stDate, linesFromText, linesFromGrid, readStatement, statementCheck, statementEntries, statementKey, zipEntries, sheetGrid, xlsxGrid } from "../../statement.js";

section("R52-1. Money and dates as banks print them");
ok(eq(["35.00 AZN", "-0.02 AZN", ".90", "1,234.56", "1 234,56", "AZN0.90", "-0.90₼", "(45.00)", "+12", "600", "1.234,5", "0,5"].map(stMoney), [3500, -2, 90, 123456, 123456, 90, -90, -4500, 1200, 60000, 123450, 50]), "twelve ways of writing an amount give the right whole qapik");
ok(eq(["", "-", "abc", "12.3.4x", "2026-10-01", null].map(stMoney), [null, null, null, null, null, null]), "empty, a dash, words and a date are not money");
ok(eq(stDate("2026-10-05"), { date: "2026-10-05", time: "" }) && eq(stDate("05-10-2026 | 09:15"), { date: "2026-10-05", time: "09:15" }) && eq(stDate("5.10.2026 7:05"), { date: "2026-10-05", time: "07:05" }) && eq(stDate("05/10/2026"), { date: "2026-10-05", time: "" }) && eq(stDate("20261005"), { date: "2026-10-05", time: "" }), "five date layouts, day first, with or without a time");
ok(stDate("31-02-2026") === null && stDate("2026-13-01") === null && stDate("05-10-2026 extra") === null && stDate("12.50") === null && stDate("") === null, "an impossible day, a date followed by other words and an amount are not dates");

// ── A statement in the ABB layout: Date | Description | CR | DR | Balance, newest first, description wrapped above and below the row ──
// Opening 100.00. 30 Sep +50.00 -> 150.00; -0.90 -> 149.10; -12.50 -> 136.60; -34.40 (described as 20.00 USD) -> 102.20; -40.00 -> 62.20.
const X = { date: 33, desc: 89, cr: 454, dr: 500, bal: 539 };
const P = (page, y, pairs) => ({ page, y, cells: pairs.map((p) => p[1]), xs: pairs.map((p) => p[0]) });
const abbPdf = [
  P(1, 760, [[225, "Account statement"]]), P(1, 716, [[37, "Account number"], [155, "AZ00TEST00000000000000000000 AZN"], [307, "Opening balance"], [460, "100.00 ₼ / 2026-09-30"]]),
  P(1, 535, [[435, "CR"], [481, "DR"]]), P(1, 527, [[33, "Date"], [89, "Description"], [526, "Balance"]]), P(1, 520, [[435, "amount"], [481, "amount"]]),
  P(1, 507, [[X.desc, "ATM NAGDLASDIRMA~20261006~AZN~40.00~BAKU~4000.."]]), P(1, 500, [[X.date, "2026-10-06"], [X.cr, "0.00"], [494, "40.00"], [X.bal, "62.20"]]), P(1, 493, [[X.desc, "1111~6011~RD00000000005~~AZE~~"]]),
  P(1, 460, [[X.date, "2026-10-05"], [X.desc, "OPENAI *CHATGPT~20261004~USD~20.00~SAN FRANCISCO~4000..1111~5734~RD00000000004~~USA~~"], [X.cr, "0.00"], [494, "34.40"], [534, "102.20"]]),
  P(1, 427, [[X.desc, "BRAVO MARKET~20261003~AZN~12.50~BAKU~4000.."]]), P(1, 420, [[X.date, "2026-10-03"], [X.cr, "0.00"], [494, "12.50"], [534, "136.60"]]), P(1, 413, [[X.desc, "1111~5411~RD00000000003~~AZE~~"]]),
  // this row is cut by the page break: its first half is on the dated line, its second half alone at the top of page 2
  P(1, 380, [[X.date, "2026-10-02"], [X.desc, "BUS 594~20261001~AZN~.90~BAKU~4000.."], [X.cr, "0.00"], [X.dr, "0.90"], [534, "149.10"]]),
  P(1, 30, [[280, "Page 1 of 2"]]),
  P(2, 780, [[X.desc, "1111~4131~RD00000000002~~AZE~~"]]),
  P(2, 740, [[X.date, "2026-10-01"], [X.desc, "Karta m*daxil~20260930~AZN~50.00~~4000..1111~~RD00000000001~CT000000001A~~~"], [443, "50.00"], [X.dr, "0.00"], [534, "150.00"]]),
  P(2, 30, [[280, "Page 2 of 2"]]),
];
section("R52-2. ABB layout from a PDF (text with positions)");
let r = readStatement(abbPdf);
ok(r.bank === "abb" && r.rows.length === 5 && r.problems.length === 0, "recognised as ABB; 5 rows; nothing left out", [r.bank, r.rows.length, r.problems]);
ok(eq(r.rows.map((x) => [x.type, x.cents, x.balance]), [["expense", 4000, 6220], ["expense", 3440, 10220], ["expense", 1250, 13660], ["expense", 90, 14910], ["income", 5000, 15000]]), "money in or out, amount and balance of every row", r.rows.map((x) => [x.type, x.cents, x.balance]));
ok(eq(r.rows.map((x) => x.date), ["2026-10-06", "2026-10-04", "2026-10-03", "2026-10-01", "2026-09-30"]) && r.rows[1].posted === "2026-10-05", "the date is the day of the payment (inside the description), not the later day the bank booked it");
ok(eq(r.rows.map((x) => x.merchant), ["ATM NAGDLASDIRMA", "OPENAI *CHATGPT", "BRAVO MARKET", "BUS 594", "Karta m*daxil"]), "the merchant is the first field only", r.rows.map((x) => x.merchant));
ok(eq(r.rows.map((x) => x.ref), ["RD00000000005", "RD00000000004", "RD00000000003", "RD00000000002", "RD00000000001"]) && eq(r.rows.map((x) => x.mcc), ["6011", "5734", "5411", "4131", ""]), "every row has its unique reference, also the row cut by the page break; merchant codes are read", r.rows.map((x) => [x.ref, x.mcc]));
ok(r.rows[1].orig === "20.00 USD" && r.rows[0].orig === "" && r.rows[3].orig === "", "a payment in dollars keeps '20.00 USD' as a note; the money that moved is the 34.40 the bank charged");
ok(eq(r.rows.map((x) => x.kind), ["cash", "payment", "payment", "payment", "transfer"]), "a cash withdrawal and money arriving on the card are not shopping", r.rows.map((x) => x.kind));
ok(r.check.has && r.check.ok && r.check.breaks === 0 && r.check.order === "newest", "the running balance confirms every row (newest first)", r.check);
ok(!JSON.stringify(r.rows).includes("4000") || !/4000\.\.1111/.test(JSON.stringify(r.rows)), "the card number pieces are not kept in any row");
const broken = readStatement(abbPdf.filter((l) => !(l.page === 1 && l.y >= 413 && l.y <= 427)));
ok(broken.rows.length === 4 && broken.check.has && broken.check.ok === false && broken.check.breaks === 1, "with one row missing (the 12.50), the balance check reports 1 break", broken.check);

section("R52-3. The same statement as an Excel grid and as pasted text");
const abbGrid = [["", "Account statement"], ["", "Opening balance", "100.00"], ["", "Date", "Description", "CR amount", "DR amount", "Balance"],
  ["", "2026-10-06", "ATM NAGDLASDIRMA~20261006~AZN~40.00~BAKU~4000..1111~6011~RD00000000005~~AZE~~", "0.00", "40.00", "62.20"],
  ["", "2026-10-05", "OPENAI *CHATGPT~20261004~USD~20.00~SAN FRANCISCO~4000..1111~5734~RD00000000004~~USA~~", "0.00", "34.40", "102.20"],
  ["", "2026-10-03", "BRAVO MARKET~20261003~AZN~12.50~BAKU~4000..1111~5411~RD00000000003~~AZE~~", "0.00", "12.50", "136.60"],
  ["", "2026-10-02", "BUS 594~20261001~AZN~.90~BAKU~4000..1111~4131~RD00000000002~~AZE~~", "0", "0.9", "149.1"],
  ["", "2026-10-01", "Karta m*daxil~20260930~AZN~50.00~~4000..1111~~RD00000000001~CT000000001A~~~", "50.00", "0.00", "150.00"]];
const g = readStatement(linesFromGrid(abbGrid));
const core = (rows) => rows.map((x) => [x.date, x.type, x.cents, x.balance, x.merchant, x.ref, x.mcc, x.orig, x.kind]);
ok(g.bank === "abb" && eq(core(g.rows), core(r.rows)) && g.check.ok, "the Excel grid gives exactly the same five rows as the PDF (also where Excel wrote 0.9 and 149.1 as numbers)");
const abbText = ["ATM NAGDLASDIRMA~20261006~AZN~40.00~BAKU~4000..", "2026-10-06 0.00 40.00 62.20", "1111~6011~RD00000000005~~AZE~~",
  "2026-10-05 OPENAI *CHATGPT~20261004~USD~20.00~SAN FRANCISCO~4000..1111~5734~RD00000000004~~USA~~ 0.00 34.40 102.20",
  "BRAVO MARKET~20261003~AZN~12.50~BAKU~4000..", "2026-10-03 0.00 12.50 136.60", "1111~5411~RD00000000003~~AZE~~",
  "BUS 594~20261001~AZN~.90~BAKU~4000..", "2026-10-02 0.00 0.90 149.10", "1111~4131~RD00000000002~~AZE~~",
  "2026-10-01 Karta m*daxil~20260930~AZN~50.00~~4000..1111~~RD00000000001~CT000000001A~~~ 50.00 0.00 150.00"].join("\r\n");
const tx = readStatement(linesFromText(abbText));
ok(tx.bank === "abb" && eq(core(tx.rows), core(r.rows)) && tx.check.ok, "pasted text (no positions; three wrapped rows in a row) gives the same five rows");
ok(eq(statementEntries("abb", r.rows).map((e) => e.id), statementEntries("abb", g.rows).map((e) => e.id)) && eq(statementEntries("abb", r.rows).map((e) => e.id), statementEntries("abb", tx.rows).map((e) => e.id)), "PDF, Excel and text give the same entry ids, so importing the statement again in another format adds nothing");

// ── A statement in the Unibank layout: date | time, posting date (or "Lock"), money in, money out, "MERCHANT / amount CUR" ──
const U = { date: 47, post: 168, inn: 281, innDash: 304, out: 355, outDash: 378, desc: 428 };
const uniPdf = [
  P(1, 552, [[182, "Posting date"], [286, "Paid in"], [360, "Paid out"]]), P(1, 545, [[57, "Transaction date"], [468, "Description"]]), P(1, 525, [[179, "(Posting date)"], [303, "+"], [378, "-"]]),
  P(1, 505, [[U.date, "12-11-2026 | 09:15"], [U.post, "12-11-2026"], [U.innDash, "-"], [358, "0.60 AZN"], [U.desc, "BAKU METRO / 0.60 AZN"]]),
  // a wide amount is printed on two lines inside its own column, and so is the description
  P(1, 468, [[290, "150.00"], [U.desc, "www.example-pay.az / 150.00"]]), P(1, 461, [[U.date, "11-11-2026 | 18:30"], [U.post, "12-11-2026"], [U.outDash, "-"]]), P(1, 454, [[295, "AZN"], [U.desc, "AZN"]]),
  P(1, 430, [[U.date, "11-11-2026 | 16:40"], [U.post, "Lock"], [U.innDash, "-"], [358, "5.00 AZN"], [U.desc, "KAFE 21 / 5.00 AZN"]]),
  P(1, 408, [[U.date, "11-11-2026 | 14:02"], [U.post, "11-11-2026"], [U.innDash, "-"], [355, "20.00 AZN"], [U.desc, "PAYMENT SERVICE / 20.00 AZN"]]),
  P(1, 386, [[U.date, "11-11-2026 | 14:00"], [U.post, "11-11-2026"], [U.inn, "20.00 AZN"], [U.outDash, "-"], [U.desc, "M10 WALLET / 20.00 AZN"]]),
  P(1, 364, [[U.date, "10-11-2026 | 12:00"], [U.post, "Lock"], [U.innDash, "-"], [358, "0.00 AZN"], [U.desc, "CARD CHECK / 0.00 AZN"]]),
  P(1, 342, [[U.date, "09-11-2026 | 11:11"], [U.post, "10-11-2026"], [U.innDash, "-"], [355, "17.00 AZN"], [U.desc, "ONLINE SHOP / 10.00 USD"]]),
  P(1, 320, [[U.date, "08-11-2026 | 08:08"], [U.post, "08-11-2026"], [U.innDash, "-"], [355, "30.00 AZN"], [U.desc, "to Test Person / 30.00 AZN"]]),
  P(1, 298, [[U.date, "Total (Yekun)"], [U.innDash, "-"], [U.outDash, "-"]]), P(1, 200, [[38, "\"Test Bank\" OJSC"]]),
];
section("R52-4. Unibank layout from a PDF");
let u = readStatement(uniPdf);
ok(u.bank === "unibank" && u.rows.length === 7 && eq(u.problems, ["zero:1"]), "recognised as Unibank; 7 rows; the 0.00 card check is left out and counted", [u.bank, u.rows.length, u.problems]);
ok(eq(u.rows.map((x) => [x.date, x.time, x.type, x.cents]), [["2026-11-12", "09:15", "expense", 60], ["2026-11-11", "18:30", "income", 15000], ["2026-11-11", "16:40", "expense", 500], ["2026-11-11", "14:02", "expense", 2000], ["2026-11-11", "14:00", "income", 2000], ["2026-11-09", "11:11", "expense", 1700], ["2026-11-08", "08:08", "expense", 3000]]), "date, time, direction and amount of every row (150.00 was split over two lines in its column)", u.rows.map((x) => [x.date, x.time, x.type, x.cents]));
ok(eq(u.rows.map((x) => x.merchant), ["BAKU METRO", "www.example-pay.az", "KAFE 21", "PAYMENT SERVICE", "M10 WALLET", "ONLINE SHOP", "to Test Person"]), "the merchant is the text before ' / amount'", u.rows.map((x) => x.merchant));
ok(eq(u.rows.map((x) => x.pending), [false, false, true, false, false, false, false]) && u.rows[2].posted === "", "the 'Lock' row is marked as not yet finished by the bank");
ok(u.rows[3].pair === true && u.rows[4].pair === true && u.rows.filter((x) => x.pair).length === 2, "20.00 in at 14:00 and 20.00 out at 14:02 are recognised as one move passing through the card");
ok(u.rows[5].orig === "10.00 USD" && u.rows[5].cents === 1700 && u.rows[6].kind === "transfer" && u.rows[0].kind === "payment", "a dollar payment keeps '10.00 USD'; 'to <person>' is a transfer");
ok(u.check.has === false && u.check.ok === null, "this layout has no running balance, and the result says so instead of claiming a check");
const uniText = ["12-11-2026 | 09:15 12-11-2026 - 0.60 AZN BAKU METRO / 0.60 AZN", "A VERY LONG MERCHANT NAME /", "11-11-2026 | 10:00 11-11-2026 - 7.50 AZN", "7.50 AZN", "11-11-2026 | 08:00 11-11-2026 3.00 AZN - CASHBACK / 3.00 AZN"].join("\n");
const ut = readStatement(linesFromText(uniText));
ok(ut.bank === "unibank" && eq(ut.rows.map((x) => [x.type, x.cents, x.merchant, x.kind]), [["expense", 60, "BAKU METRO", "payment"], ["expense", 750, "A VERY LONG MERCHANT NAME", "payment"], ["income", 300, "CASHBACK", "cashback"]]), "pasted text: a description wrapped above and below its row is put back together", ut.rows.map((x) => [x.type, x.cents, x.merchant, x.kind]));

section("R52-5. Any other bank: a table with headings, or no headings at all");
// Headings in Azerbaijani, day-first dates, comma decimals, a heading block above and a total below. 100,00 - 12,50 = 87,50; + 1 000,00 = 1 087,50; - 600 = 487,50.
let gg = readStatement(linesFromGrid([["Hesabdan çıxarış"], ["Tarix", "Təyinat", "Məxaric", "Mədaxil", "Qalıq"], ["01.10.2026", "Market A", "12,50", "", "87,50"], ["02.10.2026", "Əmək haqqı", "", "1 000,00", "1 087,50"], ["03.10.2026", "Kirayə", "600", "", "487,50"], ["Cəmi", "", "612,50", "1 000,00", ""]]));
ok(gg.bank === "generic" && eq(gg.rows.map((x) => [x.date, x.type, x.cents, x.balance, x.merchant]), [["2026-10-01", "expense", 1250, 8750, "Market A"], ["2026-10-02", "income", 100000, 108750, "Əmək haqqı"], ["2026-10-03", "expense", 60000, 48750, "Kirayə"]]) && gg.check.ok && gg.check.order === "oldest", "Azerbaijani headings (Məxaric / Mədaxil / Qalıq): three rows, the total line is not a row, balance confirmed oldest first", gg.rows.map((x) => [x.date, x.type, x.cents, x.balance, x.merchant]));
// A "money in" column used once in many rows still counts, and a column of codes next to it does not become money.
const many = [["Date", "Details", "Code", "Debit", "Credit"], ...Array.from({ length: 9 }, (_, i) => [`0${i + 1}/10/2026`, "Shop " + i, "5411", "1.00", ""]), ["10/10/2026", "Salary", "0000", "", "900.00"]];
gg = readStatement(linesFromGrid(many));
ok(gg.rows.length === 10 && gg.rows[9].type === "income" && gg.rows[9].cents === 90000 && gg.rows.slice(0, 9).every((x) => x.type === "expense" && x.cents === 100) && gg.rows[0].merchant === "Shop 0 5411", "ten rows; the single income is found; the code column is words, not money", gg.rows.map((x) => [x.type, x.cents]));
// No headings, three money columns: the running balance proves which is money in. 100 - 10 = 90; + 50 = 140; - 5 = 135.
gg = readStatement(linesFromGrid([["2026-10-01", "A", "0.00", "10.00", "90.00"], ["2026-10-02", "B", "50.00", "0.00", "140.00"], ["2026-10-03", "C", "0.00", "5.00", "135.00"]]));
ok(eq(gg.rows.map((x) => [x.type, x.cents]), [["expense", 1000], ["income", 5000], ["expense", 500]]) && gg.check.ok, "no headings, columns in/out/balance: worked out from the balance");
gg = readStatement(linesFromGrid([["2026-10-01", "A", "10.00", "0.00", "90.00"], ["2026-10-02", "B", "0.00", "50.00", "140.00"], ["2026-10-03", "C", "5.00", "0.00", "135.00"]]));
ok(eq(gg.rows.map((x) => [x.type, x.cents]), [["expense", 1000], ["income", 5000], ["expense", 500]]) && gg.check.ok, "the same with the two columns the other way round (out/in/balance): still right");
// Two money columns, an amount without a sign and a balance: the balance going up or down gives the direction.
gg = readStatement(linesFromGrid([["2026-10-01", "A", "10.00", "90.00"], ["2026-10-02", "B", "50.00", "140.00"], ["2026-10-03", "C", "5.00", "135.00"], ["2026-10-04", "D", "35.00", "100.00"]]));
ok(eq(gg.rows.slice(1).map((x) => [x.type, x.cents]), [["income", 5000], ["expense", 500], ["expense", 3500]]) && gg.problems.includes("first"), "amount + balance: 140 is up (in), 135 and 100 are down (out); the very first row has nothing before it and is flagged", [gg.rows.map((x) => [x.type, x.cents]), gg.problems]);
// One signed column.
gg = readStatement(linesFromGrid([["Date", "Description", "Amount"], ["2026-10-01", "Shop", "-12.50"], ["2026-10-02", "Refund", "3.00"]]));
ok(eq(gg.rows.map((x) => [x.type, x.cents]), [["expense", 1250], ["income", 300]]) && !gg.problems.includes("sign"), "one signed amount column: minus is spending, plus is money in");
gg = readStatement(linesFromGrid([["Date", "Description", "Amount"], ["2026-10-01", "Shop", "12.50"], ["2026-10-02", "Other", "3.00"]]));
ok(gg.rows.every((x) => x.type === "expense") && gg.problems.includes("sign"), "one column with no minus anywhere: treated as spending and flagged, never guessed silently");
// Two money columns that are neither headed nor provable: refused with a reason, nothing invented.
gg = readStatement(linesFromGrid([["2026-10-01", "A", "10.00", "7.00"], ["2026-10-02", "B", "50.00", "1.00"], ["2026-10-03", "C", "5.00", "2.00"]]));
ok(gg.rows.length === 0 && gg.problems.includes("columns"), "two unexplained money columns: no rows, reason 'columns'", gg);
ok(readStatement(linesFromText("hello\nthis is not a statement\n12345")).rows.length === 0 && readStatement([]).rows.length === 0 && readStatement(null).rows.length === 0, "ordinary text, nothing, or no input at all: no rows and no error");
// A text table with single-line headings (as copied from a PDF of another bank).
gg = readStatement(linesFromText("Date\tDetails\tDebit\tCredit\tBalance\n01.10.2026\tShop A\t12.50 AZN\t-\t87.50 AZN\n02.10.2026\tSalary\t-\t1,000.00 AZN\t1,087.50 AZN"));
ok(eq(gg.rows.map((x) => [x.type, x.cents, x.balance, x.cur]), [["expense", 1250, 8750, "AZN"], ["income", 100000, 108750, "AZN"]]) && gg.check.ok, "a tab-separated text table with dashes for 'nothing' and amounts that carry the currency");

section("R52-6. Rows become entries");
const known = [["Bravo", "food", "Groceries"], ["Netflix", "digital", "Streaming"]];
let e = statementEntries("abb", r.rows, { known });
ok(e.length === 5 && eq(e.map((x) => [x.type, x.amount, x.date]), [["expense", 40, "2026-10-06"], ["expense", 34.4, "2026-10-04"], ["expense", 12.5, "2026-10-03"], ["expense", 0.9, "2026-10-01"], ["income", 50, "2026-09-30"]]), "five entries with the amounts in money and the real dates");
ok(eq(e.map((x) => [x.category, x.subcategory]), [["finance", "Cash withdrawal"], ["digital", "Software"], ["food", "Groceries"], ["transport", "Bus"], ["income", ""]]) && e[0]._st.kind === "cash", "categories: cash withdrawal -> Finance/Cash withdrawal, marked as cash (Run 58); merchant codes 5734, 5411, 4131 -> Software, Groceries, Bus; money in -> Other income", e.map((x) => [x.category, x.subcategory]));
ok(e[1].note === "20.00 USD, SAN FRANCISCO" && e[2].note === "" && e[0].note === "", "the note keeps the foreign amount and a city other than Baku; nothing else");
ok(e.every((x) => /^s[a-z0-9]+$/.test(x.id)) && new Set(e.map((x) => x.id)).size === 5 && eq(statementEntries("abb", r.rows, { known }).map((x) => x.id), e.map((x) => x.id)), "ids are stable: reading the same statement again gives the same five ids");
ok(!JSON.stringify(e).includes("1111") && !JSON.stringify(e).includes("RD0000"), "no card digits and no bank reference are written into an entry");
e = statementEntries("abb", r.rows, { known, account: "a_card01", suggest: (m, type) => (m === "BUS 594" ? { category: "travel", subcategory: "Travel Transport" } : null) });
ok(e[3].category === "travel" && e[3].subcategory === "Travel Transport" && e[2].category === "food" && e.every((x) => x.account === "a_card01"), "the person's own history for a merchant wins over the bank's code; the chosen account is set on every entry");
e = statementEntries("unibank", u.rows, { known });
ok(eq(e.map((x) => [x.category, x.subcategory]), [["transport", "Metro"], ["income", ""], ["food", "Restaurants"], ["finance", "Transfers"], ["income", ""], ["other", ""], ["finance", "Money sent to people"]]), "Unibank rows: Metro and a cafe by their words; the wallet pair is a move between own accounts (Transfers), 'to <person>' is money sent to people (Run 58); an unknown shop stays Other", e.map((x) => [x.category, x.subcategory]));
ok(eq(e.map((x) => x._st.pending), [false, false, true, false, false, false, false]) && eq(e.map((x) => x._st.kind), ["payment", "payment", "payment", "own", "own", "payment", "transfer"]), "each entry says whether it is pending and whether it is a transfer to someone or a move between own accounts (Run 58), so the sheet can offer them as separate choices");
// Two identical rows in one statement (two rides, same minute) are two entries with different ids; a third reading gives the same two ids.
const twice = [{ date: "2026-11-01", time: "08:00", type: "expense", cents: 60, desc: "METRO", merchant: "METRO", balance: null, ref: "", mcc: "", cur: "AZN", orig: "", pending: false, kind: "payment" }];
twice.push({ ...twice[0] });
e = statementEntries("unibank", twice);
ok(e.length === 2 && e[0].id !== e[1].id && e[1].id === e[0].id + "_1" && statementKey("unibank", twice[0]) === statementKey("unibank", twice[1]) && eq(statementEntries("unibank", twice).map((x) => x.id), e.map((x) => x.id)), "two identical rows stay two entries (ids X and X_1), the same every time");
ok(statementKey("abb", r.rows[0]) === "abb|ref|RD00000000005" && statementEntries("abb", [null, { cents: 0, date: "2026-01-01" }, { cents: 5, date: "" }]).length === 0, "a row with a bank reference is identified by it; empty or zero rows give no entry");
ok(eq(statementCheck([]), { has: false, ok: null, breaks: 0, order: "" }), "no rows: no balance check");

section("R52-7. Excel files are read without a library, also damaged ones");
const enc = (s) => Buffer.from(s, "utf8");
// A small zip writer for the test: 'stored' or 'deflated' parts; one part may carry a wrong size on purpose (as in a real bank file).
function zip(parts) {
  const chunks = [], central = []; let off = 0;
  for (const p of parts) {
    const name = enc(p.name), raw = enc(p.text || ""), data = p.deflate ? zlib.deflateRawSync(raw) : raw, csize = p.badSize || data.length;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(p.deflate ? 8 : 0, 8); lh.writeUInt32LE(csize, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(p.deflate ? 8 : 0, 10); ch.writeUInt32LE(csize, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    chunks.push(lh, name, data); central.push(ch, name); off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(parts.length, 8); end.writeUInt16LE(parts.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...chunks, cd, end]);
}
const shared = `<?xml version="1.0"?><sst><si><t>Date</t></si><si><t>Description</t></si><si><t>Debit</t></si><si><t>Credit</t></si><si><t>Balance</t></si><si><t>Shop &amp; Co</t></si><si><r><t>Sal</t></r><r><t>ary</t></r></si><si><t>2026-10-02</t></si><si><t>1000.00</t></si><si><t>1087.50</t></si></sst>`;
// Row 3 uses a real Excel date (46296 = 1 Oct 2026) and real numbers; row 4 uses texts, as the real bank file does. Column A is empty.
const sheet = `<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="B1" t="inlineStr"><is><t>Statement</t></is></c></row>
<row r="2"><c r="B2" t="s"><v>0</v></c><c r="C2" t="s"><v>1</v></c><c r="D2" t="s"><v>2</v></c><c r="E2" t="s"><v>3</v></c><c r="F2" t="s"><v>4</v></c></row>
<row r="3"><c r="B3"><v>46296</v></c><c r="C3" t="s"><v>5</v></c><c r="D3"><v>12.5</v></c><c r="F3"><v>87.5</v></c></row>
<row r="4"><c r="B4" t="s"><v>7</v></c><c r="C4" t="s"><v>6</v></c><c r="E4" t="s"><v>8</v></c><c r="F4" t="s"><v>9</v></c></row></sheetData></worksheet>`;
const good = zip([{ name: "[Content_Types].xml", text: "<Types/>" }, { name: "xl/sharedStrings.xml", text: shared, deflate: true }, { name: "xl/worksheets/sheet1.xml", text: sheet, deflate: true }]);
let grid = await xlsxGrid(good);
ok(eq(grid, [["", "Statement"], ["", "Date", "Description", "Debit", "Credit", "Balance"], ["", "2026-10-01", "Shop & Co", "12.5", "", "87.5"], ["", "2026-10-02", "Salary", "", "1000.00", "1087.50"]]), "cells are read in their columns; shared, inline and split texts; '&amp;' becomes '&'; a real Excel date 46296 becomes 2026-10-01", grid);
let xs = readStatement(linesFromGrid(grid));
ok(eq(xs.rows.map((x) => [x.date, x.type, x.cents, x.balance, x.merchant]), [["2026-10-01", "expense", 1250, 8750, "Shop & Co"], ["2026-10-02", "income", 100000, 108750, "Salary"]]) && xs.check.ok, "and the grid reads as a statement: 12.50 out, 1 000.00 in, balance confirmed");
const damaged = zip([{ name: "xl/media/image1.png", text: "not really a picture", badSize: 169478669 }, { name: "xl/sharedStrings.xml", text: shared }, { name: "xl/worksheets/sheet1.xml", text: sheet }]);
grid = await xlsxGrid(damaged);
ok(grid.length === 4 && grid[3][2] === "Salary", "a file whose embedded picture has an impossible size still reads (the picture is never opened); uncompressed parts work too");
const parts = await zipEntries(good, (n) => n.endsWith(".xml"));
ok(Object.keys(parts).length === 3 && parts["[Content_Types].xml"] === "<Types/>", "the zip reader hands back exactly the parts that were asked for");
let threw = ""; try { await xlsxGrid(enc("this is not a zip file at all, just some text that is long enough")); } catch (err) { threw = String(err.message); }
let threw2 = ""; try { await xlsxGrid(zip([{ name: "word/document.xml", text: "<w/>" }])); } catch (err) { threw2 = String(err.message); }
ok(threw === "zip" && threw2 === "sheet", "not a zip, or a zip without a sheet (a Word file): a clear failure, no half result");
ok(eq(sheetGrid("", ""), []) && eq(sheetGrid(null, null), []), "an empty sheet gives an empty grid");
finish("run52statement");
