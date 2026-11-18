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

section("R108-N3. An amount with nothing else is not enough");
ok(readNotification("70 000 AZN", NOW) === null, "a bare amount is not an entry");
ok(readNotification("Sizin üçün 1 500 AZN", NOW) === null, "an amount with ordinary words is not an entry");
finish("run108notices");
