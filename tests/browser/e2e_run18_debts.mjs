// Run 18 (2026-10-31): a corrupt or partly unreadable debts store is shown honestly and never overwritten. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const openDebts = async (page) => {
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250);
};
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(250); };
const BAD = '{"version":1,"debts":[{"id":"d1","name":"Ra';

section("R18-BD1. Corrupt debts data: warning shown, nothing overwritten");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page);
  await page.evaluate((k, v) => localStorage.setItem(k, v), DKEY, BAD);
  await openDebts(page);
  ok(!!(await page.$('[data-section="debts-blocked"][role="alert"]')), "a warning (role=alert) explains the data is protected");
  await click(page, '[data-section="debt-add-btn"]');
  await setVal(page, "#debt-name", "Test"); await setVal(page, "#debt-amt", "100");
  await click(page, '[data-section="debt-save"]'); await wait(300);
  const stored = await page.evaluate((k) => localStorage.getItem(k), DKEY);
  ok(stored === BAD, "the stored text is exactly as before after trying to save", stored);
  const copies = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("expense_ledger_v5__debts_")));
  ok(copies.length === 1, "one safe copy was kept", copies);
  await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await page.close();
}
await browser.close();
finish("e2e_run18_debts");
