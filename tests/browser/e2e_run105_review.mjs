// Run 105 in the real bundled app (owner, 17 Nov): the category budget box "opens good but closes instantly"; ready-made date ranges must live
// inside the calendar and "once user selects them, there's no going back"; bank-notice payments "should come as a notification and then user
// decides". Synthetic data only: the notices copy only the layout of real ones, with invented places and amounts.
import { launch, openPage, state, tab, ok, section, finish, baseSeed, tx, wait, openGoals, daysAgo, TODAY } from "./lib.mjs";
const browser = await launch();

section("R105-1. Category budget: Save keeps the box on screen while it closes, then saves");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", budgets: { food: 100 } }) });
  await openGoals(page, "budgets"); await wait(500);
  const SEL = '.goals-page input[aria-label$=": Food & Dining"]';
  await page.evaluate(() => document.querySelector('.goals-page button[aria-label="Edit: Food & Dining"]').click()); await wait(500);
  ok(!!(await page.$(SEL)), "Edit opens the amount box");
  await page.evaluate((s) => { const i = document.querySelector(s); i.focus(); i.select(); }, SEL);
  await page.keyboard.type("140"); await page.keyboard.press("Enter"); await wait(80);
  ok(!!(await page.$(SEL)), "just after Save the box is still there (it closes with motion, not cut off)");
  await wait(700);
  ok(!(await page.$(SEL)) && (await state(page)).budgets.food === 140, "then it is closed and Food's budget is 140", (await state(page)).budgets);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R105-2. Dates: ready ranges inside the calendar, and always a way back");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "Now", amount: 5, date: TODAY }), tx({ merchant: "Old", amount: 9, date: daysAgo(60) })] });
  const page = await openPage(browser, { seed }); await tab(page, "Transactions"); await wait(300);
  const names = () => page.evaluate(() => [...document.querySelectorAll(".tx-merchant, [data-tx-row] .merchant")].map((e) => e.innerText).join("|") || document.body.innerText);
  ok(!(await page.$('[data-section="tx-range-quick"]')), "no range chips on the page itself (they live in the calendar)");
  await page.evaluate(() => document.querySelector('[data-section="tx-date-btn"]').click()); await wait(450);
  ok(!!(await page.$('[data-section="pick-range-sheet"] [data-section="tx-range-quick"]')), "the calendar sheet holds the ready ranges");
  await page.evaluate(() => document.querySelector('[data-range="d30"]').click()); await wait(600);
  ok(!(await page.$('[data-section="pick-range-sheet"]')) && /Last 30 days/.test(await page.evaluate(() => document.querySelector('[data-section="tx-date-btn"]').innerText)), "a range closes the sheet and names itself on the button");
  ok(!/Old/.test(await names()), "the entry from 60 days ago is filtered out");
  await page.evaluate(() => document.querySelector('[data-section="tx-date-btn"]').click()); await wait(450);
  await page.evaluate(() => document.querySelector('[data-range="all"]').click()); await wait(600);
  ok(/Old/.test(await names()) && !/Last 30/.test(await page.evaluate(() => document.querySelector('[data-section="tx-date-btn"]').innerText)), "'All time' brings everything back (the way back)");
  await page.evaluate(() => document.querySelector('[data-section="tx-date-btn"]').click()); await wait(450);
  await page.evaluate(() => document.querySelector('[data-range="d30"]').click()); await wait(600);
  await page.evaluate(() => document.querySelector('[data-section="tx-date-btn"]').click()); await wait(450);
  await page.evaluate(() => document.querySelector('[data-range="d30"]').click()); await wait(600);
  ok(/Old/.test(await names()), "tapping the chosen range again also clears it");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

const now = Date.now();
const N1 = { text: "Payment: -0.90 ₼\nBus 594\nCard: **1111\nBalance: 9.06 ₼", time: now - 600000 };
const N2 = { text: "Payment: -3.50 ₼\nKAFE NOVA\nCard: **1111\nBalance: 5.56 ₼", time: now - 300000 };
// Android hands each notice over once: take() empties the stand-in's list. window.__more is handed over on the next take.
const SHELL = (items) => `window.LedgerNative = { notices: { status: async () => true, take: async () => { const x = window.__items || []; window.__items = []; return x; }, onAdded: async () => ({ remove() {} }) } };
  if (!sessionStorage.getItem("__took")) { sessionStorage.setItem("__took","1"); window.__items = ${JSON.stringify(items)}; } else window.__items = [];
  localStorage.setItem("expense_ledger_v5__notices","1");`;
const bellIds = (page) => page.evaluate(() => (document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || "");
const queue = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__bankq") || "[]"));
const openReview = async (page) => { await page.evaluate(() => document.querySelector("[data-inbox-bell]").click()); await wait(350); await page.evaluate(() => document.querySelector('[data-notice="bank-pay"] [data-act="review"]').click()); await wait(500); };

section("R105-3. Bank notices are kept first, wait in the bell, survive a reload, and are added once");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre: SHELL([N1, N2]) });
  await page.waitForFunction(() => /bank-pay/.test((document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || ""), { timeout: 8000 });
  ok((await queue(page)).length === 2 && !(await page.$('[data-section="bank-notice-sheet"]')), "both notices are stored on the phone first; no sheet opens by itself");
  await page.reload(); await wait(1500);
  ok((await queue(page)).length === 2 && /bank-pay/.test(await bellIds(page)), "after a reload (Android has nothing left to give) they are still waiting in the bell");
  const bellText = await page.evaluate(() => { document.querySelector("[data-inbox-bell]").click(); return new Promise((r) => setTimeout(() => r(document.querySelector('[data-notice="bank-pay"]').innerText), 350)); });
  ok(/2 payments from your bank are waiting/.test(bellText), "the bell says how many are waiting", bellText);
  await page.evaluate(() => document.querySelector('[data-notice="bank-pay"] [data-act="review"]').click()); await wait(500);
  const sh = await page.evaluate(() => document.querySelector('[data-section="bank-notice-sheet"]').innerText);
  ok(/2 payments from your bank/.test(sh) && /Bus 594/.test(sh) && /KAFE NOVA/.test(sh) && !/statement|file|1111/i.test(sh), "the review lists both, with no file / statement wording and no card digits", sh.slice(0, 300));
  // flip the bus fare to Received and back: the category follows the side
  await page.evaluate(() => [...document.querySelectorAll("[data-bq-row]")].find((r) => /Bus 594/.test(r.innerText)).querySelector('[data-dir="income"]').click()); await wait(300);
  const flipped = await page.evaluate(() => [...document.querySelectorAll("[data-bq-row]")].find((r) => /Bus 594/.test(r.innerText)).innerText);
  ok(/\+/.test(flipped) && /Other income/i.test(flipped), "Received: shown as money in, under Other income", flipped);
  await page.evaluate(() => [...document.querySelectorAll("[data-bq-row]")].find((r) => /Bus 594/.test(r.innerText)).querySelector('[data-dir="expense"]').click()); await wait(300);
  await page.evaluate(() => document.querySelector('[data-bq="add"]').click()); await wait(900);
  let s = await state(page);
  ok(s.transactions.length === 2 && s.transactions.every((x) => x.type === "expense") && Math.round(s.transactions.reduce((a, x) => a + x.amount, 0) * 100) === 440, "Add: two expenses, 0.90 + 3.50 = 4.40", s.transactions.map((x) => [x.merchant, x.amount, x.type]));
  ok((await queue(page)).length === 0 && !/bank-pay/.test(await bellIds(page)), "the queue and the bell notice are cleared");
  ok(!JSON.stringify(s).includes("9.06") && !JSON.stringify(s).includes("1111"), "no bank balance or card digits stored in the entries");
  await page.reload(); await wait(1500);
  s = await state(page);
  ok(s.transactions.length === 2 && (await queue(page)).length === 0, "after another reload nothing is offered or added twice");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R105-4. The same notice handed over twice is queued once; Not mine removes, Undo brings back; Later keeps");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre: SHELL([N1, N1]) });
  await page.waitForFunction(() => /bank-pay/.test((document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || ""), { timeout: 8000 });
  ok((await queue(page)).length === 1, "two copies of one notice (same text and time) are kept once");
  await openReview(page);
  await page.evaluate(() => document.querySelector('[data-bq="later"]').click()); await wait(600);
  ok(!(await page.$('[data-section="bank-notice-sheet"]')) && (await queue(page)).length === 1, "Later: the sheet closes and the payment keeps waiting");
  await openReview(page);
  await page.evaluate(() => document.querySelector('[data-bq="discard"]').click()); await wait(700);
  ok((await queue(page)).length === 0 && (await state(page)).transactions.length === 0, "Not mine: removed from the queue, nothing added");
  await page.evaluate(() => document.querySelector(".snackbar-undo").click()); await wait(400);
  ok((await queue(page)).length === 1 && /bank-pay/.test(await bellIds(page)), "Undo: it is back in the bell");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R105-5. Undo after adding puts the payments back to review; one already entered is skipped");
{
  const seed = baseSeed({ language: "en", transactions: [] });
  const page = await openPage(browser, { seed, fresh: true, pre: SHELL([N2]) });
  await page.waitForFunction(() => /bank-pay/.test((document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || ""), { timeout: 8000 });
  await openReview(page);
  await page.evaluate(() => document.querySelector('[data-bq="add"]').click()); await wait(900);
  ok((await state(page)).transactions.length === 1, "added");
  await page.evaluate(() => document.querySelector(".snackbar-undo").click()); await wait(500);
  ok((await state(page)).transactions.length === 0 && (await queue(page)).length === 1, "Undo: the entry goes and the payment is waiting again");
  await openReview(page);
  await page.evaluate(() => document.querySelector('[data-bq="add"]').click()); await wait(900);
  ok((await state(page)).transactions.length === 1, "added again: still one entry");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run105_review");
