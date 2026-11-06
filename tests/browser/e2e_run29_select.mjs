// Run 29: the selection in Transactions belongs to the whole ledger: it shows count / spent / income / net, survives a change of
// search, and "Selected only" shows exactly the picked entries. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, state } from "./lib.mjs";
const browser = await launch();
const seed = (language) => baseSeed({ language, transactions: [
  tx({ merchant: "Row1", amount: 10.1, date: "2026-10-01" }), tx({ merchant: "Row2", amount: 20.2, date: "2026-10-02" }),
  tx({ merchant: "Row3", amount: 30, date: "2026-10-03" }), tx({ merchant: "Pay4", type: "income", category: "salary", amount: 100.05, date: "2026-10-04" })] });
const ledger = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500); };
const click = (page, sel, i = 0) => page.evaluate((s, n) => { document.querySelectorAll(s)[n].click(); }, sel, i);
const sum = (page) => page.evaluate(() => document.querySelector('[data-section="tx-select-sum"]').innerText);
const search = async (page, v) => { await page.evaluate((v) => { const i = document.querySelector(".search-input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, v); i.dispatchEvent(new Event("input", { bubbles: true })); }, v); await wait(300); };
const pick = (page, name) => page.evaluate((n) => { const b = [...document.querySelectorAll('[data-section="tx-select"] [role="checkbox"]')].find((x) => x.innerText.includes(n)); b.click(); }, name);

section("R29-S1. Sums, selection kept across a changed search, Selected only");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page); await ledger(page);
  await click(page, '[data-section="tx-select-toggle"]'); await wait(300);
  ok(/Tap entries to select/.test(await sum(page)), "hint shown while nothing is selected");
  await pick(page, "Row1"); await pick(page, "Pay4"); await wait(200);
  let s = await sum(page);
  ok(/2 selected/.test(s) && /10\.10/.test(s) && /100\.05/.test(s) && /89\.95/.test(s), "2 selected: spent 10.10, income 100.05, net 89.95 to the cent", s);
  await search(page, "Row3"); await wait(200);
  ok(await page.evaluate(() => document.querySelectorAll('[data-section="tx-select"] [role="checkbox"]').length) === 1, "the search now shows one row");
  ok(/2 selected/.test(await sum(page)), "the two earlier picks are still counted after the search changed");
  await pick(page, "Row3"); await wait(200);
  s = await sum(page);
  ok(/3 selected/.test(s) && /40\.10/.test(s) && /59\.95/.test(s), "3 selected: spent 40.10, net 59.95", s);
  await click(page, '[data-section="tx-select-only"]'); await wait(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-select"] [role="checkbox"]')].map((x) => x.innerText));
  ok(rows.length === 3 && rows.some((r) => r.includes("Row1")) && rows.some((r) => r.includes("Pay4")) && rows.some((r) => r.includes("Row3")) && !rows.some((r) => r.includes("Row2")), "Selected only lists exactly the three picked entries, ignoring the search", rows.join("|"));
  await click(page, '[data-section="tx-select"] [role="checkbox"]', 0); await wait(200);
  ok(/2 selected/.test(await sum(page)), "unticking inside Selected only updates the sum");
  ok((await state(page)).transactions.length === 4, "nothing was deleted by selecting");
  ok(/Delete 2/.test(await page.evaluate(() => document.querySelector('[data-section="tx-select-delete"]').innerText)), "Delete counts the same entries as the sum line");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R29-S2. Leaving select mode clears everything; az and ru wording");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page); await ledger(page);
  await click(page, '[data-section="tx-select-toggle"]'); await pick(page, "Row1"); await click(page, '[data-section="tx-select-only"]');
  await click(page, '[data-section="tx-select-toggle"]'); await wait(200);
  await click(page, '[data-section="tx-select-toggle"]'); await wait(300);
  ok(/Tap entries/.test(await sum(page)) && await page.evaluate(() => document.querySelectorAll('[data-section="tx-select"] [role="checkbox"]').length) === 4, "Done then Select again: nothing selected, all four rows listed");
  await page.close();
}
for (const [l, re] of [["az", /seçilib/], ["ru", /Выбрано/]]) {
  const page = await openPage(browser, { seed: seed(l) }); await settle(page); await ledger(page);
  await click(page, '[data-section="tx-select-toggle"]'); await pick(page, "Row2"); await wait(200);
  ok(re.test(await sum(page)), `${l}: sum line wording`, await sum(page));
  await page.close();
}
await finish("e2e_run29_select", browser);
