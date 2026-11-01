// Run 17 (2026-10-30), owner decision: build BOTH debts (people) and loans (with a schedule). The arithmetic is checked in
// logic/run17loan.test.mjs; this checks the screens in the real bundle. Page: Settings tab -> "Debts & loans" (last row). Synthetic data only.
import { launch, openPage, state, wait, ok, section, finish, baseSeed, settle, setInput, clickText } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dstr(d); };
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), DKEY);
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }, v);
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(200); };
const openDebts = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150); await page.evaluate(() => document.querySelectorAll(".more-page .list-row")[5].click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250); };
const seg = (page, i) => page.evaluate((i) => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[i].click(), i);
const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || "", sel);

section("R17-D1. The page opens from Settings and goes back to it");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page);
  ok(/Debts & loans/.test(await text(page, ".wordmark")), "the title is Debts & loans", await text(page, ".wordmark"));
  ok(await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].classList.contains("active")), "the Settings tab stays highlighted");
  await page.evaluate(() => document.querySelector(".topbar-back .topbar-btn").click()); await wait(300);
  ok(await page.evaluate(() => !!document.querySelector(".more-page")), "Back returns to Settings");
  ok(!(await stored(page)), "opening the page stores nothing");
  await page.close();
}
section("R17-D2. A debt: add, pay in parts, refuse too much, undo a payment");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page);
  ok(/No debts yet/.test(await text(page, '[data-section="debts-page"]')), "empty state explains what this is");
  await click(page, '[data-section="debt-add-btn"]');
  await setVal(page, "#debt-name", "Rauf"); await setVal(page, "#debt-amt", "300");
  await click(page, 'input[name="debt-dir"][value="owed"]');
  await click(page, '[data-section="debt-save"]'); await wait(300);
  let st = await stored(page);
  ok(st && st.debts.length === 1 && st.debts[0].principal === 30000 && st.debts[0].direction === "owed" && st.debts[0].name === "Rauf", "stored as 30000 qapik, direction owed, name Rauf", st);
  let card = await text(page, '[data-section="debt-card"]');
  ok(/Rauf/.test(card) && /300\.00/.test(card) && /Owes you/.test(card), "the card names the person, the amount and who owes whom", card);
  const pay = async (v) => { await setVal(page, '[data-section="debt-card"] .debt-pay-input', v); await click(page, '[data-section="debt-card"] .debt-pay-btn'); await wait(250); if (await page.$('.debt-ask-no')) { await click(page, '.debt-ask-no'); await wait(250); } };
  await pay("100"); await pay("50");
  ok(/150\.00/.test(await text(page, '.debt-remaining')), "after 100 and 50 the remaining is 150.00", await text(page, ".debt-remaining"));
  await pay("160");
  ok(/more than/i.test(await text(page, '[data-section="debt-card"] [role="alert"]')) && (await stored(page)).debts[0].payments.length === 2, "160 is refused with a message and nothing is saved");
  await page.evaluate(() => document.querySelectorAll(".debt-pay-del")[1].click()); await wait(300);
  ok(/200\.00/.test(await text(page, ".debt-remaining")), "deleting the 50 payment brings the remaining back to 200.00", await text(page, ".debt-remaining"));
  await pay("200");
  ok(/Settled/.test(await text(page, '[data-section="debt-card"]')), "paying the rest shows Settled");
  const sum = await text(page, '[data-section="debts-summary"]');
  ok(/0\.00/.test(sum), "the summary no longer counts the settled debt", sum);
  await page.close();
}
section("R17-D3. A loan: the estimate, marking a payment, and the linked entry");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page); await seg(page, 1); await wait(200);
  await click(page, '[data-section="loan-add-btn"]');
  await setVal(page, "#loan-lender", "Test Bank"); await setVal(page, "#loan-amt", "5000"); await setVal(page, "#loan-rate", "18"); await setVal(page, "#loan-months", "12"); await setVal(page, "#loan-first", tomorrow());
  await click(page, '[data-section="loan-save"]'); await wait(300);
  let st = await stored(page);
  ok(st && st.loans.length === 1 && st.loans[0].principal === 500000 && st.loans[0].months === 12 && st.loans[0].rateType === "annuity", "stored: 500000 qapik, 12 payments, annuity", st && st.loans);
  let card = await text(page, '[data-section="loan-card"]');
  ok(/458\.40/.test(card) && /500\.79/.test(card), "monthly payment 458.40 and interest over the loan 500.79", card);
  ok(/estimate/i.test(card), "the card says this is an estimate");
  const n0 = (await state(page)).transactions.length;
  await click(page, '[data-section="loan-card"] .loan-paid-btn'); await wait(400);
  const s2 = await state(page), added = s2.transactions.find((t) => t.note && /Loan payment/.test(t.note));
  ok(s2.transactions.length === n0 + 1 && added && added.amount === 458.4 && added.type === "expense" && added.merchant === "Test Bank", "one expense of 458.40 is added to Transactions (merchant: the lender)", added);
  st = await stored(page);
  ok(st.loans[0].payments.length === 1 && st.loans[0].payments[0].amount === 45840 && st.loans[0].payments[0].txnId === added.id, "the payment record points at that entry", st.loans[0].payments);
  card = await text(page, '[data-section="loan-card"]');
  ok(/4,616\.60/.test(card), "balance left (estimate) is 4,616.60 after the first payment", card);
  await page.evaluate(() => document.querySelector(".loan-pay-del").click()); await wait(400);
  ok((await state(page)).transactions.length === n0 && (await stored(page)).loans[0].payments.length === 0, "deleting the payment record removes the linked entry too, once");
  await page.close();
}
section("R17-D4. A loan with unusable terms is refused");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page); await seg(page, 1); await wait(200);
  await click(page, '[data-section="loan-add-btn"]');
  await setVal(page, "#loan-lender", "B"); await setVal(page, "#loan-amt", "1000"); await setVal(page, "#loan-rate", "18"); await setVal(page, "#loan-months", "0"); await setVal(page, "#loan-first", tomorrow());
  await click(page, '[data-section="loan-save"]'); await wait(300);
  ok(!(await stored(page)) && /Check the amount/.test(await text(page, '[data-section="loan-form"] [role="alert"]')), "months 0: nothing saved, the message names what to check");
  await page.close();
}
section("R17-D5. Flat rate is explained honestly");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page); await seg(page, 1); await wait(200);
  await click(page, '[data-section="loan-add-btn"]');
  await setVal(page, "#loan-lender", "Flat Bank"); await setVal(page, "#loan-amt", "5000"); await setVal(page, "#loan-rate", "18"); await setVal(page, "#loan-months", "12"); await setVal(page, "#loan-first", tomorrow()); await setVal(page, "#loan-type", "flat");
  await click(page, '[data-section="loan-save"]'); await wait(300);
  const card = await text(page, '[data-section="loan-card"]');
  ok(/491\.67/.test(card) && /900\.00/.test(card) && /31\.[67]/.test(card), "flat 18%: payment 491.67, interest 900.00 and the real yearly cost of about 31.7%", card);
  await page.close();
}
section("R17-D6. Russian");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "ru" }), chooseLang: "ru" }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page);
  ok(/Долги и кредиты/.test(await text(page, ".wordmark")), "the title is in Russian", await text(page, ".wordmark"));
  await page.close();
}
await browser.close();
finish("e2e_run17_debts");
