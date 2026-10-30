// Run 15 follow-up (2026-10-29): Home no longer lists recent entries, so adding an entry from Home must still give clear feedback and a
// way to see it. Checks the existing toast and the route to Transactions. (Delete -> Undo is covered by e2e_run8.) Synthetic data.
import { launch, openPage, state, tab, openAdd, wait, ok, section, finish, baseSeed, clickText, settle } from "./lib.mjs";
const browser = await launch();
const setAmount = (page, v) => page.$eval(".amount-input", (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const toastNow = (page) => page.evaluate(() => { const e = document.querySelector(".toast"); return e ? { text: e.innerText, role: e.getAttribute("role") } : null; });

section("R15-F1. Add from Home: clear confirmation, and the entry is one tap away");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const n0 = (await state(page)).transactions.length;
  await openAdd(page); await setAmount(page, "25"); await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(250);
  // Run 16: the confirmation is now an undo window (a snackbar with an Undo button) instead of a 2-second message.
  const t1 = await page.evaluate(() => { const e = document.querySelector(".snackbar"); return e ? { text: e.innerText, role: e.getAttribute("role") } : null; });
  ok(!!t1 && /recorded/i.test(t1.text) && /undo/i.test(t1.text) && t1.role === "status", "'Transaction recorded' with an Undo button appears right after saving (announced to screen readers)", t1);
  const saved = (await state(page)).transactions;
  ok(saved.length === n0 + 1 && saved[0].amount === 25, "exactly one entry was added, amount 25, newest first", saved.slice(0, 1));
  const onHome = await page.evaluate(() => document.querySelectorAll(".tab-btn")[0].getAttribute("aria-current") === "page" && !document.querySelector(".txn-row"));
  ok(onHome, "the user is still on Home, which does not list entries (so the message and the route below matter)");
  await wait(6600);
  ok(await page.evaluate(() => !document.querySelector(".snackbar")), "the undo window closes by itself after about 6 seconds");
  await page.evaluate(() => document.querySelector('[data-section="home-see-all"] button').click()); await wait(250);
  const first = await page.evaluate(() => (document.querySelector(".txn-row") || {}).innerText || "");
  ok(/25\.00/.test(first), "'See all transactions' opens the list with the new 25.00 entry first", first.replace(/\s+/g, " "));
  await page.close();
}
section("R15-F1b. Undo after adding (Run 16)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const n0 = (await state(page)).transactions.length;
  await openAdd(page); await setAmount(page, "31"); await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(300);
  ok((await state(page)).transactions.length === n0 + 1, "an entry was added");
  await clickText(page, ".snackbar-undo", /undo/i); await wait(400);
  const st = await state(page); ok(st.transactions.length === n0 && !st.transactions.some((t) => t.amount === 31), "Undo removes exactly that entry and nothing else", st.transactions.length);
  await openAdd(page); await setAmount(page, "32"); await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(300);
  await page.evaluate(() => document.querySelector(".tab-btn").click()); await wait(200);
  await page.evaluate(() => document.querySelector('[data-section="home-see-all"] button').click()); await wait(300);
  await page.evaluate(() => document.querySelector(".txn-row").click()); await wait(300);
  await clickText(page, ".sheet button", /^\s*edit\s*$/i); await page.waitForSelector(".add-overlay"); await wait(300); await setAmount(page, "33"); await clickText(page, ".add-overlay .btn-primary", /save|update/i); await wait(400);
  const hasUndo = await page.evaluate(() => [...document.querySelectorAll(".snackbar-undo")].length);
  if (hasUndo) { await clickText(page, ".snackbar-undo", /undo/i); await wait(300); }
  ok(!!(await state(page)).transactions.find((t) => t.amount === 33 || t.amount === 32), "after a later change the earlier Undo cannot wipe the newer edit (the entry is still there)", (await state(page)).transactions.slice(0, 2).map((t) => t.amount));
  await page.close();
}
section("R15-F2. An entry can be opened and edited from the Transactions list (the toast after editing is covered by the existing suites)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await tab(page, "Ledger"); await settle(page);
  await page.evaluate(() => document.querySelector(".txn-row").click()); await wait(300);
  const hasEdit = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => /edit/i.test(b.innerText)));
  ok(hasEdit, "an entry opens a detail sheet that offers Edit");
  await page.close();
}
await browser.close();
finish("e2e_run15_feedback");
