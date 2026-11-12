// Run 24: select several entries in Transactions and delete them together, with one undo. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, state, bodyText } from "./lib.mjs";
const browser = await launch();
const seed = (language) => baseSeed({ language, transactions: [1, 2, 3, 4].map((i) => tx({ merchant: "Row" + i, amount: i * 10, date: "2026-10-0" + i })) });
const ledger = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500); };
const click = (page, sel, i = 0) => page.evaluate((s, n) => { document.querySelectorAll(s)[n].click(); }, sel, i);

section("R24-S1. Select, delete together, undo once");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page); await ledger(page);
  ok((await page.evaluate(() => document.querySelector('[data-section="tx-select"]'))) === null, "normal list until Select is pressed");
  await click(page, '[data-section="tx-select-toggle"]'); await wait(300);
  ok(await page.evaluate(() => document.querySelectorAll('[data-section="tx-select"] [role="checkbox"]').length) === 4, "four selectable rows");
  ok(await page.evaluate(() => document.querySelector('[data-section="tx-select-delete"]').disabled), "Delete is disabled while nothing is picked");
  await click(page, '[data-section="tx-select"] [role="checkbox"]', 0); await click(page, '[data-section="tx-select"] [role="checkbox"]', 2); await wait(200);
  const label = await page.evaluate(() => document.querySelector('[data-section="tx-select-delete"]').innerText);
  ok(/Delete 2/.test(label), "button says Delete 2", label);
  await click(page, '[data-section="tx-select-delete"]'); await wait(500);
  const s = await state(page);
  ok(s.transactions.length === 2, "two entries removed, two left", s.transactions.length);
  ok(/2 entries deleted/i.test(await bodyText(page)), "one message: 2 transactions deleted");
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /undo/i.test(x.innerText)); b && b.click(); }); await wait(500);
  ok((await state(page)).transactions.length === 4, "one Undo brings both back");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-S2. Select all, only shown rows are deleted; az and ru labels");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page); await ledger(page);
  await page.evaluate(() => { const i = document.querySelector(".search-input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "Row1"); i.dispatchEvent(new Event("input", { bubbles: true })); }); await wait(300);
  await click(page, '[data-section="tx-select-toggle"]'); await wait(200);
  await click(page, '[data-section="tx-select-all"]'); await click(page, '[data-section="tx-select-delete"]'); await wait(500);
  const s = await state(page);
  ok(s.transactions.length === 3 && !s.transactions.some((x) => x.merchant === "Row1"), "with a search showing one row, Select all deletes only that row");
  await page.close();
}
for (const [l, re] of [["az", /Seç/], ["ru", /Выбрать/]]) {
  const page = await openPage(browser, { seed: seed(l) }); await settle(page); await ledger(page);
  ok(re.test(await page.evaluate(() => document.querySelector('[data-section="tx-select-toggle"]').innerText)), `${l}: Select label`);
  await page.close();
}
await finish("e2e_run24_bulk", browser);
