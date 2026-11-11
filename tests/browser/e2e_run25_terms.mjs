// Run 25: loan terms can be edited; debts/loans give notices; own subcategories can be renamed (entries follow). Synthetic data only.
import { launch, openPage, openAdd, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const type = (page, sel, v) => page.$eval(sel, (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const toast = (page) => page.evaluate(() => ((document.querySelector(".toast") || {}).innerText || ""));
const loanPre = (payments) => () => { try { if (!sessionStorage.getItem("__e")) { sessionStorage.setItem("__e", "1"); localStorage.setItem("expense_ledger_v5__debts", JSON.stringify({ version: 1, debts: [], loans: [{ id: "l1", lender: "Kapital", kind: "cash", principal: 120000, ratePct: 12, rateType: "annuity", months: 12, firstPayment: "2026-12-01", bankPayment: null, payments: [] }] })); } } catch {} };
const openLoans = async (page) => {
  await page.evaluate(() => { [...document.querySelectorAll(".tab-btn")].at(-1).click(); }); await wait(300);
  await page.evaluate(() => { [...document.querySelectorAll(".list-row")].find((b) => /debt|loan/i.test(b.innerText))?.click(); }); await wait(500);
  await page.evaluate(() => [...document.querySelectorAll(".seg-btn")].find((b) => /loan/i.test(b.innerText))?.click()); await wait(300);
};
const readLoan = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__debts")).loans[0]);

section("R25-T1. Loan terms: amount, rate and number of payments");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: loanPre() }); await settle(page); await openLoans(page);
  await click(page, '[data-section="loan-edit"]'); await wait(250);
  ok(await page.$eval("#loan-edit-amt", (e) => e.value) === "1200.00" && await page.$eval("#loan-edit-months", (e) => e.value) === "12" && await page.$eval("#loan-edit-rate", (e) => e.value) === "12", "the edit form starts with the loan's own amount, payments and rate");
  await type(page, "#loan-edit-amt", "2400"); await type(page, "#loan-edit-months", "24"); await type(page, "#loan-edit-rate", "10");
  await click(page, '[data-section="loan-edit-save"]'); await wait(350);
  const l = await readLoan(page);
  ok(l.principal === 240000 && l.months === 24 && l.ratePct === 10 && l.lender === "Kapital" && l.id === "l1" && l.firstPayment === "2026-12-01", "terms saved in place (amount in cents, months, rate); id and first date kept", l);
  ok(/Edit|Dəyiş|Изменить|Saved|Updated/i.test(await toast(page)) || (await toast(page)).length > 0, "a notice confirms it", await toast(page));
  await click(page, '[data-section="loan-edit"]'); await wait(200);
  await type(page, "#loan-edit-months", "0"); await click(page, '[data-section="loan-edit-save"]'); await wait(300);
  ok((await readLoan(page)).months === 24, "0 payments is refused and nothing changes");
  await type(page, "#loan-edit-amt", "abc"); await click(page, '[data-section="loan-edit-save"]'); await wait(300);
  ok((await readLoan(page)).principal === 240000, "an empty amount is refused and nothing changes");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R25-T2. Fewer payments than already paid are refused");
{
  const pre = () => { try { if (!sessionStorage.getItem("__e")) { sessionStorage.setItem("__e", "1"); localStorage.setItem("expense_ledger_v5__debts", JSON.stringify({ version: 1, debts: [], loans: [{ id: "l1", lender: "Kapital", kind: "cash", principal: 120000, ratePct: 0, rateType: "none", months: 12, firstPayment: "2026-12-01", bankPayment: null, payments: [{ id: "p1", date: "2026-12-01", amount: 10000 }, { id: "p2", date: "2027-01-01", amount: 10000 }, { id: "p3", date: "2027-02-01", amount: 10000 }] }] })); } } catch {} };
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre }); await settle(page); await openLoans(page);
  await click(page, '[data-section="loan-edit"]'); await wait(250);
  ok(!(await page.$("#loan-edit-rate")), "a loan without interest shows no rate box");
  await type(page, "#loan-edit-months", "2"); await click(page, '[data-section="loan-edit-save"]'); await wait(300);
  let l = await readLoan(page); ok(l.months === 12 && l.payments.length === 3, "2 payments when 3 are already paid is refused; payments kept", l);
  await type(page, "#loan-edit-months", "6"); await click(page, '[data-section="loan-edit-save"]'); await wait(300);
  l = await readLoan(page); ok(l.months === 6 && l.payments.length === 3 && l.payments[0].amount === 10000, "6 payments is fine; recorded payments keep their amounts", l);
  await page.close();
}
section("R25-T3. Notices for debts and loans");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: loanPre() }); await settle(page); await openLoans(page);
  await page.evaluate(() => { window.confirm = () => true; });
  await page.evaluate(() => document.querySelector('[data-section="loan-card"] .topbar-btn').click()); await wait(300);
  { const sb = await page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || ""); ok(/Loan removed/.test(sb) && /Undo/.test(sb), "removing a loan says 'Loan removed'", sb); }   // Run 51: now an Undo bar, not a plain message
  ok((await page.evaluate(() => { const r = localStorage.getItem("expense_ledger_v5__debts"); return r ? JSON.parse(r).loans.length : 0; })) === 0, "and the loan is gone");
  await page.close();
}
section("R25-T4. Rename one of my own subcategories; earlier entries follow");
{
  const pre = () => { try { if (!sessionStorage.getItem("__e")) { sessionStorage.setItem("__e", "1"); localStorage.setItem("expense_ledger_v5__subcats", JSON.stringify({ version: 1, byCategory: { food: ["Kiosk"] } })); } } catch {} };
  const seed = baseSeed({ language: "en", transactions: [tx({ id: 1790001000001, merchant: "Old", amount: 5, category: "food", subcategory: "Kiosk" })] });
  const page = await openPage(browser, { seed, pre }); await settle(page); await openAdd(page); await wait(300);
  await click(page, '[data-section="add-subcat-rename"]'); await wait(250);
  await type(page, '[data-section="add-subcat-rename-form"] input', "Corner shop"); await click(page, '[data-section="add-subcat-rename-save"]'); await wait(350);
  const subs = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__subcats")));
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")));
  ok(subs.byCategory.food.join("|") === "Corner shop", "the suggestion is renamed", subs);
  ok(st.transactions.find((x) => x.merchant === "Old").subcategory === "Corner shop", "the earlier entry now shows the new name", st.transactions.map((x) => x.subcategory));
  ok(/Renamed/.test(await toast(page)), "a notice says it was renamed", await toast(page));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run25_terms", browser);
