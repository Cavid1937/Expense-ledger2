// Run 75 in the real bundled app: payments from bank notifications. The Android side is a stand-in (window.LedgerNative.notices) holding
// kept notices; their texts copy only the layout of real ones, with invented places and amounts. Synthetic data only.
import { launch, openPage, openData, state, ok, section, finish, baseSeed, wait } from "./lib.mjs";
const browser = await launch();
const SHELL = (allowed, items) => `window.__opened = 0; window.LedgerNative = { notices: { status: async () => ${allowed}, openSettings: async () => { window.__opened++; }, take: async () => { const x = window.__items || []; window.__items = []; return x; }, onAdded: async () => ({ remove() {} }) } }; window.__items = ${JSON.stringify(items)};`;
const now = Date.now();
const ITEMS = [{ text: "💳 Payment: -4.20 ₼\nKAFE ARAZ\nCard: **4321\nBalance: 95.80 ₼", time: now - 3600000, app: "bank" }, { text: "Your parcel arrives tomorrow", time: now - 1800000, app: "post" }];

section("R75-NB1. Only in the Android app; off by default; asks Android for access");
{
  let page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await openData(page);
  ok(!(await page.$('[data-section="io-notices"]')), "the website (no Android app) does not show the card");
  await page.close();
  page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre: SHELL(false, ITEMS) }); await openData(page); await wait(400);
  const card = await page.evaluate(() => (document.querySelector('[data-section="io-notices"]') || {}).innerText || "");
  ok(/Offer payments from bank notifications/.test(card) && /nothing is sent anywhere/.test(card) && (await page.evaluate(() => document.querySelector('[data-section="notices-toggle"]').getAttribute("aria-checked"))) === "false", "the card explains what is kept and that nothing is sent; it is off", card.slice(0, 200));
  ok(!(await page.$('[aria-label="Restore backup"]')) && (await page.evaluate(() => window.__items.length)) === 2, "while off, kept notices are not even read");
  await page.evaluate(() => document.querySelector('[data-section="notices-toggle"]').click()); await wait(400);
  ok((await page.evaluate(() => window.__opened)) === 1 && /not given the app notification access/.test(await page.evaluate(() => document.querySelector('[data-section="io-notices"]').innerText)), "turning it on without Android's permission opens Android's settings and says what to do");
  await page.close();
}

section("R75-NB2. With access: the payment is offered in the usual review, never added by itself");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre: SHELL(true, ITEMS) + `localStorage.setItem("expense_ledger_v5__notices","1");` });
  await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 8000 }); await wait(400);
  const sh = await page.evaluate(() => document.querySelector('[aria-label="Restore backup"]').innerText);
  ok(/Payments from bank notifications/.test(sh) && /1 entr(y|ies) ready/.test(sh) && /KAFE ARAZ/.test(sh) && !/4321|parcel/i.test(sh), "on opening the app: one payment (KAFE ARAZ) is offered; the parcel notice is ignored; no card digits", sh.slice(0, 300));
  ok((await state(page)).transactions.length === 0, "nothing is added before the person confirms");
  await page.evaluate(() => document.querySelector('[data-section="import-go"]').click()); await wait(700);
  const e = (await state(page)).transactions[0];
  ok(e && e.amount === 4.2 && e.type === "expense" && /KAFE ARAZ/.test(e.merchant) && !JSON.stringify(e).includes("95.80"), "after confirming: 4.20 out at KAFE ARAZ, the bank balance is not stored", e);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run75_notices");
