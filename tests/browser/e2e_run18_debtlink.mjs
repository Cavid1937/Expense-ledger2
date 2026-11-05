// Run 18 (2026-10-31), owner decision "ask each time": a debt repayment may also create a linked cash-flow entry.
// Checks both directions, linked / unlinked / cancelled, Undo, deletion, editing refused, and that the entry is not spending/income.
import { launch, openPage, state, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(300); };
const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || "", sel);
const stored = (page) => page.evaluate((k) => { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; }, DKEY);
const debt = (dir) => ({ version: 1, debts: [{ id: "d1", direction: dir, name: "Rauf", principal: 30000, dueDate: "", note: "", payments: [] }], loans: [] });
const start = async (dir) => {
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: "base1", amount: 7, merchant: "Shop", date: new Date().toISOString().slice(0, 10) })] }) }); await settle(page);
  await page.evaluate((k, v) => localStorage.setItem(k, v), DKEY, JSON.stringify(debt(dir)));
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250);
  return page;
};
const pay = async (page, amt) => { await setVal(page, ".debt-pay-input", amt); await click(page, ".debt-pay-btn"); };
const analyticsText = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500); return page.evaluate(() => document.body.innerText); };

section("R18-DLa. Repaying someone: asked first; Yes creates a paid-out entry linked to the payment");
{
  const page = await start("owe"); await pay(page, "100");
  ok(!!(await page.$('[data-section="debt-ask"]')) && (await state(page)).transactions.length === 1, "a question appears and nothing is recorded yet");
  await click(page, ".debt-ask-yes");
  const st = await state(page), d = await stored(page), t = st.transactions.find((q) => q.debtLink), p = d.debts[0].payments[0];
  ok(st.transactions.length === 2 && t.type === "expense" && t.amount === 100 && t.debtLink && t.debtLink.paymentId === p.id && p.txnId === t.id && p.amount === 10000, "one expense of 100.00 linked both ways to a payment of 10000 qapik", [t, p]);
  const an = await analyticsText(page);
  ok(!/Rauf/.test(await text(page, '[data-section="an-overview"]')) && /100\.00 \S+ paid out/.test(an), "Analytics shows 100.00 paid out in the debt line", an.slice(0, 1500));
  await page.close();
}
section("R18-DLb. Being repaid: Yes creates a received entry, not income");
{
  const page = await start("owed"); await pay(page, "40"); await click(page, ".debt-ask-yes");
  const t = (await state(page)).transactions.find((q) => q.debtLink);
  ok(t && t.type === "income" && t.amount === 40 && !!t.debtLink, "an income-type linked entry of 40.00", t);
  const an = await analyticsText(page);
  ok(/40\.00 \S+ received/.test(an) && !/Total income[^\n]*40\.00/i.test(an), "shown as received in the debt line; not counted as income");
  await page.close();
}
section("R18-DLc. No / Cancel: only the debt changes (or nothing)");
{
  const page = await start("owe"); await pay(page, "50"); await click(page, ".debt-ask-no");
  let d = await stored(page);
  ok((await state(page)).transactions.length === 1 && d.debts[0].payments.length === 1 && d.debts[0].payments[0].txnId === undefined, "No: payment saved, no entry, no link");
  await pay(page, "10"); await click(page, ".debt-ask-cancel");
  d = await stored(page);
  ok(d.debts[0].payments.length === 1 && !(await page.$('[data-section="debt-ask"]')), "Cancel: nothing was saved");
  await page.close();
}
section("R18-DLd. Undo removes both; deleting the payment removes both; Undo of that restores both");
{
  const page = await start("owe"); await pay(page, "100"); await click(page, ".debt-ask-yes");
  await page.evaluate(() => [...document.querySelectorAll(".snackbar-undo")][0].click()); await wait(400);
  ok((await state(page)).transactions.length === 1 && (await stored(page)).debts[0].payments.length === 0, "Undo right after recording: no entry and no payment");
  await pay(page, "100"); await click(page, ".debt-ask-yes");
  await click(page, ".debt-pay-del"); await wait(300);
  ok((await state(page)).transactions.length === 1 && ((await stored(page)).debts[0].payments.length === 0), "deleting the payment removes the linked entry too");
  await page.evaluate(() => [...document.querySelectorAll(".snackbar-undo")][0].click()); await wait(500);
  const st = await state(page), d = await stored(page);
  ok(st.transactions.length === 2 && d.debts[0].payments.length === 1 && st.transactions.some((q) => q.id === d.debts[0].payments[0].txnId && q.debtLink.paymentId === d.debts[0].payments[0].id), "Undo brings back the payment and a linked entry, in sync", [st.transactions, d.debts[0].payments]);
  await page.close();
}
section("R18-DLe. The linked entry cannot be edited or deleted from Transactions");
{
  const page = await start("owe"); await pay(page, "100"); await click(page, ".debt-ask-yes");
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
  const acted = await page.evaluate(() => { const b = [...document.querySelectorAll(".txn-act")]; b.forEach((x) => x.click()); return b.length; });
  await wait(400);
  const st = await state(page), d = await stored(page);
  ok(acted > 0 ? (st.transactions.length === 2 && d.debts[0].payments.length === 1) : true, "after trying every edit/delete button the entry and the payment are both still there", { acted });
  ok(/Debts & loans page/.test(await page.evaluate(() => document.body.innerText)) || acted === 0, "a message says to change it on the Debts page");
  await page.close();
}
section("R18-DLf. Deleting the whole debt removes its linked entries");
{
  const page = await start("owe"); await pay(page, "100"); await click(page, ".debt-ask-yes");
  await page.evaluate(() => document.querySelector('[data-section="debt-card"] .topbar-btn').click()); await wait(400);
  ok((await state(page)).transactions.length === 1 && (await stored(page)) === null, "debt, payment and linked entry are gone together");
  await page.close();
}
await browser.close();
finish("e2e_run18_debtlink");
