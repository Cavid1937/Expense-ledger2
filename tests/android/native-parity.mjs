// Release 108 device-verification pass (18 Nov). Run: node tests/android/native-parity.mjs (needs the capacitor checkout and the JDK of Android Studio; CAP_DIR overrides the path).
// Parity: the Android listener's isPayment (exact source text from the capacitor repo) vs the app's readNotification on the same notices.
// The native rule is the first gate (it drops a notice for good), so it must never drop a notice the app would read as a payment.
import fs from "fs"; import path from "path"; import os from "os"; import { execFileSync } from "child_process"; import { pathToFileURL } from "url";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "el-native-"));
const SRC = process.env.CAP_DIR ? path.join(process.env.CAP_DIR, "android/app/src/main/java/com/example/expenseledger/spike/BankNotificationListener.java") : "C:/Users/cavid/OneDrive/Documents/GitHub/Expense-ledger2-capacitor/android/app/src/main/java/com/example/expenseledger/spike/BankNotificationListener.java";
const APP = new URL("../../notify.js", import.meta.url).href;
const JDK = "C:/Program Files/Android/Android Studio/jbr/bin/";
const src = fs.readFileSync(SRC, "utf8");
const a = src.indexOf("    static final int UF"), b = src.indexOf("    // Run 96: catch-up");
const block = src.slice(a, b);
const money = src.match(/    static final Pattern MONEY = .*\n/)[0];
fs.writeFileSync(path.join(dir, "Harness.java"), `import java.util.regex.Pattern; import java.nio.file.*; import java.nio.charset.StandardCharsets;
public class Harness {
${money}${block}
  public static void main(String[] x) throws Exception {
    for (String l : Files.readAllLines(Paths.get(x[0]), StandardCharsets.UTF_8)) { String t = l.replace("\\\\n", "\\n"); System.out.println((MONEY.matcher(t).find() && isPayment(t)) ? "1" : "0"); }
  }
}
`);
const { readNotification } = await import(APP);
const NOW = new Date(2026, 10, 18, 10, 0);
// Invented texts in the layouts of real notices (no real card digits, names or balances).
const cases = [
  // adverts: both must drop
  ["ad", "İndi kredit UBank-da!\n70 000 AZN-dək nağd kredit, onlayn əldə et"], ["ad", "İndi kredit UBank-da!\n70 000 AZN nağd kredit"],
  ["ad", "Kampaniya! 50 AZN bonus qazan"], ["ad", "Up to 5 000 AZN credit limit, apply now"], ["ad", "Кредит до 50 000 ₼ онлайн, оформите сегодня"],
  ["ad", "Bravo: 20% endirim 30 AZN-dən yuxarı alışlara"], ["ad", "Ödəniş et, 10 AZN qazan!"], ["ad", "Your loan offer: 3 000 AZN"],
  ["ad", "70 000 AZN"], ["ad", "Sizin üçün 1 500 AZN"], ["ad", "Ödəniş et, 20% endirim qazan: 30 AZN"], ["ad", "Акция! Получите 10 ₼ кэшбэк"],
  // payments: both must keep
  ["pay", "AZN 0.90 with DS40 ••2416"], ["pay", "Google Wallet\n₼4.20 with Visa •••• 1234\nKAFE ARAZ"],
  ["pay", "💳 Payment: -0.90 ₼\nBAKU METRO\nCard: **4321\nBalance: 3.26 ₼"], ["pay", "🛒 12.50 ₼\nBravo Market\nBalans 70.30 ₼"],
  ["pay", "Покупка 12,50 ₼ Bravo"], ["pay", "Birbank: Ödəniş 7,40 AZN, OBA MARKET"], ["pay", "Leobank\nKöçürmə: -50.00 ₼\nAysel"],
  ["pay", "Mədaxil +100.00 AZN\nKart **1234"], ["pay", "Payment: -3.00₼\nCashback 5%\nCard: **5555 Balance: 9.00₼"],
  ["pay", "Ödəniş 7,40 AZN, OBA MARKET, 1% keşbek"], ["pay", "Оплата 5,00 ₼ Bolt, кэшбэк 2%"],
  ["pay", "💸 Transfer: -4.00₼\nCard: **9999\nBalance: 4.46₼"], ["pay", "💸 Перевод: -4.00₼\nКарта: **9999\nБаланс: 4.46₼"],
  ["pay", "Оплата 12.50 AZN\nKAFE TEST\nКарта **1111"], ["pay", "Зачисление 50.00 AZN\nКарта **1111"], ["pay", "Ödəniş 3.20 ₼\nMARKET X\nKart: **1111"],
  ["pay", "Доступный лимит: 500.00 AZN\nПокупка 7.00 AZN\nКарта **1111"], ["pay", "💳 Payment: 0.60 ₼\nBus 594 Card: **2416 Balance: 10.86₼"], ["none", "Bus 594 Card: **2416 Balance: 10.86₼"],
  ["pay", "Card to card\n-20.00 ₼\nKartdan karta"], ["pay", "Geri qaytarma +5.00 AZN\nKart **1111"], ["pay", "Возврат 5,00 ₼\nКарта **1111"],
  ["pay", "-15.00 AZN\nWOLT"], ["pay", "+250.00 ₼\nMaaş"], ["pay", "Nağdlaşdırma 40 AZN ATM Bakı\nKart **1111"],
];
fs.writeFileSync(path.join(dir, "cases.txt"), cases.map(([, t]) => t.replace(/\n/g, "\\n")).join("\n") + "\n", "utf8");
execFileSync(JDK + "javac.exe", ["-encoding", "UTF-8", "-d", dir, path.join(dir, "Harness.java")]);
const nat = execFileSync(JDK + "java.exe", ["-Dfile.encoding=UTF-8", "-cp", dir, "Harness", path.join(dir, "cases.txt")]).toString().trim().split(/\r?\n/);
let bad = 0, n = 0;
cases.forEach(([want, t], i) => {
  const app = readNotification(t, NOW) !== null, native = nat[i] === "1";
  // "none": only a balance, no amount paid - the app must not invent an entry (the native gate may keep it; the app decides)
  const okNative = want === "pay" ? native : want === "none" ? true : !native, okApp = want === "pay" ? app : !app, gateSafe = !(app && !native);
  n++; if (!okNative || !okApp || !gateSafe) { bad++; console.log("FAIL", want, JSON.stringify(t), "native=" + native, "app=" + app); }
});
console.log(`native-parity: ${n - bad}/${n} passed (native rule from ${path.basename(SRC)}, app rule from notify.js)`); fs.rmSync(dir, { recursive: true, force: true }); process.exit(bad ? 1 : 0);
