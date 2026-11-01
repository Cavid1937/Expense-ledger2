// Run 17 (2026-10-30), owner rule: the full loan instalment is recorded as money paid out; only the interest counts as spending;
// an unknown split adds nothing to spending (no invented allocation). Rules are checked in logic/run17loancash.test.mjs; this checks the screens.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, state, settle } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dstr(d); };
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }, v);
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(250); };
const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || "", sel);
const loanPage = async (page) => {
  await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelectorAll(".more-page .list-row")[5].click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250);
  await page.evaluate(() => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[1].click()); await wait(200);
  await click(page, '[data-section="loan-add-btn"]');
  await setVal(page, "#loan-lender", "Test Bank"); await setVal(page, "#loan-amt", "5000"); await setVal(page, "#loan-rate", "18"); await setVal(page, "#loan-months", "12"); await setVal(page, "#loan-first", tomorrow());
  await click(page, '[data-section="loan-save"]'); await wait(300);
};
const analytics = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500); };

section("R17-LCa. Estimated interest is prefilled; full payment recorded, interest counts as spending");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page); await loanPage(page);
  const pre = await page.$eval(".loan-interest-input", (e) => e.value);
  ok(pre === "75.00", "the interest box starts at the schedule's estimate (75.00)", pre);
  await click(page, ".loan-paid-btn"); await wait(300);
  const t = (await state(page)).transactions.find((x) => x.loan);
  ok(!!t && t.amount === 458.4 && t.loan.interest === 75, "the entry is the FULL 458.40, with interest 75.00 attached", t);
  await analytics(page);
  const ov = await text(page, '[data-section="an-overview"]');
  ok(/75\.00/.test(ov) && !/458\.40/.test(ov), "Analytics counts 75.00 as spent, not 458.40", ov);
  const cash = await text(page, '[data-section="an-loancash"]');
  ok(/458\.40/.test(cash) && /75\.00/.test(cash), "a line shows 458.40 paid out and 75.00 of it interest", cash);
  await page.close();
}
section("R17-LCb. Split unknown: nothing invented, nothing counted as spending");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page); await loanPage(page);
  await setVal(page, ".loan-interest-input", ""); await click(page, ".loan-paid-btn"); await wait(300);
  const t = (await state(page)).transactions.find((x) => x.loan);
  ok(!!t && t.amount === 458.4 && t.loan.interest === null, "the full 458.40 is recorded with interest = unknown (null)", t);
  await analytics(page);
  const ov = await text(page, '[data-section="an-overview"]');
  ok(!/458\.40/.test(ov) && !/75\.00/.test(ov), "Analytics adds nothing for it", ov);
  ok(/not counted as spending/.test(await text(page, '[data-section="an-loancash"]')), "the line says payments without an interest amount are not counted");
  await page.close();
}
section("R17-LCc. An impossible interest amount is refused");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page); await loanPage(page);
  await setVal(page, ".loan-interest-input", "999"); await click(page, ".loan-paid-btn"); await wait(300);
  ok((await state(page)).transactions.length === 0 && /interest amount/i.test(await page.evaluate(() => (document.querySelector(".toast") || {}).textContent || "")), "999 on a 458.40 payment: nothing recorded, a message says what to check");
  await page.close();
}
section("R17-LCd. The Transactions list still shows the full payment");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page); await loanPage(page);
  await click(page, ".loan-paid-btn"); await wait(300);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
  ok(/458\.40/.test(await page.evaluate(() => document.body.innerText)), "Transactions shows 458.40");
  await page.close();
}
await browser.close();
finish("e2e_run17_loancash");
