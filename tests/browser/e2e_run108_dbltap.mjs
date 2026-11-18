// Run 108 (release readiness): the add form stays on screen for its 0.2 s closing slide. Before Run 108 a second tap on Record in that
// time (a quick double tap on a phone) saved the same entry twice. Now each opening of the form hands over its entries once. Checked for
// taps at the same moment, 60 ms and 200 ms apart; the next opening still saves, and an edit tapped twice changes the entry once.
// Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, baseSeed, tx } from "./lib.mjs";
const browser = await launch();
const setField = (page, sel, v) => page.evaluate((s, val) => { const el = document.querySelector(s); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, sel, v);
const stored = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("expense_ledger_v5")).transactions; } catch { return null; } });
const openForm = async (page) => { await page.evaluate(() => document.querySelector(".fab-add, .home-empty .btn")?.click()); await page.waitForSelector(".amount-input"); await wait(400); };
// two taps on Record, `gap` ms apart (the second finds the button again, as a finger would)
const tapTwice = (page, gap) => page.evaluate(async (gap) => {
  const find = () => [...document.querySelectorAll(".add-overlay .btn-primary")].find((x) => /Record|Save/.test(x.innerText));
  const b = find(); b.click(); if (gap) await new Promise((r) => setTimeout(r, gap)); (find() || b).click();
}, gap);

section("R108-T. A double tap on Record saves one entry");
for (const gap of [0, 60, 200]) {
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) });
  await settle(page);
  await openForm(page);
  await setField(page, ".amount-input", "12.50"); await setField(page, "#txn-merchant", "Bakery"); await wait(100);
  await tapTwice(page, gap); await wait(700);
  const list = await stored(page);
  ok(list && list.length === 1 && list[0].amount === 12.5 && list[0].merchant === "Bakery", `two taps ${gap} ms apart: one entry of 12.50 saved`, list && list.map((x) => [x.amount, x.merchant]));
  if (gap === 60) {
    await openForm(page);
    await setField(page, ".amount-input", "3"); await setField(page, "#txn-merchant", "Tea"); await wait(100);
    await tapTwice(page, 0); await wait(700);
    const l2 = await stored(page);
    ok(l2 && l2.length === 2 && l2.some((x) => x.merchant === "Tea" && x.amount === 3), "the form opened again still saves (one more entry, not blocked and not doubled)", l2 && l2.length);
  }
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R108-T2. Editing an entry and tapping Save twice changes it once and adds nothing");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 77, amount: 20, merchant: "Shop", category: "food" })] }) });
  await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
  await page.evaluate(() => document.querySelector(".txn-row")?.click()); await wait(500);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^Edit$/.test(b.innerText.trim()))?.click()); await wait(500);
  const open = !!(await page.$(".add-overlay .amount-input"));
  if (open) { await setField(page, ".amount-input", "25"); await wait(100); await tapTwice(page, 60); await wait(700); }
  const list = await stored(page);
  ok(open && list && list.length === 1 && list[0].id === 77 && list[0].amount === 25, "one entry, now 25.00, same id", { open, list: list && list.map((x) => [x.id, x.amount]) });
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run108_dbltap");
