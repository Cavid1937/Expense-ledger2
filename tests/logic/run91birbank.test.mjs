// Run 91: PDF statements with a heading row (the Birbank layout). All data here is invented.
// Layout: Date | Money out | Money in | Balance | Description | Last 4 card digits; newest row first; the empty side prints "0";
// descriptions wrap onto lines above and below the dated line, and can continue across a page break.
import { ok, section, finish, eq as same } from "./lib.mjs";
import { readStatement, statementEntries, describeRow } from "../../statement.js";
// lib's eq only compares; this one records a check and shows what came out when it fails
const eq = (got, want, msg) => ok(same(got, want), msg, { got, want });

const P = (page, y, pairs) => ({ page, y, cells: pairs.map((p) => p[1]), xs: pairs.map((p) => p[0]) });
const X = { date: 90, out: 191, in: 270, bal: 349, desc: 427, card: 635 };
const row = (page, y, date, out, inn, bal, desc) => P(page, y, [[X.date, date], [X.out, out], [X.in, inn], [X.bal, bal], ...(desc ? [[X.desc, desc]] : []), [X.card, "***1111"]]);
const D = (page, y, text) => P(page, y, [[X.desc, text]]);

const lines = [
  P(1, 1180, [[60, "Kartın nömrəsi"], [180, "40001234****1111"], [300, "Cari balans"], [450, "52.50"]]),
  P(1, 1160, [[60, "Hesabın valyutası"], [180, "AZN"], [300, "Dövrün əvvəlinə balans"], [450, "10.00"]]),
  P(1, 1140, [[300, "Dövr üzrə mədaxil məbləği"], [450, "100.00"]]),
  P(1, 1120, [[300, "Dövr üzrə məxaric məbləği"], [450, "60.00"]]),
  P(1, 1100, [[300, "Dövrün sonuna balans"], [450, "50.00"]]),
  P(1, 1080, [[300, "Bloklanmış məxaric məbləği"], [450, "0"]]),
  P(1, 1050, [[X.date, "Tarix"], [X.out, "Məxaric"], [X.in, "Mədaxil"], [X.bal, "Balans"], [X.desc, "Təsvir"], [X.card, "Kartın son 4 rəqəmi"]]),
  // newest first. Balance chain: 10.00 +100.00 -20.00 -0.60 -3.40 -15.00 -1.00 = 70.00 ... rows below are built to chain exactly.
  D(1, 1007, "BirBank5/www.birbank.az,BAKU,TEST KUCHESI 1,BAKI,AZ/"),
  row(1, 1000, "2026-03-09", "20.00", "0", "70.00", ""),
  D(1, 993, "40001234****2222|31"),
  row(1, 958, "2026-03-08", "0.60", "0", "90.00", "BKMR00001/TP METRO,Test station,BAKU,AZ/P 10"),
  row(1, 916, "2026-03-07", "3.40", "0", "90.60", "R0000001/ERZAQ MAGAZASI,TEST CITY,TESTKEND,AZ/P 10"),
  D(1, 888, "A0100001/KAPS,TEST RAY. TEST PR.1"),
  row(1, 874, "2026-03-06", "15.00", "0", "94.00", ""),
  D(1, 861, "TEST MARKET,BAKI,AZ/A 10"),
  D(1, 840, "BirBankMSAZ/BirBankMSAZ,BAKU CITY,BAKI,AZ/; VID=1234;VENDORVAL=+994500000000;P=1-"),
  row(1, 833, "2026-03-05", "1.00", "0", "109.00", ""),
  D(1, 826, "0000000000; CMS_ID=12345678;"),
  // this row's description starts at the foot of page 1 and continues at the head of page 2
  row(1, 791, "2026-03-04", "0", "100.00", "110.00", "IPSCARDTOPUP_EXT/IPSCARDTOPUP_EXT,BAKU,AZ"),
  P(1, 700, [[80, "Bank employee signature line"]]),
  D(2, 1112, "/P 33"),
  row(2, 1070, "2026-03-03", "0", "0", "10.00", "CHECK/ZERO AMOUNT,BAKU,AZ/P 10"),
];

const res = readStatement(lines);

section("heading columns: every row is read, types come from the columns");
eq(res.bank, "birbank", "a statement whose rows name Birbank is recognised as Birbank");
eq(res.rows.length, 6, "six money rows (the 0.00 row moves nothing and is left out)");
eq(res.rows.map((r) => r.type).join(","), "expense,expense,expense,expense,expense,income", "money in / money out from the column, including the oldest row");
eq(res.rows.map((r) => r.cents).join(","), "2000,60,340,1500,100,10000", "amounts in cents");
eq(res.rows[0].date, "2026-03-09", "date read from the date column");
ok(res.check.has && res.check.ok, "the running balance confirms every row");
ok(!res.problems.includes("first"), "no guessed first row");

section("descriptions: wrapped lines joined, private numbers removed, card column ignored");
eq(res.rows[0].merchant, "Birbank transfer", "card-to-card transfer through the Birbank app");
eq(res.rows[1].merchant, "TP METRO", "the merchant name between the code and the address");
eq(res.rows[2].merchant, "ERZAQ MAGAZASI", "a shop outside Baku");
eq(res.rows[2].city, "TESTKEND", "the city before ',AZ' is kept");
eq(res.rows[1].city, "", "Baku is the default and is not repeated");
eq(res.rows[3].merchant, "ATM", "a three-line description ending in '/A 10' is a cash machine");
eq(res.rows[3].kind, "cash", "cash machine rows are cash withdrawals");
eq(res.rows[4].merchant, "Payment service 1234", "a payment known only by its service number");
ok(!/994500000000|0000000000|12345678/.test(res.rows[4].desc), "phone number, account code and system id are not kept");
ok(res.rows.every((r) => !/\*\*\*1111|40001234/.test(r.desc)), "the card-digits column and card numbers are not in any description");
eq(res.rows[5].merchant, "IPS transfer", "a description cut by a page break is joined back");
ok(res.rows.every((r) => !/signature/i.test(r.desc)), "the signature line at the foot of the page is ignored");

section("the bank's own summary is read and compared");
ok(res.summary, "summary found above the table");
eq(res.summary && res.summary.credit, 10000, "money in for the period");
eq(res.summary && res.summary.debit, 6000, "money out for the period");
eq(res.summary && res.summary.rowsDebit, 4000, "the rows add up to less spending than the summary says");
eq(res.summary && res.summary.opening, 1000, "opening balance");
eq(res.summary && res.summary.closing, 5000, "closing balance");
ok(res.summary && res.summary.blocked === undefined, "the 'blocked' line is not taken as a total");

section("entries: categories follow what the row is");
const ents = statementEntries(res.bank, res.rows, {});
eq(ents[0].category, "transfers", "app transfer out is a transfer, not spending");
eq(ents[1].category + "/" + ents[1].subcategory, "transport/Metro", "metro fare");
eq(ents[2].category + "/" + ents[2].subcategory, "food/Groceries", "ərzaq mağazası is groceries");
eq(ents[2].note, "TESTKEND", "the city goes in the note");
eq(ents[3].category + "/" + ents[3].subcategory, "finance/Cash withdrawal", "cash machine");
eq(ents[4].category, "other", "an unknown service is not guessed");
eq(ents[5].category, "transferin", "instant transfer in is not earnings");
const again = statementEntries(res.bank, readStatement(lines).rows, {});
eq(again.map((e) => e.id).join(","), ents.map((e) => e.id).join(","), "the same statement gives the same ids (a second import adds nothing)");

section("describeRow on its own");
eq(describeRow("BIRBANK_BK/Birbank, BakıKart,BAKU,AZ/; VID=1014;", "expense").merchant, "BakıKart", "a BakıKart top-up");
ok(!/birbank/i.test(describeRow("BIRBANK_BK/Birbank, BakıKart,BAKU,AZ/;", "expense").desc), "a BakıKart top-up is not mistaken for an app transfer");
eq(describeRow("BirBank50/BirBank50,BAKU,AZ/", "income").merchant, "Birbank incoming", "money in from another Birbank card");
eq(describeRow("MPYKIOSK/KAPS,ONLINE KIOSK,BAKI,AZ/1111;CASH_IN_CHARGE=0.0", "income").merchant, "Cash-in kiosk", "cash paid in at a kiosk");
eq(describeRow("2222222/P2P SEND- LEO APP,BAKU,AZ/P 33", "income").kind, "transfer", "a person-to-person app transfer");
eq(describeRow("plain words", "expense").merchant, "plain words", "anything else is kept as it is");

section("a table without a heading still goes the old way");
const noHead = [P(1, 500, [[90, "2026-03-02"], [191, "5.00 AZN"], [427, "SHOP"]])];
ok(readStatement(noHead).bank !== "birbank", "no heading: not read as Birbank");
finish("run91birbank");
