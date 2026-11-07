// Run 36 (2026-11-07): refund of a category, hide / reorder categories, search in the picker, subcategory filter. Synthetic data only.
import { launch, openPage, openCategories, openSettings, openAdd, tab, wait, ok, section, finish, baseSeed, tx, settle, state, TODAY } from "./lib.mjs";
const browser = await launch();
const PK = "expense_ledger_v5__catprefs";
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const setVal = (page, sel, v) => page.$eval(sel, (el, val) => { const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, val); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }, v);
const tiles = (page) => page.evaluate(() => [...document.querySelectorAll(".cat-scroll .cat-tile")].map((b) => b.getAttribute("aria-label")));
const pickTile = (page, label) => page.evaluate((l) => { const b = [...document.querySelectorAll(".cat-scroll .cat-tile")].find((x) => x.getAttribute("aria-label") === l); if (b) b.click(); return !!b; }, label);

section("R36-B1. Refund of a category: lowers that spending, not counted as money in");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ type: "income", category: "salary", amount: 1000, date: TODAY }), tx({ category: "food", amount: 100, date: TODAY })] }) }); await phone(page); await settle(page);
  await openAdd(page);
  await page.evaluate(() => [...document.querySelectorAll(".type-pick")][1].click()); await wait(250);
  ok(!(await page.$('[data-section="add-refund-for"]')), "the 'Refund of' choice is not shown for other income");
  await pickTile(page, "Refunds & Reimbursements"); await wait(250);
  ok(!!(await page.$("#txn-refund-for")), "choosing Refunds offers 'Refund of'");
  await setVal(page, "#txn-refund-for", "food"); await wait(150);
  ok(/lowers that category's spending/.test(await page.evaluate(() => document.querySelector('[data-section="add-not-income"]').innerText)), "the note explains what will happen");
  await setVal(page, ".amount-input", "30"); await wait(100);
  await page.evaluate(() => document.querySelector(".add-foot .btn-primary").click()); await wait(700);
  const saved = (await state(page)).transactions.find((x) => x.category === "refund");
  ok(saved && saved.refundFor === "food" && saved.amount === 30 && saved.type === "income", "saved as a refund of Food, 30.00", saved);
  const home = await page.evaluate(() => [...document.querySelector('[data-section="home-month"]').querySelectorAll(".hero-stat")].map((s) => s.innerText.replace(/\s+/g, " ")));
  ok(/1,?000/.test(home[0]) && /70/.test(home[1]), "Home: income 1,000, spent 70 (100 - 30)", home);
  await tab(page, "Monthly"); await wait(400);
  const an = await page.evaluate(() => (document.querySelector('[data-section="an-summary"]') || {}).innerText || "");
  ok(/70\.00/.test(an) && /930\.00/.test(an) && !/refunds or money from savings/.test(an), "Analytics: spent 70.00, net 930.00, no 'money in' note (the refund was used up)", an);
  ok(/lowered this month's spending by .?30\.00/.test(an), "and it says refunds lowered spending by 30.00", an);
  await page.close();
}

section("R36-B2. Hide and reorder in Settings; the add form follows; nothing else changes");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ category: "pets", amount: 12, date: TODAY })] }) }); await phone(page); await settle(page);
  await openCategories(page);
  ok(!!(await page.$('[data-section="cat-order"]')), "the order and visibility list is on Budgets & Goals (Run 38)");
  ok(await page.evaluate(() => !document.querySelector('[data-catord="other"] [data-section="catord-toggle"]')), "Other has no Hide button");
  await page.evaluate(() => document.querySelector('[data-catord="pets"] [data-section="catord-toggle"]').click()); await wait(300);
  await page.evaluate(() => document.querySelector('[data-catord="transport"] [data-section="catord-up"]').click()); await wait(300);
  const p = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PK);
  ok(p && p.hidden.includes("pets") && p.order.indexOf("transport") >= 0 && p.order.indexOf("transport") < p.order.indexOf("food"), "stored: Pets hidden, Transport before Food", p);
  ok((await state(page)).transactions[0].category === "pets", "the entry in Pets is untouched");
  await openAdd(page);
  let l = await tiles(page);
  ok(!l.includes("Pets") && l[0] === "Transport", "the add form: Pets is not offered, Transport comes first and is chosen", l.slice(0, 3));
  ok(await page.evaluate(() => /Transport/.test(document.querySelector("#txn-cat-lbl").innerText)), "a new entry starts on the first shown category");
  await page.reload(); await settle(page); await openAdd(page);
  l = await tiles(page);
  ok(!l.includes("Pets") && l[0] === "Transport", "still so after a reload", l.slice(0, 3));
  await page.evaluate((k) => localStorage.removeItem(k), PK);   // leave nothing behind for later files
  await page.close();
}

section("R36-B3. Search in the category picker");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await phone(page);
  await page.evaluate((k) => localStorage.removeItem(k), PK); await page.reload(); await settle(page); await openAdd(page);   // B2 hid Pets on this origin
  ok(!!(await page.$('[data-section="add-cat-search"]')), "a search box is offered for the long list");
  await setVal(page, '[data-section="add-cat-search"]', "vet"); await wait(200);
  const l = await tiles(page);
  ok(l.length === 1 && l[0] === "Pets · Vet", "'vet' finds Pets > Vet", l);
  await pickTile(page, "Pets · Vet"); await wait(200);
  ok(await page.evaluate(() => /Pets/.test(document.querySelector("#txn-cat-lbl").innerText) && [...document.querySelectorAll(".sub-chip")].some((c) => /Vet/.test(c.innerText) && (c.classList.contains("sel") || c.getAttribute("aria-pressed") === "true"))), "one tap chose Pets and the Vet subcategory");
  await setVal(page, '[data-section="add-cat-search"]', "qqqzz"); await wait(200);
  ok((await tiles(page)).length === 0 && !!(await page.$('[data-section="add-cat-none"]')), "nothing found: the form says so");
  await page.close();
}

section("R36-B4. Transactions: filter by subcategory inside a category");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ category: "food", subcategory: "Groceries", amount: 10, date: TODAY }), tx({ category: "food", subcategory: "groceries", amount: 11, date: TODAY }), tx({ category: "food", subcategory: "Coffee", amount: 3, date: TODAY }), tx({ category: "food", amount: 4, date: TODAY }), tx({ category: "transport", amount: 5, date: TODAY })] });
  const page = await openPage(browser, { seed }); await phone(page); await settle(page);
  await tab(page, "Ledger"); await wait(300);
  ok(!(await page.$('[data-section="tx-sub-filter"]')), "no subcategory filter before a category is chosen");
  await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await wait(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^\s*Food/.test(x.innerText) && x.closest(".sheet")); b.click(); }); await wait(400);
  const chips = await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-sub-filter"] .chip')].map((c) => c.innerText.trim()));
  ok(chips.length === 4 && chips[0] === "All subcategories" && chips.includes("Coffee") && chips.includes("Without a subcategory") && chips.filter((c) => /groceries/i.test(c)).length === 1, "chips: all, Coffee, Groceries once (any case), without one", chips);
  const count = () => page.evaluate(() => [...document.querySelectorAll(".list-sub")].map((x) => x.innerText).find((x) => / of \d/.test(x)) || "");
  await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-sub-filter"] .chip')].find((c) => /groceries/i.test(c.innerText)).click()); await wait(300);
  ok(/^2 of 5/.test(await count()), "Groceries: 2 of 5 entries", await count());
  await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-sub-filter"] .chip')].find((c) => /Without/.test(c.innerText)).click()); await wait(300);
  ok(/^1 of 5/.test(await count()), "without a subcategory: 1 of 5", await count());
  await page.close();
}
await browser.close();
finish("e2e_run36");
