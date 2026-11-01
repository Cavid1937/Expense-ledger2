// Run 20: "What if I pay extra now?" on a loan card (coach R12). Uses the hand-worked loan from run20extra.test.mjs: 1,000.00, 12 months, 12%,
// annuity -> an extra 100.00 ends it one month sooner and saves 12.44 in interest. Synthetic data; the loan is written under its own key.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const loan = (o = {}) => ({ id: "l1", lender: "Test Bank", kind: "cash", principal: 100000, ratePct: 12, rateType: "annuity", months: 12, firstPayment: "2026-11-05", bankPayment: null, payments: [], ...o });
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const open = async (lang, loans) => {
  const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [] }) }); await settle(page);
  await page.evaluate((k, v) => localStorage.setItem(k, v), DKEY, JSON.stringify({ version: 1, debts: [], loans }));
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelectorAll(".more-page .list-row")[5].click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".seg-btn")]; b[b.length - 1].click(); }); await wait(300);
  return page;
};
const result = (page) => page.evaluate(() => (document.querySelector(".loan-extra-result") || {}).innerText || "");

section("R20-XB1. Result for an extra 100.00 (en)");
{
  const page = await open("en", [loan()]);
  ok(!!(await page.$('[data-section="loan-extra"]')), "the field is on the loan card");
  ok((await result(page)) === "", "nothing is shown before an amount is typed");
  await setVal(page, ".loan-extra-input", "100"); await wait(200);
  const r = await result(page);
  ok(/1 month sooner/.test(r) && /12\.44/.test(r) && /100\.00/.test(r), "ends 1 month sooner and saves 12.44, in the user's amounts", r);
  ok(/lower the payment|early repayment/i.test(await page.evaluate(() => document.querySelector('[data-section="loan-extra"]').innerText)), "the card says the lender may lower the payment instead or charge a fee");
  const before = await page.evaluate((k) => localStorage.getItem(k), DKEY);
  await setVal(page, ".loan-extra-input", "5000"); await wait(200);
  ok(/whole remaining balance/.test(await result(page)), "an amount at or above the balance says the loan would simply be paid off");
  await setVal(page, ".loan-extra-input", "abc"); await wait(200);
  ok((await result(page)) === "", "text that is not an amount shows nothing");
  ok((await page.evaluate((k) => localStorage.getItem(k), DKEY)) === before, "typing amounts never changes the saved loan");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.evaluate((k) => localStorage.removeItem(k), DKEY); await page.close();
}
section("R20-XB2. Other repayment types have no field; Russian wording");
{
  let page = await open("en", [loan({ rateType: "equal" })]);
  ok(!(await page.$('[data-section="loan-extra"]')), "an 'equal principal' loan shows no what-if field");
  await page.evaluate((k) => localStorage.removeItem(k), DKEY); await page.close();
  page = await open("ru", [loan()]);
  await setVal(page, ".loan-extra-input", "100"); await wait(200);
  ok(/1 месяц/.test(await result(page)), "ru: '1 месяц' form", await result(page));
  await page.evaluate((k) => localStorage.removeItem(k), DKEY); await page.close();
}
await finish("e2e_run20_extra", browser);
