// Run 12 (2026-10-27) in the real bundled app: explicit bills. The Run 8 collision (electricity 90 and water 18 from the same
// utility, both Home / Utilities, monthly) end to end: old data → convert (Undo) → split → Safe to Spend; a new user adding
// bills and paying them; deleting a bill keeps its payments. Dates are relative to today.
import { openSafe, launch, openPage, state, clickText, tab, wait, ok, section, finish, tx, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const DAY = pad(Math.min(d.getDate() - 1, 28) || 1);   // a due day already past this month (yesterday, or the 1st on the 1st)
const income = tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: `${ym(0)}-01` });
const K = (o) => tx({ merchant: "Kommunal", category: "housing", subcategory: "Utilities", recurring: true, recurFreq: "monthly", ...o });
const legacySeed = () => baseSeed({ transactions: [income, K({ amount: 90, note: "Electricity", date: `${ym(-1)}-${DAY}` }), K({ amount: 18, note: "Water", date: `${ym(-1)}-${DAY}` }), K({ amount: 18, note: "Water", date: `${ym(0)}-${DAY}` })],
  goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } });
const discretionary = async (page) => { await tab(page, "Home"); await wait(250); await openSafe(page); return page.evaluate(() => ([...document.querySelectorAll(".safe-row")].map((e) => e.innerText.replace(/\s+/g, " ")).find((x) => /Discretionary/.test(x)) || "")); };

section("R12-1. Old data: convert to bills (with Undo), then split the merged pair");
{
  const page = await openPage(browser, { seed: legacySeed() });
  ok(/\+1,982\.00/.test(await discretionary(page)), "before: the two utility bills are one inferred schedule → discretionary +1,982 (electricity not set aside)");
  await tab(page, "Recurring");
  ok(/Turn your recurring payments into bills/.test(await page.evaluate(() => document.body.innerText)), "the Recurring page explains the old grouping and offers 'Convert to bills'");
  const before = await state(page);
  await clickText(page, ".rec-convert", /Convert to bills/); await wait(400);
  let st = await state(page);
  ok(st.bills.length === 1 && st.transactions.filter((t) => t.recurring).every((t) => t.billId === st.bills[0].id) && !(await page.$(".bill-convert")), "one bill is created, every old recurring payment points to it, the offer disappears", st.bills);
  ok(JSON.stringify(st.transactions.map((t) => [t.id, t.amount, t.date, t.merchant, t.note])) === JSON.stringify(before.transactions.map((t) => [t.id, t.amount, t.date, t.merchant, t.note])), "no entry's id, amount, date, name or note changed");
  ok(await page.evaluate(() => Object.keys(localStorage).some((k) => /before_bills/.test(k))), "a recovery copy of the data was kept before converting");
  await clickText(page, ".snackbar-undo", /Undo/); await wait(300);
  st = await state(page);
  ok(!st.bills?.length && st.transactions.every((t) => !t.billId), "Undo puts the data back exactly as before the conversion");
  await tab(page, "Recurring"); await clickText(page, ".rec-convert", /Convert to bills/); await wait(400);
  // split: open the electricity payment and move it to a new bill
  await tab(page, "Ledger"); await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => /Electricity/.test(r.innerText)).click()); await page.waitForSelector(".sheet"); await wait(300);
  ok(/Payment of: Kommunal/.test(await page.evaluate(() => document.querySelector(".sheet").innerText)), "the payment says which bill it belongs to");
  await clickText(page, ".sheet .link-bill", /Move to another bill/); await wait(200);
  await clickText(page, ".sheet .link-bill-new", /new bill from this payment/); await wait(400);
  st = await state(page);
  const e = st.transactions.find((t) => t.note === "Electricity");
  ok(st.bills.length === 2 && st.bills.find((b) => b.id === e.billId)?.amount === 90, "the electricity payment now has its own bill (90)", st.bills);
  ok(/\+1,892\.00/.test(await discretionary(page)), "Safe to Spend now sets electricity aside: discretionary +1,892 (was +1,982, overstated by 90)");
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
  const reloaded = await state(page);
  ok(reloaded.bills.length === 2 && JSON.stringify(reloaded.bills) === JSON.stringify(st.bills) && reloaded.transactions.filter((t) => t.billId).length === 3 && /\+1,892\.00/.test(await discretionary(page)), "after reloading the page (the real load path): the same two bills, the same three links, the same +1,892", { bills: reloaded.bills.length });
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R12-2. A new user: add two bills from the same company, pay one");
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: [income], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } }) });
  const addBill = async (name, amount) => {
    await tab(page, "Recurring"); await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await page.waitForSelector(".bill-sheet"); await wait(300);
    await page.evaluate((n, a, dd) => { const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
      set(document.querySelector("#bill-name"), n); set(document.querySelector("#bill-amount"), a); set(document.querySelector("#bill-date"), dd); }, name, String(amount), `${ym(0)}-${DAY}`);
    await wait(150); await page.evaluate(() => document.querySelector(".bill-save").click()); await wait(350);
  };
  await addBill("Kommunal electricity", 90); await addBill("Kommunal water", 18);
  let st = await state(page);
  ok(st.bills.length === 2 && st.bills.every((b) => b.freq === "monthly" && b.anchorDate === `${ym(0)}-${DAY}`), "two bills saved with the chosen due date", st.bills);
  ok(/\+1,892\.00/.test(await discretionary(page)), "both are set aside: 2,000 − 90 − 18 = +1,892");
  await tab(page, "Recurring");
  await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /Record payment/.test(b.innerText))[1].click()); await page.waitForSelector(".amount-input"); await wait(350);
  const pre = await page.evaluate(() => ({ bill: document.querySelector(".bill-choice option:checked")?.innerText || "", amount: document.querySelector(".amount-input").value }));
  ok(/Kommunal water/.test(pre.bill) && pre.amount === "18", "Record payment on the water bill opens the form with that bill already chosen", pre);
  await page.evaluate(() => [...document.querySelectorAll(".add-overlay .btn-primary")].find((b) => /Record/.test(b.innerText)).click()); await wait(400);
  st = await state(page);
  const water = st.bills.find((b) => /water/.test(b.name)), pay = st.transactions.find((t) => t.billId === water.id);
  ok(pay && pay.amount === 18 && pay.recurring && st.transactions.filter((t) => t.billId).length === 1, "one payment, linked to the water bill only");
  ok(/\+1,892\.00/.test(await discretionary(page)), "water counted once as spent, electricity still set aside: 2,000 − 18 − 90 = +1,892");
  // delete the electricity bill: nothing set aside for it any more, no entry removed
  await tab(page, "Recurring"); await page.evaluate(() => [...document.querySelectorAll(".bill-row")].find((r) => /electricity/.test(r.innerText)).click()); await page.waitForSelector(".bill-sheet"); await wait(300);
  await page.evaluate(() => document.querySelector(".bill-delete").click()); await wait(350);
  st = await state(page);
  ok(st.bills.length === 1 && st.transactions.length === 2 && /\+1,982\.00/.test(await discretionary(page)), "deleting the electricity bill keeps every entry; it is no longer set aside (+1,982)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
// ── Review round (advisor, 2026-10-27): holes the first Run 12 tests did not reach. Written before the fixes. ──────────────
const BILLS = (b) => b;
const bill = (o) => ({ name: "Gym", type: "expense", category: "health", subcategory: "", amount: 50, freq: "monthly", anchorDate: `${ym(-2)}-${DAY}`, active: true, createdAt: "2026-01-01T00:00:00Z", ...o });
const setField = (page, sel, v) => page.evaluate((s, val) => { const el = document.querySelector(s); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, sel, v);

section("R12-3. Mixed state: some bills, some recurring payments still grouped the old way (the real starting point)");
{
  const rent = (o) => tx({ merchant: "Rent", category: "housing", subcategory: "", amount: 800, recurring: true, recurFreq: "monthly", ...o });
  const seed = (extra = []) => baseSeed({ transactions: [income, rent({ date: `${ym(-1)}-${DAY}` }), rent({ date: `${ym(0)}-${DAY}` }), ...extra], bills: [bill({ id: "gym1" })], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } });
  let page = await openPage(browser, { seed: seed() });
  ok(/\+1,150\.00/.test(await discretionary(page)), "start: rent paid, the Gym bill (50, due on day " + DAY + ") not yet paid → +1,150 (2,000 − 800 − 50)");
  await tab(page, "Recurring");
  await page.evaluate(() => [...document.querySelectorAll(".bill-row")].find((r) => /Gym/.test(r.innerText)).closest("div[style]").parentElement.querySelector(".rec-record").click()); await page.waitForSelector(".amount-input"); await wait(350);
  ok(/Gym/.test(await page.evaluate(() => document.querySelector(".bill-choice option:checked")?.innerText || "")), "Record payment on the Gym bill opens the form with that bill chosen — even though old-style groups still exist");
  await page.evaluate(() => [...document.querySelectorAll(".add-overlay .btn-primary")].find((b) => /Record/.test(b.innerText)).click()); await wait(400);
  let st = await state(page); const pay = st.transactions.find((t) => t.billId === "gym1");
  ok(!!pay && pay.amount === 50 && pay.recurring === true, "the payment is linked to the Gym bill (was: saved with no link)", st.transactions.filter((t) => t.merchant === "Gym"));
  await tab(page, "Recurring");
  const rows = await page.evaluate(() => [...document.querySelectorAll(".rec-record")].length);
  ok(rows === 2, "Recurring still shows exactly two schedules — Rent and the Gym bill — not a third copy of Gym", rows);
  ok(/\+1,150\.00/.test(await discretionary(page)), "Gym is counted once, as paid: +1,150 (was: paid AND still set aside → +1,100)");
  await page.close();
  // the detail sheet: an ordinary expense linked to the Gym bill in the same mixed state
  page = await openPage(browser, { seed: seed([tx({ merchant: "Gym", category: "health", amount: 50, date: `${ym(0)}-${DAY}` })]) });
  await tab(page, "Ledger"); await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => /Gym/.test(r.innerText)).click()); await page.waitForSelector(".sheet"); await wait(300);
  await clickText(page, ".sheet .link-bill", /payment of a recurring bill/i); await wait(200);
  await clickText(page, ".sheet .link-bill-option", /Gym/); await wait(400);
  st = await state(page);
  ok(st.transactions.find((t) => t.merchant === "Gym")?.billId === "gym1", "linking an ordinary expense to a bill from its detail sheet works in the mixed state too (was: the link was lost)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R12-4. Adding the same recurring bill again asks; it never silently multiplies bills");
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: [income], bills: [bill({ id: "rent1", name: "Rent", category: "housing", amount: 800 })], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } }) });
  const addRecurring = async () => {
    await tab(page, "Home"); await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await page.waitForSelector(".amount-input"); await wait(350);
    await setField(page, ".amount-input", "800"); await setField(page, "#txn-merchant", "Rent");
    await page.evaluate(() => document.querySelector('.add-overlay [role=switch][aria-label="Recurring"]').click()); await wait(150);
    await page.evaluate(() => [...document.querySelectorAll(".add-overlay .btn-primary")].find((b) => /Record/.test(b.innerText)).click()); await wait(350);
  };
  await addRecurring();
  let st = await state(page);
  ok(!!(await page.$(".bill-ask")) && st.bills.length === 1 && st.transactions.length === 1, "saving 'Rent 800, recurring' while a Rent bill exists asks first: payment of that bill, or a separate bill? Nothing is saved yet", { bills: st.bills.length, txns: st.transactions.length });
  await page.evaluate(() => document.querySelector(".bill-ask-pay").click()); await wait(400);
  st = await state(page); const p1 = st.transactions.find((t) => t.merchant === "Rent");
  ok(st.bills.length === 1 && p1?.billId === "rent1", "'It is a payment of Rent' → saved as that bill's payment; still one bill");
  await addRecurring();
  await page.evaluate(() => document.querySelector(".bill-ask-new").click()); await wait(400);
  st = await state(page);
  ok(st.bills.length === 2 && st.transactions.filter((t) => t.billId).length === 2 && new Set(st.transactions.map((t) => t.billId).filter(Boolean)).size === 2, "'It is a separate bill' → a second bill, and that payment points to it");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R12-5. Deleting a bill that has payments does not bring the money back into Safe to Spend");
{
  const gymPay = tx({ merchant: "Gym", category: "health", amount: 50, recurring: true, recurFreq: "monthly", billId: "gym1", date: `${ym(-1)}-${DAY}` });
  const page = await openPage(browser, { seed: baseSeed({ transactions: [income, gymPay], bills: [bill({ id: "gym1" })], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } }) });
  ok(/\+1,950\.00/.test(await discretionary(page)), "start: the Gym bill is unpaid this month → set aside: +1,950");
  await tab(page, "Recurring"); await page.evaluate(() => [...document.querySelectorAll(".bill-row")].find((r) => /Gym/.test(r.innerText)).click()); await page.waitForSelector(".bill-sheet"); await wait(300);
  await page.evaluate(() => document.querySelector(".bill-delete").click()); await wait(400);
  let st = await state(page);
  const kept = st.transactions.find((t) => t.id === gymPay.id);
  ok(st.bills.length === 0 && st.transactions.length === 2 && kept && kept.recurring === false && !kept.billId && kept.amount === 50 && kept.date === gymPay.date && kept.merchant === "Gym", "the bill is gone; its payment stays in the history as an ordinary entry (same amount, date, name)");
  await tab(page, "Recurring");
  ok(!(await page.$(".bill-convert")), "the Recurring page does NOT offer to convert anything (the deleted bill is not resurrected as a paused group)");
  await tab(page, "Home"); await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await page.waitForSelector(".amount-input"); await wait(350);
  await page.evaluate(() => document.querySelector('.add-overlay [role=switch][aria-label="Recurring"]').click()); await wait(200);
  ok(await page.evaluate(() => [...document.querySelectorAll(".bill-choice option")].some((o) => o.value === "new")), "the add form still offers \"A new bill (from this entry)\" — adding bills is not blocked afterwards");
  await page.keyboard.press("Escape"); await wait(400); if (await page.$(".discard-overlay")) { await page.evaluate(() => document.querySelector(".discard-overlay .discard-leave, .discard-overlay .btn-ghost")?.click()); await wait(300); }
  ok(/\+2,000\.00/.test(await discretionary(page)), "nothing is set aside for a bill the user deleted: +2,000 (was: +1,950, regrouped as a live schedule)");
  await clickText(page, ".snackbar-undo", /Undo/); await wait(300);
  st = await state(page);
  const back = st.transactions.find((t) => t.id === gymPay.id);
  ok(st.bills.length === 1 && back?.billId === "gym1" && back?.recurring === true && /\+1,950\.00/.test(await discretionary(page)), "Undo brings the bill and the payment back exactly");
  await page.close();
}
await finish("e2e_run12", browser);
