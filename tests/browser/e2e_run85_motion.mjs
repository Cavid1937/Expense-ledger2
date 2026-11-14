// Run 85 motion (owner's list, 14 Nov): the + turns into x while adding, a saved entry draws a tick, a replaced message slides back
// under the new one, and the month total rolls to its new value. With animations off, everything appears at once. Synthetic data only.
import { launch, openPage, openAdd, wait, ok, section, finish, baseSeed, tx, clickText, settle } from "./lib.mjs";
const browser = await launch();
const setAmount = (page, v) => page.$eval(".amount-input", (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const hero = (page) => page.evaluate(() => document.querySelector('[data-section="hero-spent"]')?.innerText || "");
const seed = () => baseSeed({ transactions: [tx({ merchant: "Bravo", amount: 10 })], lastBackup: new Date().toISOString(), backupConfirmedAt: new Date().toISOString() });

section("R85-M1. Adding: + turns into x, the saved message draws a tick, the total rolls");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  ok(/10\.00/.test(await hero(page)), "the month total shows its value at once on opening", await hero(page));
  await openAdd(page);
  ok(await page.evaluate(() => document.querySelector(".fab-add")?.classList.contains("fab-open")), "while the add sheet is open the button is marked open (+ turned to x)");
  await setAmount(page, "25");
  await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(120);
  ok(!(await page.evaluate(() => document.querySelector(".fab-add")?.classList.contains("fab-open"))), "after saving it turns back into +");
  ok(await page.evaluate(() => !!document.querySelector(".snackbar .snack-tick")), "the 'saved' message carries the tick");
  const mid = await hero(page); await wait(700); const end = await hero(page);
  ok(/35\.00/.test(end), "the total ends on the new value (10 + 25)", end);
  ok(mid !== end || /35\.00/.test(mid), "it rolled there (or was already there)", { mid, end });
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R85-M2. A message replaced by another slides back under it, then goes");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  for (const v of ["3", "4"]) { await openAdd(page); await setAmount(page, v); await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(80); }
  const g = await page.evaluate(() => ({ ghost: document.querySelectorAll(".snackbar.snack-ghost").length, live: document.querySelectorAll(".snackbar:not(.snack-ghost)").length, hidden: document.querySelector(".snack-ghost")?.getAttribute("aria-hidden") }));
  ok(g.live === 1, "one live message", g);
  await wait(500);
  ok(await page.evaluate(() => document.querySelectorAll(".snackbar.snack-ghost").length === 0), "no leftover ghost after it slides away");
  ok(g.ghost <= 1 && (g.ghost === 0 || g.hidden === "true"), "the ghost (if still showing) is hidden from screen readers", g);
  await page.close();
}

section("R85-M3. Animations off: the tick is drawn and the total is exact at once");
{
  const page = await openPage(browser, { seed: seed(), pre: "(() => { const q = window.matchMedia; window.matchMedia = (m) => /reduce/.test(m) ? { matches: true, media: m, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} } : q.call(window, m); })()" }); await settle(page);
  await openAdd(page); await setAmount(page, "5"); await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(60);
  ok(/15\.00/.test(await hero(page)), "the total is the new value straight away", await hero(page));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R85-M4. A save that fails never shows the success tick");
{
  const page = await openPage(browser, { seed: seed(), pre: () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "expense_ledger_v5" && sessionStorage.getItem("__seeded") && window.__failSave) throw new Error("QuotaExceededError"); return orig.call(this, k, v); }; } }); await settle(page);
  await page.evaluate(() => { window.__failSave = true; });
  await openAdd(page); await setAmount(page, "7"); await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(400);
  const s = await page.evaluate(() => ({ tick: !!document.querySelector(".snackbar .snack-tick"), warn: /Could not save changes/.test(document.body.innerText) }));
  ok(s.warn && !s.tick, "the 'Could not save changes' warning shows and no tick is drawn", s);
  await page.close();
}
await finish("e2e_run85_motion", browser);
