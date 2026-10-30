// Run 3 (2026-10-27): ChatGPT Review Run 2 R2: closing the Add form must not silently lose what the user typed.
//  B1  untouched form: ×, Escape and phone Back close it at once (no extra question)
//  B2  something typed: ×, Cancel, Escape and Back ask "This entry isn't saved"; Keep editing keeps every value; Close without
//      saving closes and saves nothing
//  B3  switching Expense/Income alone is not "something typed"; editing an existing entry asks only after a real change
//  B4  saving is unaffected; the dialog text exists in az and ru
import { launch, openPage, tab, wait, ok, section, finish, tx, baseSeed, setInput, state, openAdd } from "./lib.mjs";
const browser = await launch();
const amountInput = () => document.querySelector(".amount-input");
const isAddOpen = (page) => page.evaluate(() => !!document.querySelector(".add-overlay"));
const dialog = (page) => page.evaluate(() => { const d = document.querySelector(".discard-overlay"); return d ? d.innerText.replace(/\s+/g, " ").trim() : null; });
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
// innerText follows CSS text-transform (the type buttons are upper-cased), so labels are compared case-insensitively.
const clickText = (page, sel, txt) => page.evaluate((s, x) => { const b = [...document.querySelectorAll(s)].find((e) => e.innerText.trim().toLowerCase() === x.toLowerCase()); if (!b) throw new Error(`no ${s} labelled "${x}"`); b.click(); }, sel, txt);
const esc = async (page) => { await page.keyboard.press("Escape"); await wait(350); };
const back = async (page) => { await page.evaluate(() => history.back()); await wait(500); };
const routes = {
  "×": async (p) => { await click(p, ".add-close"); await wait(350); },
  "Cancel": async (p) => { await clickText(p, ".add-overlay button", "Cancel"); await wait(350); },
  "Escape": esc,
  "phone Back": back,
};

section("B1. Untouched form closes at once by every route");
let page = await openPage(browser);
for (const [name, close] of Object.entries(routes)) {
  await openAdd(page);
  await close(page);
  ok(!(await isAddOpen(page)) && (await dialog(page)) === null, `untouched form + ${name} → closed, no question`);
}
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("B2. Something typed: every route asks; Keep editing keeps the values; Close without saving discards");
for (const [name, close] of Object.entries(routes)) {
  page = await openPage(browser);
  const before = (await state(page)).transactions.length;
  await openAdd(page);
  await setInput(page, amountInput, "12.50");
  await setInput(page, () => document.querySelector("#txn-merchant"), "Corner shop");
  await close(page);
  const d = await dialog(page);
  ok(await isAddOpen(page) && d && /isn't saved/i.test(d), `typed 12.50 + ${name} → the form stays open and asks "This entry isn't saved"`, d);
  await clickText(page, ".discard-overlay button", "Keep editing"); await wait(300);
  const kept = await page.evaluate(() => ({ amt: document.querySelector(".amount-input").value, dlg: !!document.querySelector(".discard-overlay") }));
  ok(!kept.dlg && kept.amt === "12.50", `…Keep editing closes the question and keeps the amount 12.50`, kept);
  await close(page);
  await clickText(page, ".discard-overlay button", "Close without saving"); await wait(400);
  ok(!(await isAddOpen(page)) && (await state(page)).transactions.length === before, `…Close without saving closes the form and saves nothing (${before} entries before and after)`);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("B2b. Back and Escape while the question is shown mean Keep editing");
page = await openPage(browser);
await openAdd(page); await setInput(page, amountInput, "7");
await back(page);
ok(!!(await dialog(page)), "Back on a typed form → the question appears");
await back(page);
ok(await isAddOpen(page) && (await dialog(page)) === null && (await page.evaluate(() => document.querySelector(".amount-input").value)) === "7", "Back again → the question closes, the form and its amount stay");
await esc(page);
ok(!!(await dialog(page)), "Escape on the typed form → the question appears");
await esc(page);
ok(await isAddOpen(page) && (await dialog(page)) === null, "Escape again → the question closes, the form stays");
await page.close();

section("B3. What counts as typed input");
page = await openPage(browser);
await openAdd(page);
await clickText(page, ".type-btn", "Income"); await wait(150); await clickText(page, ".type-btn", "Expense"); await wait(150);
await click(page, ".add-close"); await wait(350);
ok(!(await isAddOpen(page)), "switching Expense/Income only (no typing) closes without a question");
await page.close();
const seeded = tx({ merchant: "Bravo", amount: 23.4, note: "weekly shop" });
page = await openPage(browser, { seed: baseSeed({ transactions: [seeded] }) });
await tab(page, "Ledger"); await wait(300);
await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => /Bravo/.test(r.innerText)).click()); await wait(400);
const editBtn = await page.evaluate(() => { const b = [...document.querySelectorAll(".sheet button")].find((x) => /^Edit$/i.test(x.innerText.trim())); if (b) { b.click(); return true; } return false; });
await wait(450);
ok(editBtn && await isAddOpen(page), "an existing entry opens in the edit form (precondition)");
await click(page, ".add-close"); await wait(350);
ok(!(await isAddOpen(page)) && (await dialog(page)) === null, "edit form with nothing changed closes without a question");
await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => /Bravo/.test(r.innerText)).click()); await wait(400);
await page.evaluate(() => [...document.querySelectorAll(".sheet button")].find((x) => /^Edit$/i.test(x.innerText.trim())).click()); await wait(450);
await setInput(page, amountInput, "25");
await click(page, ".add-close"); await wait(350);
ok(!!(await dialog(page)), "edit form with the amount changed (23.40 → 25) asks before closing");
await clickText(page, ".discard-overlay button", "Close without saving"); await wait(400);
ok((await state(page)).transactions.find((x) => x.merchant === "Bravo").amount === 23.4, "…and Close without saving leaves the stored entry at 23.40");
await page.close();

section("B4. Saving is unaffected; the question exists in Azerbaijani and Russian");
page = await openPage(browser, { seed: baseSeed({ transactions: [] }) });
await openAdd(page); await setInput(page, amountInput, "9.99");
await click(page, ".add-overlay .btn-primary"); await wait(500);
ok(!(await isAddOpen(page)) && (await dialog(page)) === null && (await state(page)).transactions.some((x) => x.amount === 9.99), "typed + Record → saved and closed with no question");
await page.close();
for (const [lang, want] of [["az", /yadda saxlanmayıb/i], ["ru", /не сохранена/i]]) {
  page = await openPage(browser, { seed: baseSeed({ language: lang }) });
  await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await page.waitForSelector(".amount-input"); await wait(350);
  await setInput(page, amountInput, "5");
  await click(page, ".add-close"); await wait(350);
  const d = await dialog(page);
  ok(d && want.test(d) && !/isn't saved|Keep editing/.test(d), `${lang}: the question is shown in ${lang} with no English left`, d);
  await page.close();
}
section("C. Home and Analytics show what has happened; entries dated later this month are listed apart");
{ const now = new Date(), last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === last) console.log("  (skipped: today is the last day of the month, there is no later date this month)");
  else {
    const later = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate() + 1).padStart(2, "0")}`;
    page = await openPage(browser, { seed: baseSeed({ transactions: [tx({ amount: 10, merchant: "Cafe" }), tx({ amount: 670, category: "housing", merchant: "Landlord", date: later }), tx({ type: "income", category: "salary", amount: 2000 })] }) });
    const hero = await page.evaluate(() => document.querySelector(".hero").innerText.replace(/\s+/g, " "));
    ok(/^.*?10\.00 ₼ spent this month/.test(hero) && !/680/.test(hero), "Home: '10.00 ₼ spent this month' (the 670 dated tomorrow is not spent yet)", hero.slice(0, 160));
    ok(/\+670\.00 ₼ in expenses dated later this month \(not counted yet\)/.test(hero), "Home: '+670.00 ₼ in expenses dated later this month (not counted yet)'", hero);
    await tab(page, "Monthly"); await wait(500);   // redesign: the tab is called Analytics
    // Run 7: Monthly now also lists the month's transactions (the 670 dated tomorrow appears there, as planned — it always
    // did on Monthly), so the check looks at the insight sentences and the Top Expenses card, where it must not appear.
    // Run 15: the Top expenses and All transactions lists were removed from Analytics (they repeated Transactions). The same
    // protection is now checked on the merchants card (the other place a single payment could stand out): the payment dated
    // tomorrow must not be listed as a merchant, and today's Cafe must be.
    const an = await page.evaluate(() => { const top = document.querySelector('[data-section="an-merchant"]'); return { body: document.body.innerText, top: top ? top.innerText : "" }; });
    ok(!/Home accounts for|Housing accounts for/.test(an.body) && !/Landlord/.test(an.top) && /Cafe/.test(an.top), "Monthly: no concentration claim and no merchant entry from the payment dated tomorrow (the merchants card lists Cafe)", { claim: an.body.match(/.{0,60}accounts for.{0,40}/)?.[0], top: an.top });
    ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
    await page.close();
  } }
await finish("e2e_run3", browser);
