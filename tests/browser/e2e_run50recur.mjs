// Run 50 in the real bundled app: "Looks like a bill" on the Recurring page: Review -> pre-filled new bill -> Save; and "Not a bill".
import { launch, openPage, tab, state, ok, section, finish, baseSeed, tx, wait } from "./lib.mjs";
const browser = await launch();
const clock = `() => { try { if (!sessionStorage.getItem("__r50r")) { sessionStorage.setItem("__r50r", "1"); localStorage.removeItem("expense_ledger_v5__recsug"); } } catch (e) {} const fixed = new Date(2026, 9, 20, 12, 0, 0).getTime(); const RD = Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } } window.Date = FD; }`;
const seed = () => baseSeed({ transactions: ["2026-07-05", "2026-08-05", "2026-09-05"].map((d) => tx({ merchant: "Netflix", category: "digital", subcategory: "Streaming", amount: 9.99, date: d })), bills: [] });
const card = (page) => page.evaluate(() => { const c = document.querySelector('[data-section="rec-suggest"]'); return c ? c.innerText : null; });

section("R50-RB1. Review and save as a bill");
let page = await openPage(browser, { seed: seed(), pre: eval(clock) });
await tab(page, "Recurring"); await wait(600);
let txt = await card(page);
ok(txt && /Netflix/.test(txt) && /9\.99/.test(txt) && /monthly/.test(txt), "the card names Netflix, 9.99, monthly", txt);
await page.evaluate(() => document.querySelector('[data-section="rec-suggest-review"]').click()); await page.waitForSelector(".bill-sheet", { timeout: 4000 }); await wait(400);
const form = await page.evaluate(() => ({ name: document.querySelector("#bill-name").value, amount: document.querySelector("#bill-amount").value, freq: document.querySelector("#bill-freq").value, date: document.querySelector("#bill-date").value, del: !!document.querySelector(".bill-delete") }));
ok(form.name === "Netflix" && form.amount === "9.99" && form.freq === "monthly" && form.date === "2026-11-05", "the new-bill form is pre-filled: Netflix, 9.99, monthly, first due 5 Nov", form);
ok(form.del === false, "it is a NEW bill (no Delete button)");
const before = await state(page);
ok((before.bills || []).length === 0, "nothing was created before Save");
await page.evaluate(() => document.querySelector(".bill-save").click()); await wait(700);
const st = await state(page);
ok(st.bills.length === 1 && st.bills[0].name === "Netflix" && st.bills[0].amount === 9.99 && st.bills[0].freq === "monthly" && st.bills[0].anchorDate === "2026-11-05", "one bill saved with those values", st.bills);
ok(st.transactions.length === 3, "the three earlier payments are untouched");
ok((await card(page)) === null, "the suggestion disappears once a bill with that name exists");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R50-RB2. Not a bill");
page = await openPage(browser, { seed: seed(), pre: eval(clock) });
await tab(page, "Recurring"); await wait(600);
await page.evaluate(() => document.querySelector('[data-section="rec-suggest-dismiss"]').click()); await wait(400);
ok((await card(page)) === null && (await state(page)).bills.length === 0, "the card goes and no bill is made");
await page.reload(); await wait(800); await tab(page, "Recurring"); await wait(500);
ok((await card(page)) === null, "it stays dismissed after a reload");
await page.close(); await browser.close();
finish("e2e_run50recur");
