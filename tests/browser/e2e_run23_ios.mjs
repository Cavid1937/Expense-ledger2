// Run 23: the iPhone data-removal note. Shown once on Home to an iPhone in a browser tab; not on other devices; not to an installed Home Screen app;
// dismissal is remembered under its own key and the ledger is never touched. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const KEY = "expense_ledger_v5", NOTE = "expense_ledger_v5__iosnote";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const seed = (language) => baseSeed({ language, transactions: [tx({ merchant: "Bravo", amount: 12, category: "food" })] });
const note = (page) => page.evaluate(() => { const e = document.querySelector('[data-section="ios-note"]'); return e ? e.innerText : null; });
const asIphone = async (page, standalone) => {
  await page.setUserAgent(IPHONE);
  await page.evaluateOnNewDocument((s) => { if (s) Object.defineProperty(navigator, "standalone", { get: () => true }); }, !!standalone);
  await page.evaluate((k) => localStorage.removeItem(k), NOTE);
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
};

section("R23-IOS1. Desktop browser: no note");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  ok((await note(page)) === null, "a normal (non-iPhone) browser shows nothing");
  await page.close();
}
section("R23-IOS2. iPhone in a browser tab: note, dismiss, remembered");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  const ledger = await page.evaluate((k) => localStorage.getItem(k), KEY);
  await asIphone(page, false);
  const n = await note(page);
  ok(!!n && /Safari can erase/.test(n) && /Home Screen/.test(n) && /backup/i.test(n), "the note explains the risk, the Home Screen fix and the backup", n);
  await page.evaluate(() => document.querySelector('[data-section="ios-note"] .backup-dismiss').click()); await wait(250);
  ok((await note(page)) === null, "dismissing removes it");
  ok((await page.evaluate((k) => localStorage.getItem(k), NOTE)) === "1", "the choice is stored under its own key");
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
  ok((await note(page)) === null, "it stays away after closing and reopening");
  ok((await page.evaluate((k) => localStorage.getItem(k), KEY)) === ledger, "the ledger is byte-for-byte unchanged");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.evaluate((k) => localStorage.removeItem(k), NOTE); await page.close();
}
section("R23-IOS3. iPhone with the app installed to the Home Screen: no note");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  await asIphone(page, true);
  ok((await note(page)) === null, "an installed Home Screen app is exempt from the cleanup and is not told");
  await page.close();
}
section("R23-IOS4. Wording in az and ru");
for (const [l, re] of [["az", /Ana ekrana/], ["ru", /экран «Домой»/]]) {
  const page = await openPage(browser, { seed: seed(l) }); await settle(page);
  await asIphone(page, false);
  const n = await note(page);
  ok(!!n && re.test(n), `${l}: note shown`, n);
  await page.evaluate((k) => localStorage.removeItem(k), NOTE); await page.close();
}
await finish("e2e_run23_ios", browser);
