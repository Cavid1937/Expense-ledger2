// Run 16 (2026-10-29) in the real bundled app: which wallet an entry was paid from. Synthetic data only.
import { launch, openPage, tab, openAdd, state, wait, ok, section, finish, tx, baseSeed, clickText, bodyText, settle } from "./lib.mjs";
const browser = await launch();
const setAmount = (page, v) => page.$eval(".amount-input", (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const chips = (page) => page.evaluate(() => [...document.querySelectorAll('[data-section="add-wallet"] [role=radio]')].map((b) => [b.innerText.trim(), b.getAttribute("aria-checked")]));
const pick = (page, i) => page.evaluate((i) => document.querySelectorAll('[data-section="add-wallet"] [role=radio]')[i].click(), i);
const record = async (page) => { await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/); await wait(500); };
const base = (o = {}) => baseSeed({ language: "en", transactions: [tx({ id: 1790001000001, merchant: "Old shop", amount: 5 })], ...o });

section("R16-B1. The add form offers four wallets; nothing is chosen the first time; the last one is remembered");
{
  const page = await openPage(browser, { seed: base() }); await settle(page);
  await openAdd(page); let c = await chips(page);
  ok(c.length === 4 && c.map((x) => x[0]).join("|") === "Cash|Bank card|Mobile wallet|Other", "four wallets: Cash, Bank card, Mobile wallet, Other", c);
  ok(c.every((x) => x[1] === "false"), "no entry has a wallet yet, so none is pre-selected");
  ok((await page.evaluate(() => document.querySelector('[data-section="add-wallet"]').getAttribute("role"))) === "radiogroup", "the chips form a radio group (one choice) for screen readers");
  await setAmount(page, "12"); await pick(page, 0); c = await chips(page); ok(c[0][1] === "true", "tapping Cash selects it", c);
  await record(page);
  let st = await state(page); ok(st.transactions[0].wallet === "cash" && st.transactions[0].amount === 12, "the new entry is saved with wallet cash", st.transactions[0]);
  ok(!("wallet" in st.transactions.find((t) => t.merchant === "Old shop")), "the older entry was not touched: it still has no wallet field");
  await openAdd(page); c = await chips(page); ok(c[0][1] === "true", "the next new entry starts with Cash selected (the wallet used last)", c);
  await setAmount(page, "7"); await pick(page, 1); await record(page);
  st = await state(page); ok(st.transactions[0].wallet === "card", "choosing Bank card instead saves card", st.transactions[0].wallet);
  await openAdd(page); await setAmount(page, "3"); await pick(page, 1); c = await chips(page); ok(c[1][1] === "false", "tapping the chosen wallet again clears it", c);
  await record(page); st = await state(page); ok(!("wallet" in st.transactions[0]), "a cleared wallet is not stored at all (no empty text)", st.transactions[0]);
  await page.close();
}
section("R16-B2. Edit and duplicate keep or change the wallet; an unknown wallet from a newer version is kept");
{
  const page = await openPage(browser, { seed: base({ transactions: [tx({ id: 1790001000002, merchant: "Wallet shop", amount: 20, wallet: "mobile" }), tx({ id: 1790001000003, merchant: "Future", amount: 9, wallet: "e-wallet" })] }) });
  await tab(page, "Ledger"); await settle(page);
  const open = async (name) => { await page.evaluate((n) => [...document.querySelectorAll(".txn-row")].find((r) => r.innerText.includes(n)).click(), name); await wait(350); };
  await open("Wallet shop"); ok(/Mobile wallet/.test(await page.evaluate(() => document.querySelector(".detail-meta").innerText)), "the entry's detail shows Paid with: Mobile wallet");
  await clickText(page, ".sheet button", /^\s*edit\s*$/i); await page.waitForSelector(".add-overlay"); await wait(400);
  let c = await chips(page); ok(c[2][1] === "true", "editing opens with the entry's own wallet selected (not the last used)", c);
  await pick(page, 3); await clickText(page, ".add-overlay .btn-primary", /save|update/i); await wait(500);
  let st = await state(page); ok(st.transactions.find((t) => t.merchant === "Wallet shop").wallet === "other", "changing the wallet while editing saves it", st.transactions.map((t) => t.wallet));
  await open("Future"); await clickText(page, ".sheet button", /^\s*edit\s*$/i); await page.waitForSelector(".add-overlay"); await wait(400);
  c = await chips(page); ok(c.length === 5 && c[4][1] === "true", "a wallet this version does not know is shown as a selected extra chip", c);
  await clickText(page, ".add-overlay .btn-primary", /save|update/i); await wait(500);
  st = await state(page); ok(st.transactions.find((t) => t.merchant === "Future").wallet === "e-wallet", "saving without touching it keeps the unknown wallet exactly (e-wallet)", st.transactions.map((t) => t.wallet));
  await open("Wallet shop"); await clickText(page, ".sheet button", /duplicate/i); await page.waitForSelector(".add-overlay"); await wait(400);
  c = await chips(page); ok(c[3][1] === "true", "Duplicate starts with the same wallet", c);
  await page.close();
}
section("R16-B3. The entry list, the filter and Analytics");
{
  const seed = base({ transactions: [tx({ id: 1790001000010, merchant: "A cash", amount: 10, wallet: "cash" }), tx({ id: 1790001000011, merchant: "B card", amount: 20, wallet: "card" }), tx({ id: 1790001000012, merchant: "C unset", amount: 5 })] });
  const page = await openPage(browser, { seed }); await tab(page, "Ledger"); await settle(page);
  const rows = () => page.evaluate(() => [...document.querySelectorAll(".txn-row")].map((r) => r.innerText.replace(/\s+/g, " ")));
  ok((await rows()).find((r) => /A cash/.test(r) && /Cash/.test(r)) && !(await rows()).find((r) => /C unset/.test(r) && /Cash|Bank card/.test(r)), "a row shows its wallet next to the category; an entry without one shows nothing extra", await rows());
  const filt = async (label) => page.evaluate((l) => [...document.querySelectorAll('[data-section="tx-wallet-filter"] .chip')].find((b) => b.innerText.trim() === l).click(), label);
  const labels = await page.evaluate(() => [...document.querySelectorAll('[data-section="tx-wallet-filter"] .chip')].map((b) => b.innerText.trim()));
  ok(labels.join("|") === "All wallets|Cash|Bank card|Not set", "the wallet filter lists All, only the wallets in use, and Not set", labels);
  await filt("Bank card"); await wait(200); ok((await rows()).length === 1 && /B card/.test((await rows())[0]), "filtering by Bank card shows only that entry", await rows());
  await filt("Not set"); await wait(200); ok((await rows()).length === 1 && /C unset/.test((await rows())[0]), "Not set shows the entries without a wallet", await rows());
  await page.evaluate(() => [...document.querySelectorAll(".filter-bar .chip")].find((b) => /clear/i.test(b.innerText)).click()); await wait(200);
  ok((await rows()).length === 3, "Clear shows everything again", (await rows()).length);
  await tab(page, "Monthly"); await settle(page);
  const card = await page.evaluate(() => { const e = document.querySelector('[data-section="an-wallet"]'); return e ? e.innerText.replace(/\s+/g, " ") : ""; });
  ok(/Spending by wallet/.test(card) && /Cash/.test(card) && /Bank card/.test(card) && /Not set/.test(card), "Analytics shows 'Spending by wallet' with Cash, Bank card and Not set", card);
  await page.close();
  const p2 = await openPage(browser, { seed: base() }); await tab(p2, "Ledger"); await settle(p2);
  ok(!(await p2.$('[data-section="tx-wallet-filter"]')), "no entry has a wallet: no wallet filter is shown");
  await tab(p2, "Monthly"); await settle(p2); ok(!(await p2.$('[data-section="an-wallet"]')), "and no wallet card on Analytics");
  await p2.close();
}
section("R16-B4. az and ru show real words, not keys");
for (const lang of ["az", "ru"]) {
  const page = await openPage(browser, { seed: base({ language: lang, transactions: [tx({ id: 1790001000020, merchant: "X", amount: 4, wallet: "card" })] }) }); await settle(page);
  await openAdd(page); const c = await chips(page);
  ok(c.length === 4 && c.every((x) => x[0].length > 2 && !/wallet\./.test(x[0])), `${lang}: four translated wallet chips`, c);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); ok(!ov, `${lang}: no horizontal overflow in the add form at 390 px`);
  await page.close();
}
await browser.close();
finish("e2e_run16_wallet");
