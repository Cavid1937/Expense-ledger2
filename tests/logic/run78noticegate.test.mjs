// Run 78: the Android listener (BankNotificationListener.java) keeps a notice only if its MONEY pattern finds an amount next to a currency.
// That pattern is a gate in front of the app's reader (notify.js): anything it drops never reaches the app. This copy of the Java pattern
// (Java's \s has no no-break space; the listener turns such spaces into plain ones first) must let through every notice the reader understands.
// If the Java pattern changes, change JAVA_MONEY here too. Synthetic texts only.
import { ok, section, finish } from "./lib.mjs";
import { readNotification } from "../../notify.js";
const JAVA_MONEY = /(\d[\d .,]*[ \t\n\x0B\f\r]?(₼|AZN|USD|EUR|RUB|\$|€))|((₼|AZN|USD|EUR|RUB|\$|€)[ \t\n\x0B\f\r]?[-−]?\d)/i;
const bodyOf = (s) => s.replace(/[    ]/g, " ").trim();
const samples = [
  "💳 Payment: -0.90 ₼\nBAKU METRO\nCard: **4321\nBalance: 3.26 ₼",
  "🛒 12.50 ₼\nBravo Market\nBalans 70.30 ₼",
  "ABB\nÖdəniş: -12.50 AZN\nBravo",
  "Покупка 12,50 ₼ Bravo",
  "₼ 12.50 Bolt",
  "Payment 12.50 Azn KAFE",
  "Mədaxil +100.00 AZN\nKart **1234",
  "Birbank: Ödəniş 7,40 AZN, OBA MARKET",
  "Google Wallet\n₼4.20 with Visa •••• 1234\nKAFE ARAZ",
  "Leobank\nKöçürmə: -50.00 ₼\nAysel",
];
section("R78-G1. The listener's first filter lets every readable bank notice through");
for (const s of samples) {
  const r = readNotification(s);
  if (!r || !(r.cents > 0)) { ok(true, "not a reader sample (skipped): " + JSON.stringify(s)); continue; }
  ok(JAVA_MONEY.test(bodyOf(s)), "kept by the listener: " + JSON.stringify(s.split("\n")[0]));
}
section("R78-G2. Texts without a currency amount are dropped");
for (const s of ["Your code is 4521", "Meeting at 10:30", "Battery 15%", "Order #12345 shipped"]) ok(!JAVA_MONEY.test(bodyOf(s)), "dropped: " + s);
finish("run78noticegate");
