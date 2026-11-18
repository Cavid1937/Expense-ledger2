// Run 108 (release readiness): the add form stays on screen for its 0.2 s closing slide. Before Run 108 a second tap on Record in that
// time (a quick double tap on a phone) saved the same entry twice. Now each opening of the form hands over its entries once. Checked for
// taps at the same moment, 60 ms and 200 ms apart; the next opening still saves, and an edit tapped twice changes the entry once.
// Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, baseSeed, tx, openGoals } from "./lib.mjs";
const browser = await launch();
const setField = (page, sel, v) => page.evaluate((s, val) => { const el = document.querySelector(s); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, sel, v);
const stored = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("expense_ledger_v5")).transactions; } catch { return null; } });
const openForm = async (page) => { await page.evaluate(() => document.querySelector(".fab-add, .home-empty .btn")?.click()); await page.waitForSelector(".amount-input"); await wait(400); };
// two taps on Record, `gap` ms apart (the second finds the button again, as a finger would)
const tapTwice = (page, gap) => page.evaluate(async (gap) => {
  const find = () => [...document.querySelectorAll(".add-overlay .btn-primary")].find((x) => /Record|Save/.test(x.innerText));
  const b = find(); b.click(); if (gap) await new Promise((r) => setTimeout(r, gap)); (find() || b).click();
}, gap);

section("R108-T. A double tap on Record saves one entry");
for (const gap of [0, 60, 200]) {
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) });
  await settle(page);
  await openForm(page);
  await setField(page, ".amount-input", "12.50"); await setField(page, "#txn-merchant", "Bakery"); await wait(100);
  await tapTwice(page, gap); await wait(700);
  const list = await stored(page);
  ok(list && list.length === 1 && list[0].amount === 12.5 && list[0].merchant === "Bakery", `two taps ${gap} ms apart: one entry of 12.50 saved`, list && list.map((x) => [x.amount, x.merchant]));
  if (gap === 60) {
    await openForm(page);
    await setField(page, ".amount-input", "3"); await setField(page, "#txn-merchant", "Tea"); await wait(100);
    await tapTwice(page, 0); await wait(700);
    const l2 = await stored(page);
    ok(l2 && l2.length === 2 && l2.some((x) => x.merchant === "Tea" && x.amount === 3), "the form opened again still saves (one more entry, not blocked and not doubled)", l2 && l2.length);
  }
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R108-T2. Editing an entry and tapping Save twice changes it once and adds nothing");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 77, amount: 20, merchant: "Shop", category: "food" })] }) });
  await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
  await page.evaluate(() => document.querySelector(".txn-row")?.click()); await wait(500);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^Edit$/.test(b.innerText.trim()))?.click()); await wait(500);
  const open = !!(await page.$(".add-overlay .amount-input"));
  if (open) { await setField(page, ".amount-input", "25"); await wait(100); await tapTwice(page, 60); await wait(700); }
  const list = await stored(page);
  ok(open && list && list.length === 1 && list[0].id === 77 && list[0].amount === 25, "one entry, now 25.00, same id", { open, list: list && list.map((x) => [x.id, x.amount]) });
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R108-T3. A real double tap on Save goal makes one goal and no false 'invalid' message (a closing form cannot be tapped)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) });
  await settle(page);
  await openGoals(page, "goals");
  await (await page.$(".fab-add")).click(); await page.waitForSelector("#goal-name"); await wait(500);
  await setField(page, "#goal-name", "Bike"); await setField(page, "#goal-target", "300"); await wait(150);
  const box = await page.evaluate(() => { const b = document.querySelector('[data-section="goal-form"] .btn-primary'); b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await wait(200);
  await page.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.querySelector(".toast"); if (t) window.__toasts.push(t.textContent); }).observe(document.body, { subtree: true, childList: true, characterData: true }); });
  await page.mouse.click(box.x, box.y); await page.mouse.click(box.x, box.y); await wait(900);
  const goals = await page.evaluate(() => (JSON.parse(localStorage.getItem("expense_ledger_v5")).goals || []).filter((g) => g.name === "Bike").length);
  const toasts = await page.evaluate(() => window.__toasts);
  ok(goals === 1, "one goal saved", goals);
  ok(!toasts.some((s) => /required|invalid/i.test(s)), "no 'invalid' message after the second tap", toasts);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R108-T4. Bank payments review: Add, then a quick tap on Remove while the sheet slides down, still adds (the first choice wins)");
{
  const now = Date.now();
  const N1 = { text: "Payment: -0.90 ₼\nBus 594\nCard: **1111\nBalance: 9.06 ₼", time: now - 600000 };
  const N2 = { text: "Payment: -3.50 ₼\nKAFE NOVA\nCard: **1111\nBalance: 5.56 ₼", time: now - 300000 };
  const pre = `window.LedgerNative = { notices: { status: async () => true, take: async () => { const x = window.__items || []; window.__items = []; return x; }, onAdded: async () => ({ remove() {} }) } };
  if (!sessionStorage.getItem("__took")) { sessionStorage.setItem("__took","1"); window.__items = ${JSON.stringify([N1, N2])}; } else window.__items = [];
  localStorage.setItem("expense_ledger_v5__notices","1");`;
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), fresh: true, pre });
  await page.waitForFunction(() => /bank-pay/.test((document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || ""), { timeout: 8000 });
  await page.evaluate(() => document.querySelector("[data-inbox-bell]").click()); await wait(350);
  await page.evaluate(() => document.querySelector('[data-notice="bank-pay"] [data-act="review"]').click()); await wait(500);
  await page.evaluate(async () => { document.querySelector('[data-bq="add"]').click(); await new Promise((r) => setTimeout(r, 60)); document.querySelector('[data-bq="discard"]')?.click(); });
  await wait(1000);
  const list = await stored(page);
  ok(list && list.length === 2 && Math.round(list.reduce((a, x) => a + x.amount, 0) * 100) === 440, "both payments added once (0.90 + 3.50 = 4.40)", list && list.map((x) => [x.merchant, x.amount]));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R108-T5. Loan 'Mark next payment as paid': a double tap marks one payment; a later tap still marks the next");
{
  const DKEY = "expense_ledger_v5__debts", TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const pre = new Function(`try{if(!sessionStorage.getItem("__l")){sessionStorage.setItem("__l","1");localStorage.setItem("${DKEY}",JSON.stringify({version:1,debts:[],loans:[{id:"l1",lender:"Bank",kind:"cash",principal:120000,months:12,rateType:"none",ratePct:0,firstPayment:"${TODAY}",bankPayment:null,payments:[]}]}));}}catch(e){}`);
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre }); await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250);
  await page.evaluate(() => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[1].click()); await wait(500);
  await page.evaluate(() => document.querySelector(".loan-paid-btn").scrollIntoView({ block: "center", behavior: "instant" })); await wait(600);
  const box = await page.evaluate(() => { const r = document.querySelector(".loan-paid-btn").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const count = () => page.evaluate((k) => ({ pays: JSON.parse(localStorage.getItem(k)).loans[0].payments.length, entries: JSON.parse(localStorage.getItem("expense_ledger_v5")).transactions.filter((x) => x.loan).map((x) => x.amount) }), DKEY);
  await page.mouse.click(box.x, box.y); await wait(60); await page.mouse.click(box.x, box.y); await wait(900);
  const a = await count();
  ok(a.pays === 1 && a.entries.length === 1 && a.entries[0] === 100, "two taps 60 ms apart: one payment marked, one entry of 100.00", a);
  await page.mouse.click(box.x, box.y); await wait(800);
  const b = await count();
  ok(b.pays === 2 && b.entries.length === 2, "a separate tap later marks the next payment (catching up still works)", b);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R108-T6. An entry's sheet that is sliding down takes no more taps (Close, then Duplicate 60 ms later, does nothing more)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 88, amount: 7, merchant: "Kiosk", category: "food" })] }) });
  await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
  await page.evaluate(() => document.querySelector(".txn-row")?.click()); await wait(600);
  const opened = await page.evaluate(() => !![...document.querySelectorAll(".sheet-overlay button")].find((b) => /Duplicate/.test(b.innerText)));
  await page.evaluate(async () => {
    const ov = [...document.querySelectorAll(".sheet-overlay")].find((o) => /Duplicate/.test(o.innerText));
    ov.querySelector('[data-closer="1"]').click(); await new Promise((r) => setTimeout(r, 60));
    [...ov.querySelectorAll("button")].find((b) => /Duplicate/.test(b.innerText))?.click();
  });
  await wait(800);
  const formOpen = !!(await page.$(".add-overlay .amount-input"));
  const sheetGone = await page.evaluate(() => ![...document.querySelectorAll(".sheet-overlay")].some((o) => /Duplicate/.test(o.innerText)));
  const list = await stored(page);
  ok(opened && sheetGone && !formOpen && list && list.length === 1, "the sheet closes; no copy form opens; still one entry", { opened, sheetGone, formOpen, n: list && list.length });
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run108_dbltap");
