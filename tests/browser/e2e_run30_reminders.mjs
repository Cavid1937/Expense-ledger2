// Run 30: Android reminders + icon shortcuts, against a MOCK of the Android shell (window.LedgerNative). The website must not show any of it.
// Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, openSettings, baseSeed, storageKeys } from "./lib.mjs";
const browser = await launch();
const SHELL = `window.__calls=[];window.__grant=true;window.__sc=null;window.LedgerNative={installId:function(){return "ID-1";},
  reminders:{requestPermission:function(){return new Promise(function(r){setTimeout(function(){r({granted:window.__grant});},window.__delay||0);});},sync:function(p){window.__calls.push(JSON.parse(JSON.stringify(p)));return Promise.resolve();}},
  onShortcut:function(cb){window.__sc=cb;return function(){window.__sc=null;};}}`;
const last = (page) => page.evaluate(() => window.__calls[window.__calls.length - 1]);
const prefs = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__reminders") || "null"));
const flip = async (page, k) => { await page.evaluate((x) => document.querySelector(`[data-section="rem-${x}"]`).click(), k); await wait(250); };
const on = (page, k) => page.evaluate((x) => document.querySelector(`[data-section="rem-${x}"]`).getAttribute("aria-checked"), k);

section("R30-B1. Website: no reminders section");
{
  const page = await openPage(browser, {}); await settle(page); await openSettings(page);
  ok(await page.evaluate(() => !document.querySelector('[data-fold="reminders"]')), "no Reminders section on the website");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R30-B2. Android app: section, permission, schedule");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page); await openSettings(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-fold="reminders"]')), "Reminders section is there inside the Android app");
  ok(await page.evaluate(() => /Reminders/.test(document.querySelector('[data-fold="reminders"]').innerText)), "it is called Reminders");
  const c0 = await last(page);
  ok(c0 && Array.isArray(c0.items) && c0.items.length === 0, "with every reminder off the shell is told to keep nothing scheduled", c0);
  ok((await on(page, "bills")) === "false" && (await on(page, "recurring")) === "false" && (await on(page, "daily")) === "false", "all reminders start OFF");
  await flip(page, "daily");
  ok((await on(page, "daily")) === "true", "daily check-in switches on once permission is granted");
  const c1 = await last(page);
  ok(c1.items.length >= 12 && c1.items.length <= 14 && c1.items.every((i) => i.kind === "daily" && i.title && i.body && Number.isInteger(i.id) && i.atMs > Date.now() - 1000), "the shell receives the evening nudges with title, body, id and time", c1.items && c1.items.length);
  ok((await prefs(page)).daily === true && (await prefs(page)).time === "09:00", "the choice is saved", await prefs(page));
  await flip(page, "daily");
  ok((await last(page)).items.length === 0, "switching it off clears the schedule");
  await page.evaluate(() => { window.__grant = false; });
  await flip(page, "bills");
  ok((await on(page, "bills")) === "false" && !(await prefs(page)).bills, "permission refused: the switch stays off and nothing is saved");
  ok(await page.evaluate(() => /blocked/i.test((document.querySelector('[data-section="rem-denied"]') || {}).textContent || "")), "and the user is told how to allow notifications");
  await page.evaluate(() => { window.__grant = true; });
  await flip(page, "bills");
  ok((await on(page, "bills")) === "true" && await page.evaluate(() => !document.querySelector('[data-section="rem-denied"]')), "after allowing, the bills switch works and the warning disappears");
  await flip(page, "hideAmount");
  ok((await prefs(page)).hideAmount === true, "hide-amounts is saved");
  ok(await page.evaluate(() => { const i = document.querySelector('[data-section="rem-time"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "18:30"); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); return true; }), "time field changed");
  await wait(250);
  ok((await prefs(page)).time === "18:30", "the reminder time is saved (18:30)", await prefs(page));
  const led = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")));
  ok(!("reminders" in led) && !("reminders" in (led.settings || {})), "reminder settings are NOT written into the ledger data");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.reload({ waitUntil: "load" }); await settle(page); await openSettings(page);
  ok((await on(page, "bills")) === "true" && (await on(page, "hideAmount")) === "true", "after a restart the switches are still on");
  await page.close();
}
section("R30-B2b. A slow permission answer must not undo a change made meanwhile (found on an emulator)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page);
  await page.evaluate(() => localStorage.removeItem("expense_ledger_v5__reminders"));   // the browser profile is shared with the section above
  await openSettings(page);
  await page.evaluate(() => { window.__delay = 600; });
  await page.evaluate(() => document.querySelector('[data-section="rem-bills"]').click()); await wait(100);   // the Android question is still open ...
  await page.evaluate(() => { const i = document.querySelector('[data-section="rem-time"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "07:45"); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); });
  await wait(1000);   // ... and the answer ("Allow") arrives after the time was changed
  const pr = await prefs(page);
  ok(pr && pr.bills === true && pr.time === "07:45", "both the late 'Allow' and the time change are kept (bills on, 07:45)", pr);
  await page.close();
}
section("R30-B3. Icon shortcuts open the add form");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page);
  ok(await page.evaluate(() => typeof window.__sc === "function"), "the app registers for shortcuts");
  await page.evaluate(() => window.__sc("expense")); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector(".add-overlay .amount-input")), "'Add expense' opens the add form");
  ok(await page.evaluate(() => !/Salary/i.test(document.querySelector(".add-overlay").innerText)), "it is the expense form");
  await page.evaluate(() => { const b = [...document.querySelectorAll(".add-overlay button")].find((x) => /cancel/i.test(x.textContent)); b.click(); }); await wait(500);
  await page.evaluate(() => window.__sc("income")); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector(".add-overlay .amount-input") && /Salary/i.test(document.querySelector(".add-overlay").innerText)), "'Add income' opens the income form");
  await page.evaluate(() => { const b = [...document.querySelectorAll(".add-overlay button")].find((x) => /cancel/i.test(x.textContent)); b.click(); }); await wait(500);
  await page.evaluate(() => window.__sc("nonsense")); await wait(300);
  ok(await page.evaluate(() => !document.querySelector(".add-overlay")), "an unknown shortcut does nothing");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R30-B4. az and ru");
for (const l of ["az", "ru"]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }), pre: SHELL }); await settle(page); await openSettings(page);
  const txt = await page.evaluate(() => document.querySelector('[data-fold="reminders"]').innerText);
  ok(l === "az" ? /Xatırlatmalar/.test(txt) : /Напоминания/.test(txt), `${l}: the section is translated`, txt.slice(0, 80));
  ok(!/remind\./.test(await page.evaluate(() => document.body.innerText)), `${l}: no untranslated key names on screen`);
  await page.close();
}
await finish("e2e_run30_reminders", browser);
