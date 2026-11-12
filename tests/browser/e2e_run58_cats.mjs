// Run 58 in the real bundled app (owner-approved category audit): the new Personal care tile, the renamed "Phone & subs" tile and its hint,
// tile names that fit at 320 px in az/ru/en, an older entry keeping a subcategory that is no longer offered, and the Gifts page. Synthetic data only.
import { launch, openPage, openAdd, openCategories, tab, settle, clickText, state, ok, section, finish, baseSeed, tx, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const tileNames = (page) => page.evaluate(() => [...document.querySelectorAll(".cat-tile .cat-tile-name")].map((e) => e.innerText.trim()).filter(Boolean));

section("R58-B1. Add form: new tiles, and a hint where people look in the wrong place");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  const names = await tileNames(page);
  ok(names.includes("Personal care") && names.includes("Phone & subs") && !names.includes("Bills & subs"), "tiles: 'Personal care' is new, 'Bills & subs' is now 'Phone & subs'", names);
  await page.evaluate(() => [...document.querySelectorAll(".cat-tile")].find((b) => b.innerText.trim() === "Phone & subs").click()); await wait(450);
  const hint = await page.evaluate(() => (document.querySelector('[data-section="add-cat-hint"]') || {}).innerText || "");
  ok(/Electricity, gas, water and heating are under Home/.test(hint), "choosing it shows where electricity, gas and water live", hint);
  const chips = await page.evaluate(() => [...document.querySelectorAll('[data-section="add-subcat"] .sub-chip')].map((b) => b.innerText.trim()));
  ok(chips.includes("TV") && chips.includes("Home phone") && !chips.includes("Other Subs"), "its subcategories offer TV and Home phone; 'Other Subs' is gone", chips);
  await page.evaluate(() => [...document.querySelectorAll(".cat-tile")].find((b) => b.innerText.trim() === "Food").click()); await wait(450);
  ok(!(await page.evaluate(() => { const h = document.querySelector('[data-section="add-cat-hint"]'); return h && h.offsetHeight > 0 && h.innerText.trim(); })), "Food has no hint, so none is shown");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R58-B2. Every tile name fits at 320 px, in all three languages");
for (const lang of ["az", "ru", "en"]) {
  const page = await openPage(browser, { width: 320, height: 760, chooseLang: lang, seed: baseSeed({ language: lang }) }); await settle(page); await openAdd(page);
  const cut = await page.evaluate(() => [...document.querySelectorAll(".cat-tile .cat-tile-name")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText));
  const n = await page.evaluate(() => document.querySelectorAll(".cat-tile").length);
  ok(n >= 17 && cut.length === 0, `${lang}: all ${n} tiles show their whole name`, cut);
  await page.close();
}

section("R58-B3. An older entry keeps a subcategory that is no longer offered");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "Station 7", category: "transport", subcategory: "Fuel", amount: 40, date: TODAY })] });
  const page = await openPage(browser, { seed }); await tab(page, "Ledger"); await settle(page);
  const row = await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => /Station 7/.test(r.innerText)).innerText);
  ok(/Fuel/.test(row), "the entry still shows 'Fuel'", row);
  await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => /Station 7/.test(r.innerText)).click()); await page.waitForSelector(".sheet"); await wait(400);
  await clickText(page, ".sheet .btn", /^Edit/); await page.waitForSelector(".add-overlay"); await wait(500);
  const kept = await page.evaluate(() => { const b = document.querySelector('[data-section="add-subcat-kept"]'); return b ? { text: b.innerText.trim(), sel: b.classList.contains("sel") } : null; });
  ok(kept && kept.text === "Fuel" && kept.sel, "editing it shows 'Fuel' as the chosen subcategory, although Transport no longer offers it", kept);
  await page.evaluate(() => { const b = document.querySelector(".add-overlay .btn-primary.btn-full"); b.click(); }); await wait(600);
  const saved = (await state(page)).transactions.find((x) => x.merchant === "Station 7");
  ok(saved && saved.category === "transport" && saved.subcategory === "Fuel" && saved.amount === 40, "saving without changes keeps Transport / Fuel / 40.00", saved && [saved.category, saved.subcategory, saved.amount]);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R58-B4. The Gifts page leaves out haircuts recorded under the old 'Gifts & Personal'");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "Aysel", category: "gifts", subcategory: "Gifts", amount: 100, date: TODAY }),
    tx({ merchant: "Salon", category: "gifts", subcategory: "Barber / Hair", amount: 15, date: TODAY }), tx({ merchant: "Shop", category: "gifts", subcategory: "Cosmetics", amount: 25, date: TODAY })] });
  const page = await openPage(browser, { seed });
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(400);
  await clickText(page, ".list-row, button", /^Gifts/); await page.waitForSelector('[data-section="gifts-page"]', { timeout: 4000 }); await wait(400);
  const given = await page.evaluate(() => document.querySelector('[data-section="gifts-given"]').innerText);
  ok(/100\.00/.test(given) && !/140/.test(given), "Given shows 100.00, not 140.00", given);
  ok((await page.$$('[data-section="gifts-row"]')).length === 1, "one gift row (the haircut and cosmetics are not listed)");
  ok((await state(page)).transactions.filter((x) => x.category === "gifts").length === 3, "all three entries are still stored as they were");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R58-B5. Tidy up categories: tick, move, Undo");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "Salon", category: "gifts", subcategory: "Barber / Hair", amount: 15, date: TODAY }),
    tx({ merchant: "Station 7", category: "transport", subcategory: "Fuel", amount: 40, date: TODAY }), tx({ merchant: "Net", category: "transport", subcategory: "Fuel", amount: 30, date: TODAY, recurring: true, recurFreq: "monthly" })] });
  const page = await openPage(browser, { seed }); await openCategories(page);
  const card = await page.evaluate(() => { const c = document.querySelector('[data-section="tidy-cats"]'); return c ? { text: c.innerText, rows: [...c.querySelectorAll("[data-tidy]")].map((r) => r.getAttribute("data-tidy")), ticked: [...c.querySelectorAll("input[type=checkbox]")].filter((i) => i.checked).length, disabled: c.querySelector('[data-section="tidy-move"]').disabled } : null; });
  ok(card && card.rows.join() === "gifts-barber,transport-fuel" && card.ticked === 0 && card.disabled, "the card offers 2 moves, nothing ticked, the button off until something is ticked", card && card.rows);
  ok(card && /1 entry: Gifts & Donations \/ Barber \/ Hair → Personal Care \/ Barber \/ Hair/.test(card.text) && /1 entry: Transport \/ Fuel → Car \/ Fuel/.test(card.text), "each move says how many entries go from where to where (the repeating fuel entry is not counted)", card && card.text);
  await page.evaluate(() => document.querySelector('[data-tidy="gifts-barber"] input').click()); await wait(400);
  const month = await page.evaluate(() => (document.querySelector('[data-section="tidy-month"]') || {}).innerText || "");
  ok(/This month: Gifts & Donations 15\.00 ₼ less, Personal Care 15\.00 ₼ more/.test(month), "ticking it shows what changes in this month's figures before anything moves", month);
  const before = (await state(page)).transactions;
  await page.evaluate(() => document.querySelector('[data-section="tidy-move"]').click()); await wait(500);
  let st = await state(page);
  const salon = st.transactions.find((x) => x.merchant === "Salon"), fuel = st.transactions.find((x) => x.merchant === "Station 7");
  ok(salon.category === "personal" && salon.subcategory === "Barber / Hair" && salon.amount === 15 && fuel.category === "transport", "only the ticked move happened: the haircut is in Personal Care; the fuel entry was not ticked and stays", [salon.category, fuel.category]);
  ok(/Moved 1 entry/.test(await page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "")), "an Undo bar says what was moved");
  await page.evaluate(() => document.querySelector(".snackbar-undo").click()); await wait(500);
  st = await state(page);
  ok(JSON.stringify(st.transactions) === JSON.stringify(before), "Undo: every entry is exactly as before");
  await page.evaluate(() => document.querySelector('[data-section="tidy-later"]').click()); await wait(400);
  ok(!(await page.$('[data-section="tidy-cats"]')), "'Not now' hides the card");
  await page.reload(); await page.waitForSelector(".tabbar"); await openCategories(page);
  ok(!(await page.$('[data-section="tidy-cats"]')), "and it stays hidden after the app is opened again");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run58_cats");
