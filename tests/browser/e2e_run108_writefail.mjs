// Run 108 (release readiness): when the loans and debts data cannot be saved (storage full, or the data is protected because it is damaged),
// nothing half-done is left behind. Before Run 108 "Mark next payment as paid" added the spending entry, failed to record the payment, and still
// said "paid": each further tap added one more entry for the same instalment. A new loan or debt typed into its form was also emptied away
// when the save failed. The failure is made by refusing writes of the debts key only, as a full storage would. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, baseSeed } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const LOAN = { id: "l1", lender: "Bank", kind: "cash", principal: 120000, months: 12, rateType: "none", ratePct: 0, firstPayment: TODAY, bankPayment: null, payments: [] };
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const openDebts = async (page, seg) => {
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250);
  if (seg) { await page.evaluate((i) => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[i].click(), seg); await wait(500); }
};
// from now on, writing the debts key fails as a full storage does (other keys still save)
const failDebts = (page) => page.evaluate((k) => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (key, v) { if (key === k) throw new DOMException("full", "QuotaExceededError"); return set.call(this, key, v); }; }, DKEY);
const state = (page) => page.evaluate((k) => ({ pays: (JSON.parse(localStorage.getItem(k) || "{}").loans || [{ payments: [] }])[0].payments.length, entries: JSON.parse(localStorage.getItem("expense_ledger_v5")).transactions.filter((x) => x.loan).length, toast: (document.querySelector(".toast") || {}).textContent || "" }), DKEY);

section("R108-W1. 'Mark next payment as paid' while the loans data cannot be saved leaves no entry behind and does not say 'paid'");
{
  const pre = new Function(`try{if(!sessionStorage.getItem("__l")){sessionStorage.setItem("__l","1");localStorage.setItem("${DKEY}",JSON.stringify({version:1,debts:[],loans:[${JSON.stringify(LOAN)}]}));}}catch(e){}`);
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), pre }); await settle(page);
  await openDebts(page, 1);
  await failDebts(page);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => document.querySelector(".loan-paid-btn").click()); await wait(800); }
  const s = await state(page);
  ok(s.pays === 0 && s.entries === 0, "three taps: no payment recorded and no loan entry left in the ledger", s);
  ok(s.toast !== "" && !/recorded/i.test(s.toast), "a message shows, and it is not 'Payment recorded in your entries'", s.toast);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R108-W2. A new loan or debt that cannot be saved stays in its form (nothing typed is lost)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page);
  await openDebts(page, 0);
  await failDebts(page);
  await page.evaluate(() => document.querySelector('[data-section="debt-add-btn"]').click()); await wait(300);
  await setVal(page, "#debt-name", "Rauf"); await setVal(page, "#debt-amt", "40");
  await page.evaluate(() => document.querySelector('[data-section="debt-save"]').click()); await wait(500);
  const d = await page.evaluate(() => ({ name: document.querySelector("#debt-name")?.value, amt: document.querySelector("#debt-amt")?.value }));
  ok(d.name === "Rauf" && d.amt === "40", "debt form still open with 'Rauf' and 40", d);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run108_writefail");
