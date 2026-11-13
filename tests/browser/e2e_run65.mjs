// Run 65 in the real bundled app (owner decisions 13 Nov): the monthly surplus / deficit by the app's classification rules, its notes, and the
// optional subcategories Alcohol, Tobacco & vaping, Lottery & betting. Synthetic data only.
import { launch, openPage, openAdd, tab, settle, ok, section, finish, baseSeed, tx, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const card = (page) => page.evaluate(() => (document.querySelector('[data-section="an-month-net"]') || {}).innerText || "");

section("R65-B1. Living on savings: a true deficit, and the money from savings is said apart");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ type: "income", category: "savout", amount: 500, date: TODAY }), tx({ amount: 120, date: TODAY })] }) });
  await tab(page, "Monthly"); await wait(400);
  const c = await card(page);
  ok(/120\.00/.test(c) && /Monthly deficit/.test(c) && /500\.00 taken from savings is not counted here/.test(c.replace(/\s*₼/g, "")), "no income, 120 spent: 'Monthly deficit 120.00', and a line says the 500 from savings is not counted", c);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R65-B2. A cost spread over months: the card says how it counts it");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ type: "income", category: "salary", amount: 1000, date: TODAY }), tx({ category: "shopping", amount: 1200, date: TODAY, spread: 12 })] }) });
  await tab(page, "Monthly"); await wait(400);
  const c = await card(page);
  ok(/900\.00/.test(c) && /Monthly surplus/.test(c) && /spread over months count here in monthly parts/.test(c), "1000 - 1200/12 = 900.00 surplus, with the note about spread costs", c);
  await page.close();
}

section("R65-B3. The new subcategories are offered, and fit at 320 px in az and ru");
for (const [lang, cat, sub] of [["en", "Food", "Alcohol"], ["en", "Shopping", "Tobacco & vaping"], ["en", "Entertainment", "Lottery & betting"], ["az", "Qida", "Spirtli içkilər"], ["ru", "Покупки", "Табак и вейпы"]]) {
  const page = await openPage(browser, { width: 320, height: 760, chooseLang: lang, seed: baseSeed({ language: lang }) }); await settle(page); await openAdd(page);
  await page.evaluate((c) => [...document.querySelectorAll(".cat-tile")].find((b) => b.innerText.trim() === c).click(), cat); await wait(400);
  const chip = await page.evaluate((s) => { const b = [...document.querySelectorAll('[data-section="add-subcat"] .sub-chip')].find((x) => x.innerText.trim() === s); return b ? { cut: b.scrollWidth > b.clientWidth + 1 } : null; }, sub);
  ok(chip && !chip.cut, `${lang}: ${cat} offers '${sub}', shown in full`, chip);
  await page.close();
}

section("R65-B4. The month card's labels fit at 320 px in az and ru");
for (const lang of ["az", "ru"]) {
  const page = await openPage(browser, { width: 320, height: 760, chooseLang: lang, seed: baseSeed({ language: lang, transactions: [tx({ type: "income", category: "salary", amount: 1000, date: TODAY }), tx({ type: "income", category: "savout", amount: 50, date: TODAY }), tx({ type: "income", category: "refund", amount: 20, date: TODAY }), tx({ amount: 100, date: TODAY })] }) });
  await tab(page, "Monthly"); await wait(400);
  const wide = await page.evaluate(() => [...document.querySelectorAll('[data-section="an-month-net"] *')].some((e) => e.getBoundingClientRect().right > innerWidth + 1 || e.scrollWidth > e.clientWidth + 1));
  ok(!wide, `${lang}: the monthly surplus card and its notes stay inside the screen`);
  await page.close();
}
section("R65-B5. Gifts page in Azerbaijani: a built-in subcategory is shown in Azerbaijani (found in the review screenshots)");
{
  const page = await openPage(browser, { chooseLang: "az", pre: () => localStorage.setItem("expense_ledger_v5__show_gifts", "1"), seed: baseSeed({ language: "az", transactions: [tx({ merchant: "Aysel", category: "gifts", subcategory: "Gifts", amount: 50, date: TODAY })] }) });   /* Run 71: the Gifts page is hidden by default */
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(400);
  await page.evaluate(() => [...document.querySelectorAll(".more-page .list-row, .more-page button")].find((x) => /Hədiyyə/.test(x.innerText)).click()); await page.waitForSelector('[data-section="gifts-row"]', { timeout: 4000 }); await wait(300);
  const row = await page.evaluate(() => document.querySelector('[data-section="gifts-row"]').innerText);
  ok(/Hədiyyələr/.test(row) && !/\bGifts\b/.test(row), "the row says 'Hədiyyələr', not the stored English 'Gifts'", row);
  await page.close();
}
await browser.close();
finish("e2e_run65");
