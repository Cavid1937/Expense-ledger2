import { launch, openPage, state, tab, wait, tx, baseSeed } from "../browser/lib.mjs";
const b = await launch(); const d = new Date(), pad = (n) => String(n).padStart(2, "0"); const ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const DAY = pad(Math.min(d.getDate() - 1, 28) || 1);
const income = tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: `${ym(0)}-01` });
const bill = { id: "rent1", name: "Rent", type: "expense", category: "housing", subcategory: "", amount: 800, freq: "monthly", anchorDate: `${ym(-2)}-${DAY}`, active: true, createdAt: "x" };
const page = await openPage(b, { seed: baseSeed({ transactions: [income], bills: [bill], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } }) });
const set = (sel, v) => page.evaluate((s, val) => { const el = document.querySelector(s); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, sel, v);
for (const click of [".bill-ask-pay", ".bill-ask-new"]) {
  await tab(page, "Home"); await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await page.waitForSelector(".amount-input"); await wait(350);
  await set(".amount-input", "800"); await set("#txn-merchant", "Rent");
  await page.evaluate(() => document.querySelector('.add-overlay [role=switch][aria-label="Recurring"]').click()); await wait(150);
  await page.evaluate(() => [...document.querySelectorAll(".add-overlay .btn-primary")].find((b) => /Record/.test(b.innerText)).click()); await wait(350);
  await page.evaluate((c) => document.querySelector(c).click(), click); await wait(500);
  const st = await state(page); console.log(click, JSON.stringify({ bills: st.bills.map((x) => x.id + ":" + x.name), tx: st.transactions.map((t) => [t.merchant, t.amount, t.billId, t.recurring]) }));
}
await b.close();
