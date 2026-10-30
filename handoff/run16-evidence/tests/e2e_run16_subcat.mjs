// Run 16 (2026-10-29) in the real bundled app: the user's own subcategories. Synthetic data only.
import { launch, openPage, openAdd, state, wait, ok, section, finish, baseSeed, clickText, settle, KEY } from "./lib.mjs";
const browser = await launch();
const setAmount = (page, v) => page.$eval(".amount-input", (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__subcats") || "null"));
const chipsText = (page) => page.evaluate(() => [...document.querySelectorAll('[data-section="add-subcat"] .sub-chip')].map((b) => b.innerText.trim()));
const typeNew = async (page, text) => { await page.evaluate(() => { const b = document.querySelector('[data-section="add-subcat-new"]'); if (b) b.click(); }); await wait(150);
  await page.$eval('[data-section="add-subcat"] input', (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, text); };
const save = async (page) => { await clickText(page, '[data-section="add-subcat"] button', /^\s*save\s*$/i); await wait(250); };

section("R16-S1. Add your own subcategory in the add form");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await openAdd(page); await setAmount(page, "8");
  ok(!!(await page.$('[data-section="add-subcat-new"]')), "the subcategory row offers a '+ My own' button");
  await typeNew(page, "  Street   food "); await save(page);
  ok((await chipsText(page)).includes("Street food"), "the new name (trimmed, inner spaces collapsed) appears as a chip", await chipsText(page));
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-section="add-subcat"] .sub-chip')].some((b) => b.innerText.trim() === "Street food" && b.getAttribute("aria-pressed") === "true")), "and is selected for this entry");
  const s = await stored(page); ok(s && s.byCategory.food && s.byCategory.food[0] === "Street food", "it is stored in its own key", s);
  await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(500);
  const st = await state(page); ok(st.transactions[0].subcategory === "Street food", "the entry keeps the text as its subcategory (same field as built-in ones)", st.transactions[0].subcategory);
  ok(!JSON.stringify(st).includes("byCategory"), "nothing about the list is written into the ledger key");
  await openAdd(page); await setAmount(page, "2"); ok((await chipsText(page)).includes("Street food"), "next time the chip is still offered");
  await typeNew(page, "street FOOD"); await save(page);
  ok(/already/i.test(await page.evaluate(() => (document.querySelector('[data-section="add-subcat"] [role=alert]') || {}).innerText || "")), "the same name again says it is already in the list", await page.evaluate(() => (document.querySelector('[data-section="add-subcat"] [role=alert]') || {}).innerText));
  await typeNew(page, "Coffee"); await save(page);
  ok(/already/i.test(await page.evaluate(() => (document.querySelector('[data-section="add-subcat"] [role=alert]') || {}).innerText || "")), "a built-in name (Coffee) is refused the same way");
  await page.evaluate(() => [...document.querySelectorAll('[data-section="add-subcat"] button')].find((b) => /cancel|✕/i.test(b.innerText + (b.getAttribute("aria-label") || ""))).click()); await wait(150);
  await page.evaluate(() => document.querySelector('.sub-chip-x').click()); await wait(250);
  ok(!(await chipsText(page)).includes("Street food") && !(await stored(page)), "removing it from the list removes the chip and the stored key (the old entry still has its text)");
  ok((await state(page)).transactions[0].subcategory === "Street food", "the earlier entry still shows Street food");
  await page.close();
}
section("R16-S2. Backup export carries them; az and ru show real words");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "az" }) }); await settle(page);
  await page.evaluate(() => localStorage.setItem("expense_ledger_v5__subcats", JSON.stringify({ version: 1, byCategory: { food: ["Pizza"] } })));
  await page.reload(); await page.waitForSelector(".tabbar"); await settle(page);
  await openAdd(page); const chips = await chipsText(page);
  ok(chips.includes("Pizza") && chips.some((c) => /Özümünkü/.test(c)), "az: the saved name and the translated '+ My own' button are shown", chips);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); ok(!ov, "az: no horizontal overflow");
  await page.close();
  const p2 = await openPage(browser, { seed: baseSeed({ language: "ru" }) });
  await openAdd(p2); const c2 = await chipsText(p2); ok(c2.some((c) => /Своя/.test(c)), "ru: the translated '+ My own' button is shown", c2);
  await p2.close();
}
await browser.close();
finish("e2e_run16_subcat");
