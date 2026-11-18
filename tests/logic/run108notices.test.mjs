// Run 108 (owner, 18 Nov): a bank advert ("İndi kredit UBank-da!" with a 70 000 AZN offer) was read as a 70,000 expense. A notice now counts
// only with proof that money moved. Every text below is invented; the adverts copy the usual shape of bank offers, not a real message.
import { ok, section, finish } from "./lib.mjs";
import { readNotification, readNoticeItems } from "../../notify.js";
const NOW = new Date(2026, 10, 18, 10, 0);

section("R108-N1. Adverts and offers are not payments");
const ads = [
  "İndi kredit UBank-da!\n70 000 AZN-dək nağd kredit, onlayn əldə et",
  "İndi kredit UBank-da!\n70 000 AZN nağd kredit",
  "Kampaniya! 50 AZN bonus qazan",
  "Up to 5 000 AZN credit limit, apply now",
  "Кредит до 50 000 ₼ онлайн, оформите сегодня",
  "Bravo: 20% endirim 30 AZN-dən yuxarı alışlara",
  "Ödəniş et, 10 AZN qazan!",
  "Your loan offer: 3 000 AZN",
];
for (const s of ads) ok(readNotification(s, NOW) === null, "not an entry: " + JSON.stringify(s.split("\n")[0]));
ok(readNoticeItems([{ text: ads[0], time: NOW.getTime() }]).rows.length === 0, "the phone queue drops the advert too");

section("R108-N2. Real payment layouts still read (card mask, balance, sign or payment word)");
const real = [
  ["AZN 0.90 with DS40 ••2416", 90],
  ["Google Wallet\n₼4.20 with Visa •••• 1234\nKAFE ARAZ", 420],
  ["💳 Payment: -0.90 ₼\nBAKU METRO\nCard: **4321\nBalance: 3.26 ₼", 90],
  ["🛒 12.50 ₼\nBravo Market\nBalans 70.30 ₼", 1250],
  ["Покупка 12,50 ₼ Bravo", 1250],
  ["Birbank: Ödəniş 7,40 AZN, OBA MARKET", 740],
  ["Leobank\nKöçürmə: -50.00 ₼\nAysel", 5000],
  ["Mədaxil +100.00 AZN\nKart **1234", 10000],
  ["Payment: -3.00₼\nCashback 5%\nCard: **5555 Balance: 9.00₼", 300],
];
for (const [s, c] of real) { const r = readNotification(s, NOW); ok(r && r.cents === c, "read: " + JSON.stringify(s.split("\n")[0]), r); }

section("R108-N2b. A payment's own cashback percent does not make it an advert");
{ const r = readNotification("Ödəniş 7,40 AZN, OBA MARKET, 1% keşbek", NOW); ok(r && r.cents === 740, "payment word + 1% keşbek: still read", r); }
{ const r = readNotification("Оплата 5,00 ₼ Bolt, кэшбэк 2%", NOW); ok(r && r.cents === 500, "Russian payment + кэшбэк 2%: still read", r); }
ok(readNotification("Ödəniş et, 20% endirim qazan: 30 AZN", NOW) === null, "an offer with a percent and no cashback is still dropped");

section("R108-N3. An amount with nothing else is not enough");
ok(readNotification("70 000 AZN", NOW) === null, "a bare amount is not an entry");
ok(readNotification("Sizin üçün 1 500 AZN", NOW) === null, "an amount with ordinary words is not an entry");

section("R108-N4. az / ru words are seen (JavaScript's \\b knows only Latin letters; on the old reader all of these failed)");
{ const r = readNotification("💸 Transfer: -4.00₼\nCard: **9999\nBalance: 4.46₼", NOW); ok(r && r.cents === 400 && r.type === "expense" && r.kind === "transfer" && r.balance === 446, "the owner's ABB transfer layout (invented digits): -4.00, a transfer, balance read", r); }
{ const r = readNotification("💸 Перевод: -4.00₼\nКарта: **9999\nБаланс: 4.46₼", NOW); ok(r && r.balance === 446, "Russian Баланс: the balance is read", r); }
{ const r = readNotification("Оплата 12.50 AZN\nKAFE TEST\nКарта **1111", NOW); ok(r && r.type === "expense", "Оплата with no sign: money out", r); }
{ const r = readNotification("Зачисление 50.00 AZN\nКарта **1111", NOW); ok(r && r.type === "income", "Зачисление with no sign: money in", r); }
{ const r = readNotification("Ödəniş 3.20 ₼\nMARKET X\nKart: **1111", NOW); ok(r && r.type === "expense", "Ödəniş with no sign: money out", r); }
{ const r = readNotification("Доступный лимит: 500.00 AZN\nПокупка 7.00 AZN\nКарта **1111", NOW); ok(r && r.cents === 700 && r.type === "expense", "a Russian limit line is skipped: 7.00, not the 500 limit", r); }
finish("run108notices");
