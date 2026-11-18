// Run 108 (hardening, data safety): the app open twice, part 2. The loans and debts page, My accounts and My categories each kept their
// own copy of their list, read once when the page opened. A change made in the other window was never seen there, and the next save
// from the stale page wrote its old list back: a loan instalment marked in window A was lost when window B marked one (and B marked the
// same instalment again, so the ledger got two loan entries for one instalment). Synthetic data only.
import { launch, openPage, openSettings, openCategories, wait, ok, section, finish, settle, baseSeed } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts", AK = "expense_ledger_v5__accounts", CK = "expense_ledger_v5__cats";
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const type = (page, sel, v) => page.$eval(sel, (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const read = (page, k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), k);

section("R108-W1. Loans: an instalment marked in window A is kept when window B (already open on Loans) marks the next one");
{
  const pre = new Function(`try{if(!sessionStorage.getItem("__l")){sessionStorage.setItem("__l","1");localStorage.setItem("${DKEY}",JSON.stringify({version:1,debts:[],loans:[{id:"l1",lender:"Bank",kind:"cash",principal:120000,months:12,rateType:"none",ratePct:0,firstPayment:"${TODAY}",bankPayment:null,payments:[]}]}));}}catch(e){}`);
  const a = await openPage(browser, { seed: baseSeed({ language: "en" }), pre }); await settle(a);
  const b = await openPage(browser, { seed: null }); await settle(b);
  const toLoans = async (p) => {
    await p.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await p.waitForSelector(".more-page"); await wait(150);
    await p.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await p.waitForSelector('[data-section="debts-page"]'); await wait(250);
    await p.evaluate(() => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[1].click()); await wait(500);
  };
  await toLoans(a); await toLoans(b);
  await click(a, ".loan-paid-btn"); await wait(900);
  const s1 = await read(a, DKEY);
  ok(s1.loans[0].payments.length === 1, "window A marked instalment 1", s1.loans[0].payments.length);
  await wait(400);
  await click(b, ".loan-paid-btn"); await wait(900);
  const s2 = await read(b, DKEY), led = await read(b, "expense_ledger_v5");
  const loanEntries = led.transactions.filter((x) => x.loan);
  // before Run 108: 1 payment stored (B wrote its old empty list back plus its own) and 2 loan entries in the ledger
  ok(s2.loans[0].payments.length === 2, "after window B marks one too, the loan holds 2 payments (A's is not lost)", s2.loans[0].payments.length);
  ok(loanEntries.length === 2 && loanEntries.every((x) => x.amount === 100), "the ledger holds one 100.00 entry per marked payment (2), no instalment counted twice", loanEntries.map((x) => x.amount));
  ok(new Set(s2.loans[0].payments.map((p) => p.txnId)).size === 2 && s2.loans[0].payments.every((p) => loanEntries.some((x) => x.id === p.txnId)), "each payment points at its own entry", s2.loans[0].payments);
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}

section("R108-W2. My accounts: an account added in window A is kept when window B (already open on Settings) adds one");
{
  const a = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(a);
  const b = await openPage(browser, { seed: null }); await settle(b);
  await openSettings(a); await openSettings(b);
  await type(a, "#acc-name", "Card A"); await wait(150); await click(a, '[data-section="acc-add"]'); await wait(500);
  ok((await read(a, AK)).accounts.map((x) => x.name).join() === "Card A", "window A saved Card A");
  await wait(400);
  ok(await b.evaluate(() => /Card A/.test(document.querySelector('[data-section="my-accounts"]').innerText)), "window B lists Card A without a reload");
  await type(b, "#acc-name", "Cash B"); await wait(150); await click(b, '[data-section="acc-add"]'); await wait(500);
  const names = (await read(b, AK)).accounts.map((x) => x.name).sort().join();
  ok(names === "Card A,Cash B", "the saved accounts are Card A and Cash B (before Run 108 B's save dropped Card A)", names);
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}

section("R108-W3. My categories: a category added in window A is kept when window B adds one, and B can use A's at once");
{
  const a = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(a);
  const b = await openPage(browser, { seed: null }); await settle(b);
  await openCategories(a); await openCategories(b);
  await type(a, "#mycat-name", "Kite club"); await wait(150); await click(a, '[data-section="mycat-add"]'); await wait(500);
  ok((await read(a, CK)).cats.map((x) => x.name).join() === "Kite club", "window A saved Kite club");
  await wait(400);
  ok(await b.evaluate(() => /Kite club/.test(document.querySelector('[data-section="my-categories"]').innerText)), "window B lists Kite club without a reload");
  await type(b, "#mycat-name", "Gym"); await wait(150); await click(b, '[data-section="mycat-add"]'); await wait(500);
  const names = (await read(b, CK)).cats.map((x) => x.name).sort().join();
  ok(names === "Gym,Kite club", "the saved categories are Gym and Kite club (before Run 108 B's save dropped Kite club)", names);
  await wait(400);
  ok(await a.evaluate(() => /Gym/.test(document.querySelector('[data-section="my-categories"]').innerText)), "window A lists Gym too");
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}
section("R108-W4. Category order: a category hidden in window A stays hidden when window B hides another");
{
  const a = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(a);
  const b = await openPage(browser, { seed: null }); await settle(b);
  await openCategories(a); await openCategories(b);
  const hide = (p, id) => p.evaluate((c) => document.querySelector(`[data-section="cat-order"] [data-catord="${c}"] [data-section="catord-toggle"]`).click(), id);
  await hide(a, "transport"); await wait(500);
  ok(((await read(a, "expense_ledger_v5__catprefs")) || {}).hidden?.join() === "transport", "window A hid Transport");
  await wait(400);
  await hide(b, "health"); await wait(500);
  const h = (((await read(b, "expense_ledger_v5__catprefs")) || {}).hidden || []).slice().sort().join();
  ok(h === "health,transport", "both stay hidden (before Run 108 B's save showed Transport again)", h);
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}
section("R108-W5. App lock: a PIN changed in window A is the PIN in window B too (the old PIN no longer opens B)");
{
  const field = (p, sel, v) => p.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
  const sheet = async (p) => { await p.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await p.waitForSelector(".more-page"); await wait(150); await p.evaluate(() => document.querySelector('.more-page [data-more="lock"]').click()); await p.waitForSelector('[data-section="lock-sheet"]'); await wait(250); };
  const locked = (p) => p.evaluate(() => { const s = document.querySelector(".lock-screen"), tb = document.querySelector(".tabbar"); return !!s && (!tb || tb.getClientRects().length === 0); });
  const enter = async (p, pin) => { await p.bringToFront(); await p.evaluate(() => document.querySelector(".lock-screen input")?.focus()); await p.keyboard.type(pin); await wait(120); await p.keyboard.press("Enter"); await wait(1500); };
  const a = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(a);
  await sheet(a); await field(a, "#lock-pin-a", "2468"); await field(a, "#lock-pin-b", "2468"); await click(a, '[data-section="lock-save"]'); await wait(800);
  const b = await openPage(browser, { seed: null }).catch(() => null);
  if (!b) { ok(false, "window B opens"); } else {
    await b.waitForSelector(".lock-screen"); await wait(300);
    await enter(b, "2468");
    ok(!(await locked(b)), "window B opens with 2468");
    await b.evaluate(() => window.dispatchEvent(new Event("ledger-lock-now"))); await wait(400);
    await a.bringToFront();
    await click(a, '[data-section="lock-change-go"]'); await wait(300);
    await field(a, "#lock-pin-c", "2468"); await field(a, "#lock-pin-a", "1357"); await field(a, "#lock-pin-b", "1357"); await click(a, '[data-section="lock-change-save"]'); await wait(1500);
    await enter(b, "2468");
    ok(await locked(b), "after A changes the PIN to 1357, the old PIN 2468 no longer opens window B");
    await enter(b, "1357");
    ok(!(await locked(b)), "the new PIN 1357 opens window B");
    ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
    await b.evaluate(() => localStorage.removeItem("expense_ledger_v5__lock")); await b.close();
  }
  await a.close();
}
section("R108-W6. An entry deleted in window A while window B edits it: B says the change was not saved and does not bring it back");
{
  const a = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(a);
  const b = await openPage(browser, { seed: null }); await settle(b);
  const n0 = (await read(b, "expense_ledger_v5")).transactions.length;
  await b.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
  await b.evaluate(() => document.querySelector(".txn-row")?.click()); await wait(600);
  const opened = await b.evaluate(() => { const e = [...document.querySelectorAll(".sheet-overlay button")].find((x) => /^\s*edit\s*$/i.test(x.innerText) || /^edit$/i.test(x.getAttribute("aria-label") || "")); if (e) e.click(); return !!e; });
  await wait(700);
  ok(opened && n0 > 0 && (await b.$(".add-overlay")), "window B has an entry open for editing", { opened, n0 });
  // window A deletes every entry (a write from A reaches B as a storage event, as between two real windows)
  await a.evaluate(() => { const s = JSON.parse(localStorage.getItem("expense_ledger_v5")); s.transactions = []; localStorage.setItem("expense_ledger_v5", JSON.stringify(s)); });
  await wait(700);
  await b.evaluate(() => [...document.querySelectorAll(".add-overlay .btn-primary")].pop()?.click()); await wait(700);
  const txt = await b.evaluate(() => document.body.innerText);
  ok(/deleted in another window/.test(txt) && !/Entry updated/.test(txt), "B says the entry was deleted in another window, not 'Entry updated'");
  ok((await read(b, "expense_ledger_v5")).transactions.length === 0, "the deleted entry is not brought back");
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}
await finish("e2e_run108_tabs2", browser);
