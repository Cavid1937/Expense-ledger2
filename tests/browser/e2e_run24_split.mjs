// Run 24: split one entry into several from its detail sheet; totals are unchanged and one Undo restores it. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, state, bodyText } from "./lib.mjs";
const browser = await launch();
const seed = (language) => baseSeed({ language, transactions: [tx({ merchant: "Bravo", amount: 45.5, category: "shopping" }), tx({ merchant: "Rent", amount: 100, category: "housing", recurring: true, recurFreq: "monthly" })] });
const type = (page, sel, i, v) => page.evaluate((s, n, val) => { const el = document.querySelectorAll(s)[n]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, sel, i, v);
const openRow = async (page, name) => { await page.evaluate((nm) => { document.querySelectorAll(".tab-btn")[1].click(); }, name); await wait(500); await page.evaluate((nm) => [...document.querySelectorAll(".txn-row")].find((r) => r.innerText.includes(nm)).click(), name); await wait(450); };
const sum = (s) => Math.round(s.transactions.reduce((a, x) => a + x.amount * 100, 0));

section("R24-SPB1. Split, check totals, undo");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  const before = await state(page); const total = sum(before);
  await openRow(page, "Bravo");
  await page.evaluate(() => document.querySelector('[data-section="split-open"]').click()); await wait(300);
  ok(await page.evaluate(() => document.querySelector('[data-section="split-save"]').disabled), "Split is disabled until the parts add up");
  await type(page, '[data-section="split"] input', 0, "30.10"); await wait(150);
  ok(/15\.40/.test(await page.evaluate(() => document.querySelector('[data-section="split-left"]').innerText)), "it shows 15.40 left to assign");
  await type(page, '[data-section="split"] input', 1, "15.4"); await wait(200);
  await page.evaluate(() => { [["food", 0], ["shopping", 1]].forEach(([v, i]) => { const sel = document.querySelectorAll('[data-section="split"] select')[i]; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; set.call(sel, v); sel.dispatchEvent(new Event("change", { bubbles: true })); }); }); await wait(200);
  ok(await page.evaluate(() => !document.querySelector('[data-section="split-save"]').disabled), "with 30.10 + 15.40 the Split button is enabled");
  await page.evaluate(() => document.querySelector('[data-section="split-save"]').click()); await wait(500);
  const after = await state(page);
  const parts = after.transactions.filter((x) => x.merchant === "Bravo");
  ok(parts.length === 2 && after.transactions.length === before.transactions.length + 1, "the entry became two entries", parts.map((p) => [p.category, p.amount]));
  ok(sum(after) === total, "the grand total is unchanged to the cent");
  ok(parts.some((p) => p.category === "food" && p.amount === 30.1) && parts.some((p) => p.category === "shopping" && p.amount === 15.4), "30.10 Food and 15.40 Shopping");
  ok(/Split into 2 entries/.test(await bodyText(page)), "the message says Split into 2 entries");
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /undo/i.test(x.innerText)); b && b.click(); }); await wait(500);
  const back = await state(page);
  ok(back.transactions.length === before.transactions.length && back.transactions.some((x) => x.merchant === "Bravo" && x.amount === 45.5), "Undo brings the original entry back");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-SPB2. Recurring entries cannot be split; az and ru labels");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  await openRow(page, "Rent");
  ok(await page.evaluate(() => !document.querySelector('[data-section="split-open"]')), "a recurring entry has no Split button");
  await page.close();
  for (const [l, re] of [["az", /Kateqoriyalara böl/], ["ru", /Разделить по категориям/]]) {
    const p = await openPage(browser, { seed: seed(l) }); await settle(p); await openRow(p, "Bravo");
    ok(re.test(await p.evaluate(() => (document.querySelector('[data-section="split-open"]') || {}).innerText || "")), `${l}: button label`);
    await p.close();
  }
}
await finish("e2e_run24_split", browser);
