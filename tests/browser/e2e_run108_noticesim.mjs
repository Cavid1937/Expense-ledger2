// Run 108 (M1, found on the owner's Poco F6, 18 Nov) in the real bundled app: a second metro ride of 0.90 on the same day, read from a later
// bank notice, was ticked "looks like an entry you already made" and the sheet said "All of these are already in your entries". Synthetic data
// only: the notices copy only the layout of real ones, with invented amounts and card digits.
import { launch, openPage, state, ok, section, finish, baseSeed, tx, wait, TODAY } from "./lib.mjs";
const browser = await launch();

const now = Date.now();
const ride = (ago, bal) => ({ text: `Payment: -0.90 ₼\nBAKU METRO\nCard: **1111\nBalance: ${bal} ₼`, time: now - ago });
const R1 = ride(1200000, "4.16"), R2 = ride(600000, "3.26");
const SHELL = (items) => `window.LedgerNative = { notices: { status: async () => true, take: async () => { const x = window.__items || []; window.__items = []; return x; }, onAdded: async () => ({ remove() {} }) } };
  if (!sessionStorage.getItem("__took")) { sessionStorage.setItem("__took","1"); window.__items = ${JSON.stringify(items)}; } else window.__items = [];
  localStorage.setItem("expense_ledger_v5__notices","1");`;
const waitBell = (page) => page.waitForFunction(() => /bank-pay/.test((document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || ""), { timeout: 8000 });
const openReview = async (page) => { await page.evaluate(() => document.querySelector("[data-inbox-bell]").click()); await wait(350); await page.evaluate(() => document.querySelector('[data-notice="bank-pay"] [data-act="review"]').click()); await wait(500); };
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const spent = (s) => Math.round(s.transactions.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0) * 100);

section("R108-M1-1. Two metro rides from two notices, reviewed one after the other: both are added");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre: SHELL([R1]) });
  await waitBell(page); await openReview(page);
  await page.evaluate(() => document.querySelector('[data-bq="add"]').click()); await wait(900);
  ok((await state(page)).transactions.length === 1, "the morning ride is added");
  // the second notice arrives later (written to the phone's queue as the app does), then the app opens again
  await page.evaluate((r) => localStorage.setItem("expense_ledger_v5__bankq", JSON.stringify([r])), R2);
  await page.reload(); await wait(1500); await waitBell(page); await openReview(page);
  const sh = await page.evaluate(() => document.querySelector('[data-section="bank-notice-sheet"]').innerText);
  ok(!(await has(page, '[data-bq="sim-row"]')) && !(await has(page, '[data-bq="all-here"]')) && !(await has(page, '[data-bq="dup"]')), "no 'looks like an entry you already made', no 'already in your entries'", sh.slice(0, 300));
  ok(await has(page, '[data-bq="add"]'), "the Add button is offered");
  await page.evaluate(() => document.querySelector('[data-bq="add"]').click()); await wait(900);
  const s = await state(page);
  ok(s.transactions.length === 2 && spent(s) === 180, "two rides, 1.80 spent", s.transactions.map((x) => [x.merchant, x.amount, x.date]));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R108-M1-2. A ride typed by hand, then its notice: held back as a look-alike, said honestly, and the person can still add it");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ note: "metro", amount: 0.9, category: "transport", date: TODAY })] }), fresh: true, pre: SHELL([R1]) });
  await waitBell(page); await openReview(page);
  ok(await page.evaluate(() => { const c = document.querySelector('[data-bq="sim"]'); return !!c && c.checked; }), "the look-alike box is shown and ticked");
  const txt = await page.evaluate(() => (document.querySelector('[data-bq="sim-only"]') || { innerText: "" }).innerText);
  ok(/Nothing will be added/.test(txt) && /untick the box/i.test(txt) && !(await has(page, '[data-bq="all-here"]')), "the sheet says it is only a look-alike and how to add it, not 'already in your entries'", txt);
  await page.evaluate(() => document.querySelector('[data-bq="sim"]').click()); await wait(300);
  ok(await has(page, '[data-bq="add"]') && !(await has(page, '[data-bq="sim-only"]')), "unticked: Add is offered");
  await page.evaluate(() => document.querySelector('[data-bq="add"]').click()); await wait(900);
  const s = await state(page);
  ok(s.transactions.length === 2 && spent(s) === 180, "the person's choice: both kept (1.80)", s.transactions.map((x) => [x.note || x.merchant, x.amount]));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R108-M1-2b. One payment announced by the bank, then by a wallet two minutes later, in a later review: not counted twice");
{
  const T = now - 1200000, bank = { text: "Payment: -12.50 ₼\nBRAVO SUPERMARKET\nCard: **1111\nBalance: 80.00 ₼", time: T }, wallet = { text: "Payment: -12.50 ₼\nBravo Market\nCard: **1111", time: T + 120000 };
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre: SHELL([bank]) });
  await waitBell(page); await openReview(page);
  await page.evaluate(() => document.querySelector('[data-bq="add"]').click()); await wait(900);
  await page.evaluate((r) => localStorage.setItem("expense_ledger_v5__bankq", JSON.stringify([r])), wallet);
  await page.reload(); await wait(1500); await waitBell(page); await openReview(page);
  ok(await has(page, '[data-bq="sim-only"]') && !(await has(page, '[data-bq="add"]')), "held back as a look-alike, with nothing to add by default");
  const s = await state(page);
  ok(s.transactions.length === 1 && spent(s) === 1250, "one payment, 12.50 spent", s.transactions.map((x) => [x.merchant, x.amount]));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R108-M1-3. Azerbaijani and Russian wording of the look-alike line");
for (const [lang, re] of [["az", /Heç nə əlavə olunmayacaq/], ["ru", /Ничего не добавится/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [tx({ note: "metro", amount: 0.9, category: "transport", date: TODAY })] }), fresh: true, pre: SHELL([R1]), chooseLang: lang });
  await waitBell(page); await openReview(page);
  const txt = await page.evaluate(() => (document.querySelector('[data-bq="sim-only"]') || { innerText: "" }).innerText);
  ok(re.test(txt), lang + ": the look-alike line is in the person's language", txt);
  await page.close();
}
await browser.close();
finish("e2e_run108_noticesim");
