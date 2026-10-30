// Run 6 (2026-10-27) in the real bundled app: D16 (a failed read pauses the real save path), D8/D14 (a file with no usable
// transactions cannot empty the ledger from the import sheet), D20 (Record payment settles a recurring bill), D1 in Safe to Spend.
import { openSafe, launch, openPage, state, clickText, openSettings, openData, openAdd, tab, wait, ok, section, finish, tx, baseSeed, TODAY, ymd, bodyText, KEY, fs, path } from "./lib.mjs";
const browser = await launch();
const IMP = process.env.E2E_IMP_DIR || path.join(process.env.TEMP || "/tmp", "ledger-imp"); fs.mkdirSync(IMP, { recursive: true });
const setAmount = (page, v) => page.$eval(".amount-input", (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const raw = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);

section("R6-B1. D16: a failed read of the saved data pauses saving in the real app");
const seed = baseSeed();
// The browser refuses the FIRST read of expense_ledger_v5 (later reads and all writes work), as a transient storage error would.
let page = await openPage(browser, { seed, pre: `(() => { const g = Storage.prototype.getItem; let once = true; Storage.prototype.getItem = function (k) { if (once && k === ${JSON.stringify(KEY)}) { once = false; throw new DOMException("refused", "SecurityError"); } return g.call(this, k); }; })()` });
const stored0 = await raw(page);
ok(/could not be read right now/i.test(await bodyText(page)), "the app says the saved data could not be read and saving is paused", (await bodyText(page)).slice(0, 200));
await openAdd(page); await setAmount(page, "25"); await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(400);
const stored1 = await raw(page);
ok(stored1 === stored0 && JSON.parse(stored1).transactions.length === seed.transactions.length, "after adding an expense, the stored ledger is byte-for-byte unchanged (the empty view was never written over it)", { before: stored0?.length, after: stored1?.length });
ok(/saving is paused/i.test(await bodyText(page)), "a 'saving is paused' banner is shown");
await page.close();
page = await openPage(browser, { seed });
ok(!/could not be read/i.test(await bodyText(page)) && (await state(page)).transactions.length === seed.transactions.length, "control: a normal start reads the ledger and shows no notice");
await page.close();

section("R6-B2. D8/D14: a settings-only file offers no Replace and keeps every transaction");
const file = path.join(IMP, "settings-only.json"); fs.writeFileSync(file, JSON.stringify({ currency: "$", budgets: { food: 250 } }));
page = await openPage(browser, { seed });
const n0 = (await state(page)).transactions.length;
await openData(page); const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file); await page.waitForSelector('[aria-label="Restore backup"]'); await wait(250);
const sheet = await page.evaluate(() => document.querySelector('[aria-label="Restore backup"]').innerText);
ok(!/Replace — use the file's data/.test(sheet) && /No transactions in this file/.test(sheet) && /keep my transactions/i.test(sheet), "the sheet explains there are no transactions and offers 'Use the file's settings — keep my transactions' instead of Replace", sheet);
await page.evaluate(() => document.querySelector(".import-settings-only").click()); await wait(400);
let st = await state(page);
ok(st.transactions.length === n0 && st.currency === "$" && st.budgets.food === 250, "after applying: all transactions kept, currency $ and the food budget 250 applied", { n: st.transactions.length, cur: st.currency, b: st.budgets });
ok((await page.evaluate((k) => Object.keys(localStorage).filter((x) => x.startsWith(k + "__before_import_")).length, KEY)) === 1, "a recovery copy of the previous state was kept first");
await page.close();
const full = path.join(IMP, "full.json"); fs.writeFileSync(full, JSON.stringify({ version: 9, transactions: [tx({ merchant: "FromFile", amount: 7 })], currency: "€" }));
page = await openPage(browser, { seed });
await openData(page); await (await page.$(".io-page input[type=file]")).uploadFile(full); await page.waitForSelector('[aria-label="Restore backup"]'); await wait(250);
ok(/Replace — use the file's data/.test(await page.evaluate(() => document.querySelector('[aria-label="Restore backup"]').innerText)), "control: a backup with transactions still offers Replace");
await page.close();

section("R6-B3. D20: 'Record payment' on the Recurring screen settles the bill");
const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
if (d < 2) throw new Error("e2e_run6 R6-B3 needs a day of the month ≥ 2 (a bill due earlier this month) — rerun tomorrow");
const due = ymd(new Date(y, m - 1, 1));     // monthly bill last paid on the 1st of last month → due on the 1st of this month (unpaid)
const billSeed = baseSeed({ transactions: [tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: TODAY }),
  tx({ merchant: "Kommunal", category: "housing", subcategory: "Electricity", amount: 90, recurring: true, recurFreq: "monthly", date: due })] });
page = await openPage(browser, { seed: billSeed });
await openSafe(page); const card0 = await page.evaluate(() => document.querySelector(".safe-card").innerText);
ok(/Upcoming & unrecorded payments\s*−90\.00/.test(card0), "before: the unpaid 90.00 bill is set aside in Safe to Spend", card0);
await tab(page, "Recurring"); await wait(300);
ok(/Tap “Record payment” so it counts as paid/.test(await bodyText(page)), "the Recurring screen explains how to mark a bill as paid");
await clickText(page, "button", /^Record payment$/); await page.waitForSelector(".amount-input"); await wait(350);
const form = await page.evaluate(() => ({ amount: document.querySelector(".amount-input").value, merchant: [...document.querySelectorAll(".add-overlay input")].map((i) => i.value).join("|"), recur: document.querySelector('.add-overlay [role=switch][aria-label="Recurring"]')?.getAttribute("aria-checked") }));
ok(form.amount === "90" && /Kommunal/.test(form.merchant) && form.recur === "true", "the Add form opens filled in: 90, Kommunal, Recurring on", form);
await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(500);
st = await state(page);
const paid = st.transactions.find((t) => t.merchant === "Kommunal" && t.date === TODAY);
ok(paid && paid.recurring === true && paid.recurFreq === "monthly" && paid.subcategory === "Electricity" && paid.amount === 90, "saved as the same bill, dated today", paid);
await tab(page, "Home"); await wait(300);
await openSafe(page); const card1 = await page.evaluate(() => document.querySelector(".safe-card").innerText);
ok(/Upcoming & unrecorded payments\s*none this month/.test(card1), "after: the bill is no longer set aside (paid once, reserved once)", card1);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
await finish("e2e_run6", browser);
