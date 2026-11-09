// Run 50 in the real bundled app: the Gifts page (More > Gifts): totals, people, search, and "I gave a gift" opening the Add screen.
import { launch, openPage, clickText, ok, section, finish, baseSeed, tx, wait } from "./lib.mjs";
const browser = await launch();
const seed = baseSeed({ transactions: [
  tx({ merchant: "Aysel", note: "Wedding", category: "gifts", amount: 100, date: "2026-06-10" }),
  tx({ merchant: "Aysel", note: "Birthday", category: "gifts", amount: 30.1, date: "2026-09-01" }),
  tx({ type: "income", merchant: "Uncle", note: "Birthday", category: "giftin", amount: 20, date: "2026-09-02" }),
  tx({ merchant: "Shop", category: "food", amount: 999, date: "2026-09-03" }),
] });
const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || "", sel);

section("R50-GB1. Open the page from More");
const page = await openPage(browser, { seed });
await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(400);
await clickText(page, ".list-row, button", /^Gifts/); await page.waitForSelector('[data-section="gifts-page"]', { timeout: 4000 }); await wait(400);
ok(/130/.test(await text(page, '[data-section="gifts-given"]')), "Given shows 130.10 (100 + 30.10); the 999 food entry is not a gift", await text(page, '[data-section="gifts-given"]'));
ok(/20/.test(await text(page, '[data-section="gifts-received"]')), "Received shows 20");
ok((await page.$$('[data-section="gifts-row"]')).length === 3, "three gift rows");
ok((await page.$$('[data-section="gifts-person"]')).length === 2, "two people: Aysel and Uncle");
section("R50-GB2. Search");
await page.type("#gifts-q", "wedding"); await wait(300);
ok((await page.$$('[data-section="gifts-row"]')).length === 1, "searching 'wedding' leaves one row");
ok(/130/.test(await text(page, '[data-section="gifts-given"]')), "the totals at the top stay for all gifts while searching");
await page.evaluate(() => { const i = document.querySelector("#gifts-q"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "nobody"); i.dispatchEvent(new Event("input", { bubbles: true })); }); await wait(300);
ok((await page.$$('[data-section="gifts-row"]')).length === 0 && /Nothing matches/.test(await text(page, '[data-section="gifts-entries"]')), "no match says so");
section("R50-GB3. Adding goes through the normal Add screen");
await page.evaluate(() => document.querySelector('[data-section="gifts-add-given"]').click()); await page.waitForSelector(".add-overlay", { timeout: 4000 }); await wait(500);
const addText = await text(page, ".add-overlay");
ok(/Gifts/.test(addText), "the Add screen opens with the Gifts category chosen", addText.slice(0, 200));
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close(); await browser.close();
finish("e2e_run50gifts");
