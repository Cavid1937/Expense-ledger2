// Run 24: user-made things can be edited — custom category, quick-add template, goal, debt, loan. Synthetic data only.
import { launch, openPage, openCategories, openSettings, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const type = (page, sel, v) => page.$eval(sel, (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const tab = (page, re) => page.evaluate((r) => { [...document.querySelectorAll(".tab-btn")].find((b) => new RegExp(r, "i").test(b.innerText))?.click(); }, re.source);
const seedKeys = (obj) => () => { try { if (!sessionStorage.getItem("__e")) { sessionStorage.setItem("__e", "1"); for (const [k, v] of Object.entries(window.__seedKeys)) localStorage.setItem(k, JSON.stringify(v)); } } catch {} };

section("R24-ED1. Custom category: rename and recolour");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: () => { try { if (!sessionStorage.getItem("__e")) { sessionStorage.setItem("__e", "1"); localStorage.setItem("expense_ledger_v5__cats", JSON.stringify({ version: 1, cats: [{ id: "u_pets01", name: "Pets", income: false, color: "#F28B82" }] })); } } catch {} } });
  await settle(page); await openCategories(page);
  await click(page, '[data-cat="u_pets01"] [data-section="mycat-edit"]'); await wait(250);
  await type(page, "#mycat-edit-name", "Pet care"); await click(page, '[data-section="mycat-edit-save"]'); await wait(350);
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__cats")));
  ok(s.cats[0].name === "Pet care" && s.cats[0].id === "u_pets01", "renamed, same id", s);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-ED2. Template and goal");
{
  const seed = baseSeed({ language: "en", templates: [{ id: "t1", name: "Bus", amount: 0.6, catId: "transport", subcat: "", merchant: "", note: "" }], goals: [{ id: "g1", name: "Trip", target: 1000, saved: 100, monthlyTarget: 0, targetDate: null }] });
  const page = await openPage(browser, { seed }); await settle(page);
  await tab(page, /goals/); await wait(400);
  await page.evaluate(() => [...document.querySelectorAll(".seg-btn")].find((b) => /goals/i.test(b.innerText))?.click()); await wait(300);
  await click(page, '[data-section="goal-edit"]'); await wait(250);
  await type(page, "#goal-name", "Summer trip"); await type(page, "#goal-target", "1500"); await wait(100);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /save goal/i.test(b.innerText))?.click()); await wait(350);
  let st = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")));
  ok(st.goals.length === 1 && st.goals[0].id === "g1" && st.goals[0].name === "Summer trip" && st.goals[0].target === 1500 && st.goals[0].saved === 100, "the goal is changed in place (name, target), not duplicated", st.goals);
  const hasTpl = await page.evaluate(() => !!document.querySelector('[data-section="tpl-edit"]'));
  ok(hasTpl, "the template has an Edit button");
  if (hasTpl) {
    await click(page, '[data-section="tpl-edit"]'); await wait(250);
    await type(page, "#tpl-name", "Metro"); await type(page, "#tpl-amt", "0.80"); await wait(100);
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /save template/i.test(b.innerText))?.click()); await wait(350);
    st = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")));
    ok(st.templates.length === 1 && st.templates[0].id === "t1" && st.templates[0].name === "Metro" && st.templates[0].amount === 0.8, "the template is changed in place", st.templates);
  }
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-ED3. Debt and loan");
{
  const debts = { version: 1, debts: [{ id: "d1", direction: "owe", name: "Rauf", principal: 10000, dueDate: "", note: "", payments: [{ id: "p1", date: "2026-10-05", amount: 3000 }] }], loans: [{ id: "l1", lender: "Kapital", kind: "cash", principal: 120000, ratePct: 0, rateType: "none", months: 12, firstPayment: "2026-12-01", bankPayment: null, payments: [] }] };
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: () => { try { if (!sessionStorage.getItem("__e")) { sessionStorage.setItem("__e", "1"); localStorage.setItem("expense_ledger_v5__debts", JSON.stringify({ version: 1, debts: [{ id: "d1", direction: "owe", name: "Rauf", principal: 10000, dueDate: "", note: "", payments: [{ id: "p1", date: "2026-10-05", amount: 3000 }] }], loans: [{ id: "l1", lender: "Kapital", kind: "cash", principal: 120000, ratePct: 0, rateType: "none", months: 12, firstPayment: "2026-12-01", bankPayment: null, payments: [] }] })); } } catch {} } });
  await settle(page);
  await page.evaluate(() => { [...document.querySelectorAll(".tab-btn")].at(-1).click(); }); await wait(300);
  await page.evaluate(() => { [...document.querySelectorAll(".list-row")].find((b) => /debt|loan/i.test(b.innerText))?.click(); }); await wait(500);
  await click(page, '[data-section="debt-edit"]'); await wait(250);
  await type(page, "#debt-edit-amt", "50"); await type(page, "#debt-edit-name", "Rauf M."); await click(page, '[data-section="debt-edit-save"]'); await wait(350);
  let d = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__debts")));
  ok(d.debts[0].name === "Rauf M." && d.debts[0].principal === 5000 && d.debts[0].payments.length === 1, "debt renamed, amount 50.00, repayment kept", d.debts[0]);
  await click(page, '[data-section="debt-edit"]'); await wait(200);
  await type(page, "#debt-edit-amt", "10"); await click(page, '[data-section="debt-edit-save"]'); await wait(300);
  d = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__debts")));
  ok(d.debts[0].principal === 5000, "an amount below what is already repaid (30.00) is refused", d.debts[0]);
  await page.evaluate(() => [...document.querySelectorAll(".seg-btn")].find((b) => /loan/i.test(b.innerText))?.click()); await wait(300);
  await click(page, '[data-section="loan-edit"]'); await wait(250);
  await type(page, "#loan-edit-lender", "Kapital Bank"); await click(page, '[data-section="loan-edit-save"]'); await wait(350);
  d = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__debts")));
  ok(d.loans[0].lender === "Kapital Bank" && d.loans[0].principal === 120000, "loan lender renamed, amount untouched", d.loans[0]);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run24_edits", browser);
