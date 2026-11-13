// Run 68 in the real bundled app: pasting bank notifications into the Import / Export paste box. The texts copy only the layout of real
// notifications; every place and amount is invented. Synthetic data only.
import { launch, openPage, openData, state, ok, section, finish, baseSeed, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const paste = async (page, text) => {
  if (!(await page.$("#st-paste"))) { await page.evaluate(() => document.querySelector('[data-section="io-paste-open"]').click()); await page.waitForSelector("#st-paste"); }
  await page.$eval("#st-paste", (el, v) => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, text);
  await page.evaluate(() => document.querySelector('[data-section="io-paste-go"]').click()); await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 8000 }); await wait(400);
};
const sheet = (page) => page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");

section("R68-B1. The bank's and the wallet's message about one payment become one entry");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await openData(page);
  await paste(page, "💳 Payment: -0.90 ₼\nBAKU METRO 8 NOYABR\nCard: **4321\nBalance: 3.26 ₼\n\nBAKU METRO 8 NOYAB\nAZN0.90 with My Card ..4321");
  const sh = await sheet(page);
  ok(/Bank notifications/.test(sh) && /1 entr(y|ies) ready/.test(sh) && /BAKU METRO/.test(sh), "the sheet says 'Bank notifications' with ONE entry ready", sh.slice(0, 300));
  ok(!/4321/.test(sh), "no card digits are shown");
  await page.evaluate(() => document.querySelector('[data-section="import-go"]').click()); await wait(700);
  const st = await state(page), e = st.transactions[0];
  ok(st.transactions.length === 1 && e.amount === 0.9 && e.type === "expense" && e.date === TODAY && /BAKU METRO/.test(e.merchant) && !JSON.stringify(e).includes("4321") && !JSON.stringify(e).includes("3.26"), "added: 0.90 out today at BAKU METRO; neither card digits nor the bank balance are stored", e);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R68-B2. When the direction cannot be proved, the review says so");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await openData(page);
  await paste(page, "🛒 5.00 ₼\nShop A");
  const sh = await sheet(page);
  ok(/Bank notifications/.test(sh) && /money in|money out|minus/i.test((await page.evaluate(() => (document.querySelector('[data-st="sign"]') || {}).innerText || ""))), "an amount without a sign or balance is flagged in the review (not silently guessed)", sh.slice(0, 300));
  await page.close();
}

section("R68-B3. A pasted statement is still read as a statement");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await openData(page);
  await paste(page, "Date\tDetails\tDebit\tCredit\tBalance\n04.10.2026\tPharmacy Plus\t9.00 AZN\t-\t478.50 AZN\n05.10.2026\tGift from aunt\t-\t100.00 AZN\t578.50 AZN");
  const sh = await sheet(page);
  ok(/Bank statement/.test(sh) && !/Bank notifications/.test(sh) && /2 entries ready/.test(sh), "a statement's rows open the bank statement review as before", sh.slice(0, 200));
  await page.close();
}
await browser.close();
finish("e2e_run68_paste");
