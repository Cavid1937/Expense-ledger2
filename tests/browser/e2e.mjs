// Input-validation checks in the real UI: bad values are rejected and never reach saved data; valid values save exactly.
import { launch, openPage, state, toast, clickText, clickIn, setInput, openSettings, openAdd, openGoals, wait, ok, section, finish, TODAY, bodyText } from "./lib.mjs";
const browser = await launch(); const page = await openPage(browser);
const n0 = (await state(page)).transactions.length;
const setAmount = (v) => page.$eval(".amount-input", (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const record = () => clickText(page, ".add-overlay .btn-primary", /record expense/);

section("A. Add-transaction form");
await openAdd(page); await setAmount("25");
await page.$eval('.add-overlay input[type=date]', (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, ""); el.dispatchEvent(new Event("input", { bubbles: true })); });
await record();
ok(/valid date/i.test(await page.evaluate(() => document.querySelector(".add-overlay").textContent)), "cleared date → 'Please choose a valid date' shown");
ok((await state(page)).transactions.length === n0 && !!(await page.$(".add-overlay")), "…nothing saved, form stays open");
await page.$eval('.add-overlay input[type=date]', (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, TODAY);
for (const bad of ["-5", "1e999", "1e3", "0"]) { await setAmount(bad); await record(); ok((await state(page)).transactions.length === n0, `amount ${JSON.stringify(bad)} → nothing saved`); }
await setAmount("12.5"); await record(); await wait(400);
const s1 = await state(page); const added = s1.transactions.find((x) => x.amount === 12.5);
ok(s1.transactions.length === n0 + 1 && added && added.date === TODAY, "valid amount + date → saved normally (regression check)");

section("B. Settings entry points");
ok(!(await page.$(".add-overlay")), "add form closed after the valid save");
// Run 17: the savings floor and the quick-add templates moved from the Settings sheet to the Goals tab; currency stays in Preferences.
await openGoals(page, "goals");
const flo = () => document.querySelector('[data-section="gl-floor"] input');
const floBtn = () => document.querySelector('[data-section="gl-floor"] .btn-sm-primary');
await setInput(page, flo, "-300"); await clickIn(page, floBtn);
ok(/0 or more/.test(await toast(page)) && (await state(page)).safeToSpend.savingsTarget === 300, "savings floor −300 → rejected, stays 300");
await setInput(page, flo, "450"); await clickIn(page, floBtn); await wait(250);
ok((await state(page)).safeToSpend.savingsTarget === 450, "savings floor 450 → saved");
await openSettings(page);
const cur = () => [...document.querySelectorAll(".settings-row")].find((r) => /Currency symbol/i.test(r.textContent)).querySelector("input");
await setInput(page, cur, ""); await clickIn(page, () => [...document.querySelectorAll(".settings-row")].find((r) => /Currency symbol/i.test(r.textContent)).querySelector("input").parentElement.querySelector(".btn-sm-primary"));
ok(/currency symbol/i.test(await toast(page)) && (await state(page)).currency === "₼", "empty currency → rejected, stays ₼");
ok(await page.evaluate(() => /Display only/.test(document.querySelector(".sheet").textContent)), "currency row says 'Display only — amounts are not converted'");
await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(400);
await openGoals(page, "goals");
await clickIn(page, () => document.querySelector('[data-section="gl-templates"] .btn-sm'));
const F = (label) => eval(`()=>[...document.querySelectorAll(".sheet .field, .goals-page .field")].find(f=>/${label}/i.test((f.querySelector("label")||{}).textContent||"")).querySelector("input")`);
const saveT = () => [...document.querySelectorAll(".goals-page .btn-primary")].find((b) => /save template/i.test(b.textContent));
await setInput(page, F("^Name"), "X"); await setInput(page, F("^Amount"), "-5"); await clickIn(page, saveT);
ok(/positive amount/i.test(await toast(page)) && (await state(page)).templates.length === 1, "template amount −5 → rejected");
await setInput(page, F("^Amount"), "0"); await clickIn(page, saveT); ok((await state(page)).templates.length === 1, "template amount 0 → rejected");
await setInput(page, F("^Amount"), "3.5"); await clickIn(page, saveT); await wait(250);
let st = await state(page); ok(st.templates.length === 2 && st.templates[1].amount === 3.5, "template amount 3.5 → saved");// Redesign: budgets and goals are edited on the Budgets & Goals page (they were in Settings).
await openGoals(page, "budgets");
await clickIn(page, () => [...document.querySelectorAll(".goals-page .btn-sm")].find((b) => /^(Set|Edit)$/.test(b.textContent.trim())));
const bi = () => document.querySelector('input[placeholder="Monthly limit"]');
const bBtn = () => document.querySelector('input[placeholder="Monthly limit"]').parentElement.querySelector(".btn-sm-primary");
const budgetsBefore = JSON.stringify((await state(page)).budgets);
await setInput(page, bi, "-50"); await clickIn(page, bBtn);
ok(/0 or more/.test(await toast(page)) && JSON.stringify((await state(page)).budgets) === budgetsBefore, "budget −50 → rejected, budgets unchanged");
await setInput(page, bi, "120"); await clickIn(page, bBtn); await wait(250);
ok(Object.values((await state(page)).budgets).includes(120), "budget 120 → saved");
await openGoals(page, "goals");
await clickIn(page, () => [...document.querySelectorAll(".goals-page .btn-sm")].filter((b) => /\+ Add/.test(b.textContent))[0]);   // Run 17: the templates section below the goals has its own "+ Add"
const saveG = () => [...document.querySelectorAll(".goals-page .btn-primary")].find((b) => /save goal/i.test(b.textContent));
await setInput(page, F("^Goal name"), "Laptop"); await setInput(page, F("^Target \\("), "-100"); await clickIn(page, saveG);
ok(/positive target/i.test(await toast(page)) && (await state(page)).goals.length === 1, "goal target −100 → rejected");
await setInput(page, F("^Target \\("), "1000"); await setInput(page, F("^Monthly contribution"), "-5"); await clickIn(page, saveG);
ok(/0 or more/.test(await toast(page)) && (await state(page)).goals.length === 1, "goal monthly −5 → rejected");
await setInput(page, F("^Monthly contribution"), "100"); await setInput(page, F("^Saved so far"), "-1"); await clickIn(page, saveG);
ok((await state(page)).goals.length === 1, "goal saved −1 → rejected");
await setInput(page, F("^Saved so far"), "50"); await clickIn(page, saveG); await wait(250);
const g2 = (await state(page)).goals; ok(g2.length === 2 && g2[1].target === 1000 && g2[1].saved === 50 && g2[1].monthlyTarget === 100, "valid goal → saved with exact values");
const upd = () => [...document.querySelectorAll(".goals-page .btn-sm")].find((b) => /^Update$/.test(b.textContent.trim()));
// Run 26: the amount is typed in a row that opens inside the goal card (no browser pop-up). The box filters letters while typing, so the
// invalid cases are checked by setting the value directly (as pasted text would arrive) and pressing Save.
const putUpd = (v) => page.evaluate((v) => { const el = document.querySelector('[data-section="goal-update-input"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const saveUpd = async () => { await page.evaluate(() => document.querySelector('[data-section="goal-update-save"]').click()); await wait(200); };
await clickIn(page, upd); await wait(150);
ok(await page.evaluate(() => !!document.querySelector('[data-section="goal-update-row"]')), "Update opens an amount row inside the card (no pop-up)");
await putUpd("abc"); await saveUpd();
ok(/not a valid amount/i.test(await toast(page)) && (await state(page)).goals[0].saved === 3200, "'abc' → rejected, saved amount stays 3200");
await putUpd("-500"); await saveUpd(); ok((await state(page)).goals[0].saved === 3200, "−500 → rejected");
await putUpd("1e3"); await saveUpd(); ok((await state(page)).goals[0].saved === 3200, "1e3 (scientific) → rejected");
await putUpd("4500"); await saveUpd(); await wait(100); ok((await state(page)).goals[0].saved === 4500 && await page.evaluate(() => !document.querySelector('[data-section="goal-update-row"]')), "4500 → saved and the row closes");
ok(page.errors.length === 0, "no JavaScript errors during the whole run" + (page.errors.length ? ": " + page.errors[0] : ""));
await finish("e2e", browser);
