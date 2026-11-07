// Run 33 (APK level): text shared into the app becomes a SUGGESTION for the add form. All messages below are invented for this test; real bank wording has not been sampled
// yet (the owner's examples are needed), so the parser is deliberately cautious: unsure → it says so, no currency → no amount. Expected values are written by hand.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { parseSharedText: P, shareAmount: A } = H;
reset();
const NOW = new Date(2026, 9, 13, 12, 0, 0);
section("R33-P1. Reading one amount");
const cases = [["12.50", 12.5], ["12,50", 12.5], ["1,234.56", 1234.56], ["1.234,56", 1234.56], ["1 234,56", 1234.56], ["1 234,56", 1234.56], ["1,234", 1234], ["12.500", 12500], ["7", 7], ["0.00", null], ["abc", null], ["", null], ["-5", null]];
const badA = cases.filter(([s, v]) => A(s) !== v).map(([s, v]) => [s, v, A(s)]);
ok(badA.length === 0, "12.50 / 12,50 / 1,234.56 / 1.234,56 / 1 234,56 / 1,234 / 12.500 / 7 read as 12.5, 12.5, 1234.56, 1234.56, 1234.56, 1234, 12500, 7; zero, text, empty and negative give nothing", badA);

section("R33-P2. Typical shapes (invented messages)");
let r = P("Purchase 12.50 AZN at Bravo Supermarket. Balance: 540.00 AZN", NOW);
ok(r.found && r.amount === "12.5" && r.type === "expense" && r.merchant === "Bravo Supermarket" && !r.unsure, "English purchase: 12.5, expense, 'Bravo Supermarket'; the balance amount is not taken", r);
r = P("Alış: 25.30 AZN. Mağaza: Araz Market. Balans: 100.00 AZN", NOW);
ok(r.found && r.amount === "25.3" && r.type === "expense" && r.merchant === "Araz Market" && !r.unsure, "Azerbaijani purchase: 25.3, expense, merchant stops at the full stop", r);
r = P("Покупка 1 234,56 RUB. Место: Магнит", NOW);
ok(r.amount === "1234.56" && r.type === "expense" && r.merchant === "Магнит", "Russian purchase with a thousands space and comma: 1234.56, 'Магнит'", r);
r = P("Maaş mədaxil: 2450.75 AZN", NOW);
ok(r.amount === "2450.75" && r.type === "income" && !r.unsure, "salary message is income, 2450.75", r);
r = P("AZN 7.20 terminal: Kafe 28", NOW);
ok(r.amount === "7.2", "currency before the number: 7.2", r);
r = P("7,20 man. alış", NOW);
ok(r.amount === "7.2" && r.type === "expense", "'man.' and a decimal comma: 7.2", r);
r = P("Пополнение счёта 300 ₼", NOW);
ok(r.amount === "300" && r.type === "income", "Russian top-up with ₼ is income, 300", r);

section("R33-P3. When it is not sure it says so (and never invents)");
r = P("Hello, see you at 5", NOW);
ok(!r.found && r.amount === "" && r.type === "expense" && r.merchant === "", "no amount in the text: found=false, empty amount", r);
r = P("Purchase 12.50 at Bravo", NOW);
ok(!r.found && r.amount === "", "a number WITHOUT a currency is not taken as an amount (too easy to take a card digit or a time)", r);
r = P("Payment 10 AZN fee 0.50 AZN", NOW);
ok(r.amount === "10" && r.unsure, "two different amounts: the first is suggested and 'unsure' is set", r);
r = P("Refund 15 AZN, purchase cancelled", NOW);
ok(r.amount === "15" && r.type === "expense" && r.unsure, "income and expense words together: expense (the safer default) and 'unsure'", r);
r = P("Balance: 540.00 AZN", NOW);
ok(!r.found, "a message that only states a balance gives no amount", r);
ok(!P(null).found && !P(undefined).found && !P(42).found && !P("").found, "null, undefined, a number and empty text do not throw and find nothing");
ok(P("x".repeat(100000) + " 5 AZN").found === false, "an over-long text is cut at 2,000 characters before reading (no slow-down, nothing found past the cut)");

section("R33-P4. Dates");
ok(P("12.10.2026 Purchase 5 AZN", NOW).date === "2026-10-12", "12.10.2026 → 2026-10-12 (day first)");
ok(P("01/10/26 alış 5 AZN", NOW).date === "2026-10-01", "01/10/26 → 2026-10-01 (two-digit year)");
ok(P("25.12.2026 alış 5 AZN", NOW).date === "", "a date in the future is ignored (the form then uses today)");
ok(P("31.02.2026 alış 5 AZN", NOW).date === "", "an impossible date (31 February) is ignored");
ok(P("alış 5 AZN", NOW).date === "", "no date: empty");

section("R33-P5. What is NOT kept");
const sensitive = JSON.stringify(P("Card *1234 purchase 5 AZN at Shop. Balance 999.99 AZN. Ref 7788123", NOW));
ok(!sensitive.includes("1234") && !sensitive.includes("999.99") && !sensitive.includes("7788123") && !("note" in P("x")), "card digits, the balance and reference numbers do not appear in the result, and there is no note field (the message text is never stored)", sensitive);
finish("run33share");
