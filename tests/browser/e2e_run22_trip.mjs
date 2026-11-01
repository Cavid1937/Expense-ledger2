// Run 22 (2026-11-01) in the real bundled app: the optional trip / group tag on an entry. Synthetic data only.
import { launch, openPage, tab, openAdd, state, wait, ok, section, finish, tx, baseSeed, clickText, settle } from "./lib.mjs";
const browser = await launch();
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const record = async (page) => { await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/); await wait(500); };
const base = (o = {}) => baseSeed({ language: "en", transactions: [tx({ id: 1790002000001, merchant: "Old shop", amount: 5 })], ...o });

section("R22-B1. The add form saves a trip; entries without one get no field");
{
  const page = await openPage(browser, { seed: base() }); await settle(page);
  await openAdd(page);
  ok(!!(await page.$("#txn-trip")), "the add form has a Label, trip or group field");
  await setVal(page, ".amount-input", "12"); await setVal(page, "#txn-trip", "  Baku   trip "); await record(page);
  let st = await state(page);
  ok(st.transactions[0].trip === "Baku trip" && st.transactions[0].amount === 12, "saved with the cleaned trip name", st.transactions[0]);
  await openAdd(page); await setVal(page, ".amount-input", "3"); await record(page);
  st = await state(page);
  ok(!("trip" in st.transactions[0]), "an entry saved without a trip has no trip field at all", st.transactions[0]);
  ok(!("trip" in st.transactions.find((t) => t.merchant === "Old shop")), "the older entry was not touched");
  await openAdd(page);
  const opts = await page.evaluate(() => [...document.querySelectorAll("#txn-trip-list option")].map((o) => o.value));
  ok(opts.length === 1 && opts[0] === "Baku trip", "earlier trip names are offered as suggestions", opts);
  await page.close();
}
section("R22-B2. Ledger: trip filter and per-trip total; a row shows its trip; Clear resets");
{
  const seed = base({ transactions: [tx({ id: 1790002000010, merchant: "Hotel", amount: 100, trip: "Shaki" }), tx({ id: 1790002000011, merchant: "Bus", amount: 20.5, trip: "shaki" }), tx({ id: 1790002000012, merchant: "Groceries", amount: 5 })] });
  const page = await openPage(browser, { seed }); await tab(page, "Ledger"); await settle(page);
  const rows = () => page.evaluate(() => [...document.querySelectorAll(".txn-row")].map((r) => r.innerText.replace(/\s+/g, " ")));
  const labels = await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-trip-filter"] .chip')].map((b) => b.innerText.trim()));
  ok(labels.length === 2 && labels[0] === "All labels" && labels[1].toLowerCase() === "shaki", "one chip per trip ('Shaki' and 'shaki' are the same trip) plus All labels", labels);
  ok((await rows()).find((r) => /Hotel/.test(r) && /Shaki/.test(r)) && !(await rows()).find((r) => /Groceries/.test(r) && /haki/.test(r)), "a row shows its trip; an entry without one shows nothing extra", await rows());
  await page.evaluate(() => document.querySelectorAll('[data-section="tx-trip-filter"] .chip')[1].click()); await wait(250);
  ok((await rows()).length === 2, "filtering by the trip shows its two entries", (await rows()).length);
  const total = await page.evaluate(() => (document.querySelector('[data-section="tx-trip-total"]') || {}).innerText || "");
  ok(/120[.,]50/.test(total) && /2/.test(total), "the trip total is 120.50 over 2 entries", total);
  await page.evaluate(() => [...document.querySelectorAll(".filter-bar .chip")].find((b) => /clear/i.test(b.innerText)).click()); await wait(250);
  ok((await rows()).length === 3 && !(await page.$('[data-section="tx-trip-total"]')), "Clear shows everything again and removes the total", (await rows()).length);
  await page.close();
}
section("R22-B3. Editing changes or removes the trip");
{
  const page = await openPage(browser, { seed: base({ transactions: [tx({ id: 1790002000020, merchant: "Cafe", amount: 9, trip: "Qəbələ" })] }) });
  await tab(page, "Ledger"); await settle(page);
  const edit = async () => { await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => r.innerText.includes("Cafe")).click()); await wait(350); await clickText(page, ".sheet button", /^\s*edit\s*$/i); await page.waitForSelector(".add-overlay"); await wait(400); };
  await edit();
  ok((await page.$eval("#txn-trip", (e) => e.value)) === "Qəbələ", "editing opens with the entry's own trip (az letters intact)");
  await setVal(page, "#txn-trip", "Lahic"); await clickText(page, ".add-overlay .btn-primary", /save|update/i); await wait(500);
  let st = await state(page); ok(st.transactions[0].trip === "Lahic", "changing the trip while editing saves it", st.transactions[0].trip);
  await edit(); await setVal(page, "#txn-trip", ""); await clickText(page, ".add-overlay .btn-primary", /save|update/i); await wait(500);
  st = await state(page); ok(!("trip" in st.transactions[0]), "clearing the field removes the trip (no empty text stored)", st.transactions[0]);
  await page.close();
}
await browser.close();
finish("e2e_run22_trip");
