// Run 17 (2026-10-30), owner feedback: "when I touch +, I face a complete mess". Contract (updated Run 25: the in-app number pad was removed):
// the add form shows only what most entries need (type, amount, category, subcategory) and one Save button that is always on screen;
// merchant, note, date, wallet and "repeats" sit under one "More details" toggle (open by default only when editing).
// Synthetic data only.
import { launch, openPage, tab, openAdd, state, wait, ok, section, finish, baseSeed, clickText, settle, tx } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const typeAmt = (page, v) => page.$eval(".amount-input", (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const amount = (page) => page.$eval(".amount-input", (el) => el.value);
const visible = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }, sel);

section("R17-D1. A new entry: no pad, amount, category, one Save button, details folded away");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await phone(page); await settle(page);
  await page.evaluate(() => document.querySelector(".fab-add").click()); await page.waitForSelector(".amount-input"); await wait(500);
  await typeAmt(page, "145.67"); await wait(60);
  ok(await amount(page) === "145.67", "the amount box takes 145.67", await amount(page));
  ok(!(await visible(page, "#txn-merchant")) && !(await visible(page, "#txn-note")) && !(await visible(page, "#txn-date")), "merchant, note and date are folded away at first");
  ok(!(await visible(page, '[data-section="add-wallet"]')), "the wallet choice is folded away too");
  const foot = await page.evaluate(() => { const b = document.querySelector(".add-foot .btn-primary"); if (!b) return null; const r = b.getBoundingClientRect(); return { b: r.bottom, vh: innerHeight, h: r.height, t: b.innerText }; });
  ok(!!foot && foot.b <= foot.vh + 1 && foot.h >= 44, "the Save button is in a footer that is on screen without scrolling and at least 44px high", foot);
  await page.close();
}
section("R17-D3. Details: opening them shows the fields");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await phone(page); await settle(page); await openAdd(page);
  const tog = await page.evaluate(() => { const b = document.querySelector('[data-section="add-more-toggle"]'); return b ? { exp: b.getAttribute("aria-expanded"), txt: b.innerText } : null; });
  ok(!!tog && tog.exp === "false", "a details toggle exists and starts closed", tog);
  await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(250);
  ok((await visible(page, "#txn-merchant")) && (await visible(page, "#txn-note")) && (await visible(page, "#txn-date")) && (await visible(page, '[data-section="add-wallet"]')), "after opening, merchant, note, date and wallet are all shown");
  ok((await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').getAttribute("aria-expanded"))) === "true", "the toggle says it is open");
  await page.close();
}
section("R17-D4. Recording needs only amount and category; details travel with the entry; editing opens the details");
{
  const old = tx({ id: 1790001000009, merchant: "Old shop", amount: 5, note: "memo" });
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [old] }) }); await phone(page); await settle(page); await openAdd(page);
  await typeAmt(page, "12.5");
  await clickText(page, ".add-foot .btn-primary", /record expense/i); await wait(500);
  let st = await state(page); ok(st.transactions[0].amount === 12.5 && !st.transactions[0].merchant, "amount 12.5 and a default category are enough to record", st.transactions[0]);
  await openAdd(page); await typeAmt(page, "3");
  await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(200);
  await page.$eval("#txn-merchant", (el) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "Corner shop"); el.dispatchEvent(new Event("input", { bubbles: true })); });
  await clickText(page, ".add-foot .btn-primary", /record expense/i); await wait(500);
  st = await state(page); ok(st.transactions[0].amount === 3 && st.transactions[0].merchant === "Corner shop", "details typed under 'More details' are saved", st.transactions[0]);
  await tab(page, "Transactions"); await wait(300);
  await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => /Old shop/.test(r.innerText)).click()); await wait(400);
  await clickText(page, ".sheet button", /^\s*edit\s*$/i); await wait(500);
  ok(await visible(page, "#txn-merchant") && (await page.$eval("#txn-merchant", (e) => e.value)) === "Old shop", "editing opens the details with the saved merchant");
  ok((await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').getAttribute("aria-expanded"))) === "true", "the toggle is open while editing");
  await page.close();
}
await browser.close();
finish("e2e_run17_addform");
