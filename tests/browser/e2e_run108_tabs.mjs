// Run 108 (hardening, data safety): the app open twice at once (two browser tabs, or the installed app and a tab). Before Run 108 each
// copy kept its own list in memory and wrote the whole list back on every change, so the copy that saved last silently wiped what the
// other had just added. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, openAdd, clickText, state, tx, baseSeed } from "./lib.mjs";
const browser = await launch();
// Counts every save of the ledger key in this tab (to prove two tabs do not keep answering each other forever)
const COUNT = `(() => { const s = Storage.prototype.setItem; window.__ledgerWrites = 0; Storage.prototype.setItem = function (k, v) { if (k === "expense_ledger_v5") window.__ledgerWrites++; return s.call(this, k, v); }; })()`;
const add = async (page, amount, merchant) => {
  await openAdd(page);
  await page.$eval(".amount-input", (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, amount);
  if (merchant) await page.evaluate((m) => { const el = document.querySelector('.add-overlay input[data-field="merchant"], .add-overlay input[name="merchant"]'); if (!el) return; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, m); el.dispatchEvent(new Event("input", { bubbles: true })); }, merchant);
  await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/i); await wait(700); await settle(page);
};
const amounts = (st) => st.transactions.map((t) => t.amount).sort((a, b) => a - b);

section("R108-T1. Two tabs: an entry added in one is kept when the other adds one too");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ amount: 10, merchant: "Seed" })] });
  const a = await openPage(browser, { seed, pre: COUNT }); await settle(a);
  const b = await openPage(browser, { seed: null, pre: COUNT }); await settle(b);
  ok(amounts(await state(b)).join() === "10", "the second tab opens on the same saved ledger (10.00)", amounts(await state(b)));
  await add(a, "7");
  ok(amounts(await state(a)).join() === "7,10", "tab A saved 7.00 next to 10.00", amounts(await state(a)));
  await wait(400);
  const seen = await b.evaluate(() => document.body.innerText);
  ok(/7[.,]00/.test(seen), "tab B shows A's 7.00 without being reloaded by hand");
  await add(b, "9");
  const st = await state(b);
  // 10 + 7 + 9: nothing lost; before Run 108 the stored list was 9,10 (A's 7.00 was overwritten by B's old copy)
  ok(amounts(st).join() === "7,9,10" && st.transactions.reduce((s, t) => s + t.amount, 0) === 26, "after B adds 9.00 the saved ledger holds 7.00, 9.00 and 10.00 (26.00)", amounts(st));
  await wait(1500);
  const w0 = [await a.evaluate(() => window.__ledgerWrites), await b.evaluate(() => window.__ledgerWrites)];
  await wait(2000);
  const w1 = [await a.evaluate(() => window.__ledgerWrites), await b.evaluate(() => window.__ledgerWrites)];
  ok(w1[0] === w0[0] && w1[1] === w0[1], "when nobody does anything, neither tab keeps saving (no back-and-forth between tabs)", { w0, w1 });
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}

section("R108-T2. An entry deleted in one tab does not come back from the other");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ id: 501, amount: 10, merchant: "Keep" }), tx({ id: 502, amount: 33, merchant: "Gone" })] });
  const a = await openPage(browser, { seed }); await settle(a);
  const b = await openPage(browser, { seed: null }); await settle(b);
  // Delete 33.00 in A through the stored ledger the way the app does (A's own delete flow is covered elsewhere); here A is the app itself
  await a.evaluate(() => { const k = "expense_ledger_v5"; const s = JSON.parse(localStorage.getItem(k)); s.transactions = s.transactions.filter((t) => t.id !== 502); localStorage.setItem(k, JSON.stringify(s)); });
  await a.reload(); await a.waitForSelector(".tabbar"); await settle(a);
  await wait(400);
  await add(b, "4");
  const st = await state(b);
  ok(amounts(st).join() === "4,10" && !st.transactions.some((t) => t.id === 502), "B's new 4.00 is saved and the deleted 33.00 stays deleted", amounts(st));
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}

section("R108-T3. Undo in one tab after the other tab changed the ledger does not remove the other tab's work");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ amount: 10 })] });
  const a = await openPage(browser, { seed }); await settle(a);
  const b = await openPage(browser, { seed: null }); await settle(b);
  await add(b, "5");
  const snackB = await b.evaluate(() => (document.querySelector(".snackbar") || {}).textContent || "");
  ok(/undo/i.test(snackB), "B offers Undo for its 5.00", snackB);
  // A adds 8.00 straight away, while B's Undo is still showing
  await a.evaluate(() => { const k = "expense_ledger_v5"; const s = JSON.parse(localStorage.getItem(k)); s.transactions.unshift({ ...s.transactions[0], id: 9008, amount: 8, merchant: "FromA" }); localStorage.setItem(k, JSON.stringify(s)); });
  await wait(400);
  // B's "Undo" for its 5.00 is still on screen; pressing it must not bring back B's old copy (which has no 8.00)
  const pressed = await b.evaluate(() => { const u = [...document.querySelectorAll(".snackbar button, .snack button")].find((x) => /undo/i.test(x.textContent)); if (u) { u.click(); return true; } return false; });
  await wait(600);
  const st = await state(b);
  ok(st.transactions.some((t) => t.amount === 8) && st.transactions.some((t) => t.amount === 10), "A's 8.00 and the first 10.00 are still saved" + (pressed ? " after B pressed Undo" : " (B's undo had already gone)"), amounts(st));
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}
section("R108-T4. A window that could not save keeps its unsaved entry when the other window saves");
{
  const FAIL = `(() => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "expense_ledger_v5" && window.__failSave) throw new DOMException("full", "QuotaExceededError"); return s.call(this, k, v); }; })()`;
  const seed = baseSeed({ language: "en", transactions: [tx({ amount: 10 })] });
  const a = await openPage(browser, { seed }); await settle(a);
  const b = await openPage(browser, { seed: null, pre: FAIL }); await settle(b);
  await b.evaluate(() => { window.__failSave = true; });
  await add(b, "6");
  const banner = await b.evaluate(() => (document.querySelector(".backup-banner[role=alert]") || {}).innerText || "");
  ok(/not saved|could not|can't|full/i.test(banner), "B shows the red 'could not be saved' banner", banner);
  await a.evaluate(() => { const k = "expense_ledger_v5"; const s = JSON.parse(localStorage.getItem(k)); s.transactions.unshift({ ...s.transactions[0], id: 9010, amount: 3, merchant: "FromA" }); localStorage.setItem(k, JSON.stringify(s)); });
  await wait(500);
  ok(/6[.,]00/.test(await b.evaluate(() => document.body.innerText)), "B still shows its unsaved 6.00 (not thrown away by a reload)");
  ok(a.errors.length === 0 && b.errors.length === 0, "no JavaScript errors", a.errors[0] || b.errors[0]);
  await a.close(); await b.close();
}
await browser.close();
finish("e2e_run108_tabs");
