// Run 39 (2026-11-07): an entry paid in another currency, on the real add form. The rate service is replaced by a fake inside the page
// (the test browser blocks the internet); offline is the real blocked case. Synthetic data only.
import { launch, openPage, openAdd, wait, ok, section, finish, baseSeed, settle, state, tab, tx, TODAY } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const setVal = (page, sel, v) => page.$eval(sel, (el, val) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const fakeRates = `(() => { const real = window.fetch; window.__fxCalls = []; window.fetch = async (u, o) => { const s = String(u); if (s.includes("api.frankfurter.dev")) { window.__fxCalls.push(s); const cur = (s.match(/base=([A-Z]{3})/) || [])[1]; const rate = { EUR: 1.9037, USD: 1.7 }[cur]; return new Response(JSON.stringify({ date: "${TODAY}", base: cur, quote: "AZN", rate }), { status: 200, headers: { "Content-Type": "application/json" } }); } return real(u, o); }; })()`;
const save = (page) => page.evaluate(() => document.querySelector(".add-foot .btn-primary").click());
const line = (page) => page.evaluate(() => (document.querySelector('[data-section="fx-line"]') || {}).innerText || "");

section("R39-B1. 100 EUR at the official rate is saved as 190.37 ₼, and remembers what was paid");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", currency: "₼" }), pre: fakeRates }); await phone(page); await settle(page); await openAdd(page);
  ok(!!(await page.$('[data-section="fx-cur"]')), "the currency sign is a button");
  await page.evaluate(() => document.querySelector('[data-section="fx-cur"]').click()); await wait(350);
  await page.evaluate(() => document.querySelector('[data-section="fx-list"] [data-fx="EUR"]').click()); await wait(400);
  await setVal(page, ".amount-input", "100"); await wait(150);
  const l = await line(page);
  ok(/=\s*190\.37/.test(l) && /1 EUR = 1\.9037/.test(l) && /Central Bank of Azerbaijan/.test(l), "it shows = 190.37 ₼ · 1 EUR = 1.9037 ₼, from the Central Bank", l);
  // Run 53: the app also fetches today's rates for a few currencies when it opens, so other codes may appear; EVERY request must still be
  // exactly "a currency code and a date" (stricter than before: the whole address is checked), and the euro must be among them.
  { const fxCalls = await page.evaluate(() => window.__fxCalls);
    ok(fxCalls.some((u) => /base=EUR/.test(u)) && fxCalls.every((u) => /^https:\/\/api\.frankfurter\.dev\/v2\/rates\?base=[A-Z]{3}&providers=cbar&quotes=AZN&date=\d{4}-\d{2}-\d{2}$/.test(u)), "the request carries the currency and the date only", fxCalls); }
  await save(page); await wait(600);
  const x = (await state(page)).transactions.find((q) => q.fx);
  ok(x && x.amount === 190.37 && x.fx.cur === "EUR" && x.fx.amt === 100 && x.fx.rate === 1.9037 && x.fx.src === "cbar", "stored: 190.37 in manat, plus 100.00 EUR at 1.9037 (Central Bank)", x);
  await tab(page, "Ledger"); await wait(300);
  await page.evaluate(() => document.querySelector(".txn-row").click()); await wait(500);
  ok(/Paid 100\.00 EUR at 1 EUR = 1\.9037/.test(await page.evaluate(() => document.body.innerText)), "the entry's details show what was paid and at which rate");
  await page.close();
}

section("R39-B2. Offline: the person types the rate; nothing is saved without one");
{
  // Run 53: the pages of one test browser share their storage, and the app now saves today's rates when it opens (section B1 above did).
  // This section is about a phone that has NO saved rate, so the saved rates are removed before the app starts.
  const page = await openPage(browser, { seed: baseSeed({ language: "en", currency: "₼" }), pre: () => { try { localStorage.removeItem("expense_ledger_v5__fxcache"); } catch {} } }); await phone(page); await settle(page); await openAdd(page);
  await page.evaluate(() => document.querySelector('[data-section="fx-cur"]').click()); await wait(350);
  await page.evaluate(() => document.querySelector('[data-section="fx-list"] [data-fx="USD"]').click()); await wait(800);
  await setVal(page, ".amount-input", "50"); await wait(150);
  ok(/Couldn't get the official rate/.test(await line(page)) && !!(await page.$("#fx-manual")), "no internet: it says so and offers a rate box");
  await save(page); await wait(300);
  ok(/Type the rate/.test(await page.evaluate(() => document.body.innerText)) && !((await state(page)).transactions || []).some((q) => q.fx), "Save without a rate is refused (never a guessed rate)");
  await setVal(page, "#fx-manual", "1.7"); await wait(150);
  ok(/=\s*85\.00/.test(await line(page)) && /Your own rate/.test(await line(page)), "1.7 typed: = 85.00 ₼, marked as your own rate", await line(page));
  await save(page); await wait(600);
  const x = (await state(page)).transactions.find((q) => q.fx);
  ok(x && x.amount === 85 && x.fx.src === "manual" && x.fx.rate === 1.7, "stored: 85.00, 50 USD at your rate 1.7", x);
  await page.close();
}

section("R39-B3. Editing keeps the currency; a ledger not in manat does not offer it");
{
  const seed = baseSeed({ language: "en", currency: "₼", transactions: [tx({ id: "fx1", amount: 190.37, date: TODAY, merchant: "Uni", fx: { cur: "EUR", amt: 100, rate: 1.9037, on: TODAY, src: "cbar" } })] });
  let page = await openPage(browser, { seed }); await phone(page); await settle(page);
  await tab(page, "Ledger"); await wait(300);
  await page.evaluate(() => document.querySelector(".txn-row").click()); await wait(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".sheet .btn")].find((x) => /^Edit/.test(x.innerText.trim())); b.click(); }); await page.waitForSelector(".amount-input"); await wait(400);
  ok((await page.evaluate(() => document.querySelector(".amount-input").value)) === "100" && /EUR/.test(await page.evaluate(() => document.querySelector('[data-section="fx-cur"]').innerText)), "the form opens in EUR with 100 (not 190.37)");
  ok(/=\s*190\.37/.test(await line(page)), "using the remembered rate (no new request needed)");
  await page.close();
  // Run 53 (owner: conversion must work both ways): a ledger in dollars now offers it too (tested in e2e_run53_quick). A ledger whose
  // sign is not a known currency still has no currency button, because no rate exists for it.
  page = await openPage(browser, { seed: baseSeed({ language: "en", currency: "pts" }) }); await settle(page); await openAdd(page);
  ok(!(await page.$('[data-section="fx-cur"]')), "ledger in a made-up sign ('pts'): no currency button (no rate exists for it)");
  await page.close();
}
section("R39-B4. Quick-add link opens the filled form once and saves nothing by itself");
{
  const { PAGE } = await import("./lib.mjs");
  const base = PAGE || process.env.PAGE_URL;
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), url: base + "?add=expense&amount=4.50&merchant=Coffee%20Lab&category=food" }); await settle(page); await wait(600);
  const f = await page.evaluate(() => ({ open: !!document.querySelector(".amount-input"), amt: (document.querySelector(".amount-input") || {}).value, cat: (document.querySelector("#txn-cat-lbl") || {}).innerText || "", merchant: (document.querySelector("#txn-merchant") || {}).value, search: location.search }));
  ok(f.open && f.amt === "4.5" && /Food/.test(f.cat) && f.merchant === "Coffee Lab", "the add form is open with 4.50, Food and Coffee Lab", f);
  ok(f.search === "", "the link's details are removed from the address (a reload does not reopen it)", f.search);
  ok(((await state(page)).transactions || []).length === baseSeed({ language: "en" }).transactions.length, "nothing was saved by itself");
  await page.close();
}
await browser.close();
finish("e2e_run39_fx");
