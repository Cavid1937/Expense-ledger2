// Run 31: Transactions. Secondary filters sit behind "More filters", an account filter is added, the day total says it is spending,
// and the empty Recurring screen offers "Add bill". Hand-worked expectations; synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, tab, baseSeed } from "./lib.mjs";
const browser = await launch();
const D = new Date(), ds = `${D.getFullYear()}-${String(D.getMonth() + 1).padStart(2, "0")}-${String(D.getDate()).padStart(2, "0")}`;
const T = (id, o) => ({ id, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: ds, recurring: false, recurFreq: null, isActive: true, createdAt: ds + "T00:00:00.000Z", ...o });
const ACC = `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"ABB Card",kind:"card",opening:{amount:0,date:""},hidden:false},{id:"a_cash01",name:"Cash",kind:"cash",opening:{amount:0,date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
const rows = (page) => page.evaluate(() => [...document.querySelectorAll(".txn-row")].map((r) => r.innerText.replace(/\s+/g, " ")));
const seed = baseSeed({ language: "en", transactions: [T(1790003000001, { merchant: "Aaa", amount: 10, account: "a_card01" }), T(1790003000002, { merchant: "Bbb", amount: 20, account: "a_cash01" }), T(1790003000003, { merchant: "Ccc", amount: 5 }), T(1790003000004, { type: "income", category: "salary", merchant: "Pay", amount: 1000, account: "a_card01" })] });
section("R31-L1. More filters and the account filter");
{
  const page = await openPage(browser, { seed, pre: new Function(ACC) }); await tab(page, "Ledger"); await settle(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="tx-more-toggle"]') && !document.querySelector('[data-section="tx-acc-filter"]')), "accounts in use: a 'More filters' chip, its filters tucked away");
  await page.evaluate(() => document.querySelector('[data-section="tx-more-toggle"]').click()); await wait(200);
  const labels = await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-acc-filter"] .chip')].map((b) => b.innerText.trim()));
  ok(labels.join("|") === "All accounts|ABB Card|Cash|No account", "account filter lists All, the accounts in use, and No account", labels);
  await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-acc-filter"] .chip')].find((b) => b.innerText.trim() === "Cash").click()); await wait(250);
  let r = await rows(page); ok(r.length === 1 && /Bbb/.test(r[0]), "Cash: only the 20.00 entry", r);
  ok(await page.evaluate(() => /·\s*1/.test(document.querySelector('[data-section="tx-more-toggle"]').innerText)), "the chip shows 1 tucked-away filter is on");
  await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-acc-filter"] .chip')].find((b) => b.innerText.trim() === "No account").click()); await wait(250);
  r = await rows(page); ok(r.length === 1 && /Ccc/.test(r[0]), "No account: only the entry without one", r);
  await page.evaluate(() => document.querySelector('[data-section="tx-clear"]').click()); await wait(250);
  r = await rows(page); ok(r.length === 4, "Clear shows all 4 entries again", r.length);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R31-L2. Day total is spending");
{
  const page = await openPage(browser, { seed, pre: new Function(ACC) }); await tab(page, "Ledger"); await settle(page);
  const h = await page.evaluate(() => { const e = document.querySelector(".txn-date-total"); return e ? { text: e.textContent, label: e.getAttribute("aria-label") } : null; });
  ok(h && /^−35[.,]00/.test(h.text.replace(/\s/g, "")) && /Spent/.test(h.label) && /35/.test(h.label), "10 + 20 + 5 spent that day = 35.00 (the 1000 income is not in it), shown with a minus and announced as 'Spent'", h);
  await page.close();
}
section("R31-L3. No accounts in use: no More filters chip; empty Recurring offers Add bill");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await tab(page, "Ledger"); await settle(page);
  ok(await page.evaluate(() => !document.querySelector('[data-section="tx-more-toggle"]')), "nothing to tuck away: no chip");
  await tab(page, "Recurring"); await settle(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="rec-empty-add"]')), "the empty Recurring screen has an Add bill button");
  await page.evaluate(() => document.querySelector('[data-section="rec-empty-add"]').click()); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector(".bill-sheet")), "it opens the new-bill form");
  await page.close();
}
section("R31-L4. az and ru");
for (const [l, re] of [["az", /Digər filtrlər/], ["ru", /Ещё фильтры/]]) {
  const page = await openPage(browser, { seed: { ...seed, language: l }, pre: new Function(ACC) }); await tab(page, "Ledger"); await settle(page);
  ok(re.test(await page.evaluate(() => document.querySelector('[data-section="tx-more-toggle"]').innerText)), `${l}: More filters is translated`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
await finish("e2e_run31_ledger", browser);
