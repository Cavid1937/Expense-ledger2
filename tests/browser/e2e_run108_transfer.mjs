// Run 108 (owner, 18 Nov, screenshot of an ABB notice "Transfer: -4.00₼ / Card: **2416 / Balance: 4.46₼": "App didn't recognize this transfer").
// The same layout, with invented card digits and amounts, handed over by a stand-in for the Android reader, must reach the bell and be added.
import { launch, openPage, state, ok, section, finish, baseSeed, wait } from "./lib.mjs";
const browser = await launch();

const now = Date.now();
const T1 = { text: "💸 Transfer: -4.00₼\nCard: **9999\nBalance: 4.46₼", time: now - 120000 };
const SHELL = (items) => `window.LedgerNative = { notices: { status: async () => true, take: async () => { const x = window.__items || []; window.__items = []; return x; }, onAdded: async () => ({ remove() {} }) } };
  if (!sessionStorage.getItem("__took")) { sessionStorage.setItem("__took","1"); window.__items = ${JSON.stringify(items)}; } else window.__items = [];
  localStorage.setItem("expense_ledger_v5__notices","1");`;
const queue = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__bankq") || "[]"));

section("T1. An ABB transfer notice reaches the bell, the review lists it, and Add records a 4.00 expense under Transfers");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre: SHELL([T1]) });
  let inBell = true;
  try { await page.waitForFunction(() => /bank-pay/.test((document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || ""), { timeout: 8000 }); } catch { inBell = false; }
  ok(inBell && (await queue(page)).length === 1, "the transfer is kept and waits in the bell", await queue(page));
  if (inBell) {
    await page.evaluate(() => document.querySelector("[data-inbox-bell]").click()); await wait(350);
    await page.evaluate(() => document.querySelector('[data-notice="bank-pay"] [data-act="review"]').click()); await wait(600);
    const sh = await page.evaluate(() => (document.querySelector('[data-section="bank-notice-sheet"]') || { innerText: "" }).innerText);
    ok(/4\.00/.test(sh) && !/9999/.test(sh), "the review shows the 4.00 transfer and no card digits", sh.slice(0, 300));
    await page.evaluate(() => { const b = document.querySelector('[data-bq="add"]'); if (b) b.click(); }); await wait(900);
    const s = await state(page);
    const e = s.transactions[0] || {};
    ok(s.transactions.length === 1 && e.type === "expense" && e.amount === 4 && e.category === "transfers", "Add: one 4.00 expense in Transfers", s.transactions);
  }
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

await finish("e2e_run108_transfer", browser);
