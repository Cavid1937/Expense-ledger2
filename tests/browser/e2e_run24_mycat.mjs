// Run 24: add an own category in Settings; it shows in the add form, survives a reload, and cannot be removed while an entry uses it.
import { launch, openPage, openSettings, openAdd, wait, ok, section, finish, baseSeed, tx, settle, state, bodyText } from "./lib.mjs";
const browser = await launch();
const CK = "expense_ledger_v5__cats";
const type = (page, sel, v) => page.$eval(sel, (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);

section("R24-MCB1. Add, use, reload, refuse removal");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5 })] }) }); await settle(page);
  await openSettings(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="my-categories"]')), "the My categories section is in Settings");
  ok(await page.evaluate(() => document.querySelector('[data-section="mycat-add"]').disabled), "Add is disabled while the name is empty");
  await type(page, "#mycat-name", "Pets food"); await wait(150);
  await page.evaluate(() => document.querySelector('[data-section="mycat-add"]').click()); await wait(400);
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), CK);
  ok(stored && stored.cats.length === 1 && stored.cats[0].name === "Pets food" && /^u_/.test(stored.cats[0].id), "saved under its own key (the ledger key is untouched)", stored);
  ok(await page.evaluate(() => /Pets food/.test(document.querySelector('[data-section="my-categories"]').innerText)), "it is listed");
  await type(page, "#mycat-name", "pets FOOD"); await page.evaluate(() => document.querySelector('[data-section="mycat-add"]').click()); await wait(300);
  ok((await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).cats.length, CK)) === 1, "a duplicate name is refused");
  await page.evaluate(() => document.querySelector(".sheet [aria-label='Close'], .sheet .sheet-close")?.click()); await page.keyboard.press("Escape").catch(() => {}); await wait(300);
  await page.reload(); await settle(page); await wait(400);
  await openAdd(page);
  ok(/Pets food/.test(await bodyText(page)), "after a reload the category is offered in the add form");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-MCB2. In use cannot be removed; az and ru labels");
{
  const id = "u_abc123";
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5, category: id })] }), pre: () => { try { if (!sessionStorage.getItem("__s")) { sessionStorage.setItem("__s", "1"); localStorage.setItem("expense_ledger_v5__cats", JSON.stringify({ version: 1, cats: [{ id: "u_abc123", name: "Pets food", income: false, color: "#68D391" }] })); } } catch {} } });
  await settle(page); await openSettings(page);
  await page.evaluate(() => document.querySelector('[data-section="my-categories"] [data-cat] button').click()); await wait(300);
  ok((await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).cats.length, CK)) === 1, "an entry uses it, so Remove does nothing");
  await page.close();
  for (const [l, re] of [["az", /Mənim kateqoriyalarım/], ["ru", /Мои категории/]]) {
    const p = await openPage(browser, { seed: baseSeed({ language: l }) }); await settle(p); await openSettings(p);
    ok(re.test(await p.evaluate(() => document.querySelector('[data-section="my-categories"]').innerText)), `${l}: section title`);
    await p.close();
  }
}
await finish("e2e_run24_mycat", browser);
