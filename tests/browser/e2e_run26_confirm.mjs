// Run 26: deleting a debt asks with the app's own dialog (no browser pop-up). Cancel keeps the data; Delete removes it. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), DKEY);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const setVal = (page, sel, v) => page.evaluate((s, v) => { const el = document.querySelector(s); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, sel, v);

section("R26-C1. Delete a debt: own dialog, Cancel keeps, Delete removes");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), fresh: true });
  await page.evaluateOnNewDocument(() => { window.__noAutoConfirm = true; });
  await settle(page);
  let native = 0; page.on("dialog", async (d) => { native++; await d.dismiss(); });
  await page.evaluate(() => { window.__noAutoConfirm = true; });
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await click(page, '.more-page [data-more="debts"]'); await page.waitForSelector('[data-section="debts-page"]'); await wait(250);
  await click(page, '[data-section="debt-add-btn"]');
  await setVal(page, "#debt-name", "Rauf"); await setVal(page, "#debt-amt", "300");
  await click(page, 'input[name="debt-dir"][value="owed"]');
  await click(page, '[data-section="debt-save"]'); await wait(300);
  ok((await stored(page)).debts.length === 1, "one debt saved");
  await click(page, ".topbar-btn[aria-label^='Delete']"); await wait(250);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="confirm-overlay"] [role="alertdialog"]')), "the app's own question appears");
  await click(page, '[data-section="confirm-cancel"]'); await wait(300);
  ok((await stored(page)).debts.length === 1 && await page.evaluate(() => !document.querySelector('[data-section="confirm-overlay"]')), "Cancel keeps the debt and closes the question");
  await click(page, ".topbar-btn[aria-label^='Delete']"); await wait(250);
  await click(page, '[data-section="confirm-ok"]'); await wait(350);
  const after = await stored(page);
  ok(!after || after.debts.length === 0, "Delete removes the debt", after);
  ok(native === 0, "no browser pop-up was used", native);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run26_confirm", browser);
