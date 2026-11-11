// Run 51 (owner, 10 Nov: "why doesn't this section have an undo?"): every delete that had only a plain message now offers Undo.
// Debts page: a debt (with its linked entry), a loan payment (with its entry), a loan. Settings: an own category. Add form: an own subcategory.
// Each case: delete, see the Undo bar, undo, and compare what is stored with what was stored before. Synthetic data only.
import { launch, openPage, openCategories, openAdd, state, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts", CKEY = "expense_ledger_v5__cats", SKEY = "expense_ledger_v5__subcats";
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dstr(d); };
const get = (page, k) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), k);
const setVal = (page, sel, v) => page.$eval(sel, (el, v) => { const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }, v);
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(250); };
const openDebts = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150); await page.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250); };
const snack = (page) => page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "");
// Undo is tapped the way a finger would reach it: the button must be the top element at its own centre (not hidden under a sheet).
const undo = (page) => page.evaluate(() => { const b = document.querySelector(".snackbar-undo"); if (!b) return "none"; const r = b.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (top !== b && !b.contains(top)) return "covered"; b.click(); return "ok"; });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// After a reload the app writes each entry's fields in its own fixed order; the values must be equal, the order of the keys need not be.
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const sameValues = (a, b) => same(canon(a), canon(b));

section("R51-U1. A debt with a recorded repayment: delete, Undo");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page);
  await click(page, '[data-section="debt-add-btn"]');
  await setVal(page, "#debt-name", "Rauf"); await setVal(page, "#debt-amt", "300");
  await click(page, 'input[name="debt-dir"][value="owed"]'); await click(page, '[data-section="debt-save"]'); await wait(300);
  const n0 = (await state(page)).transactions.length;
  await setVal(page, '[data-section="debt-card"] .debt-pay-input', "100"); await click(page, '[data-section="debt-card"] .debt-pay-btn'); await wait(250);
  await click(page, ".debt-ask-yes"); await wait(400);
  const before = { debts: await get(page, DKEY), tx: (await state(page)).transactions };
  ok(before.debts.debts[0].payments.length === 1 && before.tx.length === n0 + 1 && before.tx.some((x) => x.debtLink), "start: one repayment of 100 with its own entry in Transactions");
  await page.evaluate(() => new Promise((r) => { const t = setInterval(() => { if (!document.querySelector(".snackbar")) { clearInterval(t); r(); } }, 200); setTimeout(() => { clearInterval(t); r(); }, 9000); }));
  await click(page, '[data-section="debt-card"] button[aria-label="Delete Rauf"]'); await wait(700);
  let d = await get(page, DKEY), tx = (await state(page)).transactions;
  ok((!d || d.debts.length === 0) && tx.length === n0 && !tx.some((x) => x.debtLink), "deleted: the debt is gone and its entry left Transactions");
  ok(/Debt removed/.test(await snack(page)) && /Undo/.test(await snack(page)), "an Undo bar says 'Debt removed'", await snack(page));
  ok((await undo(page)) === "ok", "Undo can be tapped"); await wait(500);
  d = await get(page, DKEY); tx = (await state(page)).transactions;
  ok(same(d.debts, before.debts.debts), "after Undo the debt and its repayment are stored exactly as before", d.debts);
  ok(same(tx, before.tx), "after Undo the entry is back with the same id, amount and date");
  ok(/200\.00/.test(await page.evaluate(() => (document.querySelector(".debt-remaining") || {}).innerText || "")), "the card shows 200.00 remaining again");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R51-U2. A loan: delete a payment, Undo; delete the loan, Undo");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await openDebts(page); await page.evaluate(() => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[1].click()); await wait(250);
  await click(page, '[data-section="loan-add-btn"]');
  await setVal(page, "#loan-lender", "Test Bank"); await setVal(page, "#loan-amt", "5000"); await setVal(page, "#loan-rate", "18"); await setVal(page, "#loan-months", "12"); await setVal(page, "#loan-first", tomorrow());
  await click(page, '[data-section="loan-save"]'); await wait(300);
  const n0 = (await state(page)).transactions.length;
  await click(page, '[data-section="loan-card"] .loan-paid-btn'); await wait(400);
  const before = { debts: await get(page, DKEY), tx: (await state(page)).transactions };
  ok(before.debts.loans[0].payments.length === 1 && before.tx.length === n0 + 1, "start: one payment marked paid, with its entry of 458.40");
  await page.evaluate(() => document.querySelector(".loan-pay-del").click()); await wait(700);
  ok((await get(page, DKEY)).loans[0].payments.length === 0 && (await state(page)).transactions.length === n0, "payment deleted: the record and its entry are gone");
  ok(/Payment removed/.test(await snack(page)) && /Undo/.test(await snack(page)), "an Undo bar says 'Payment removed'", await snack(page));
  ok((await undo(page)) === "ok", "Undo can be tapped"); await wait(500);
  ok(same((await get(page, DKEY)).loans, before.debts.loans) && same((await state(page)).transactions, before.tx), "after Undo the payment record and the entry are exactly as before");
  await click(page, '[data-section="loan-card"] button[aria-label="Delete Test Bank"]'); await wait(700);
  const gone = await get(page, DKEY);
  ok((!gone || gone.loans.length === 0) && /Loan removed/.test(await snack(page)) && /Undo/.test(await snack(page)), "loan deleted, with an Undo bar", await snack(page));
  ok((await undo(page)) === "ok", "Undo can be tapped"); await wait(500);
  ok(same((await get(page, DKEY)).loans, before.debts.loans), "after Undo the loan and its payment are stored exactly as before");
  await page.reload(); await settle(page);
  ok(same((await get(page, DKEY)).loans, before.debts.loans) && sameValues((await state(page)).transactions, before.tx), "and still so after closing and opening the app");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R51-U3. An own category: remove, Undo");
{
  const cats = { version: 1, cats: [{ id: "u_aaa111", name: "Pets food", income: false, color: "#68D391" }, { id: "u_bbb222", name: "Garden", income: false, color: "#68D391" }, { id: "u_ccc333", name: "Hobby", income: false, color: "#68D391" }] };
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: eval(`(() => { try { if (!sessionStorage.getItem("__s")) { sessionStorage.setItem("__s", "1"); localStorage.setItem("${CKEY}", ${JSON.stringify(JSON.stringify(cats))}); } } catch {} })`) });
  await settle(page); await openCategories(page);
  const before = await get(page, CKEY);
  await page.evaluate(() => document.querySelectorAll('[data-section="my-categories"] [data-cat]')[1].querySelector("button").click()); await wait(400);
  let now = await get(page, CKEY);
  ok(now.cats.length === 2 && !now.cats.some((c) => c.id === "u_bbb222"), "Garden (not used by anything) is removed");
  ok(/Category removed/.test(await snack(page)) && /Undo/.test(await snack(page)), "an Undo bar says 'Category removed'", await snack(page));
  ok((await undo(page)) === "ok", "Undo can be tapped"); await wait(500);
  now = await get(page, CKEY);
  ok(same(now.cats, before.cats), "after Undo the three categories are stored as before, Garden in the middle again", now.cats.map((c) => c.name));
  ok(/Garden/.test(await page.evaluate(() => document.querySelector('[data-section="my-categories"]').innerText)), "and it is listed again");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R51-U4. An own subcategory in the add form: remove, Undo");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: eval(`(() => { try { if (!sessionStorage.getItem("__s")) { sessionStorage.setItem("__s", "1"); localStorage.setItem("${SKEY}", ${JSON.stringify(JSON.stringify({ food: ["Lunch box", "Kebab", "Tea"] }))}); } } catch {} })`) });
  await settle(page); await openAdd(page);
  // choose the category that has the three own subcategories
  const found = await page.evaluate(async () => { for (const b of document.querySelectorAll(".cat-tile")) { b.click(); await new Promise((r) => setTimeout(r, 120)); if (document.querySelectorAll(".sub-chip-x").length === 3) return true; } return false; });
  ok(found, "the add form shows the three own subcategories with a remove button each");
  const before = await get(page, SKEY);
  await page.evaluate(() => document.querySelectorAll(".sub-chip-x")[1].click()); await wait(400);
  let now = await get(page, SKEY);
  const list = (m) => (m && (m.byCategory || m).food) || [];
  ok(same(list(now), ["Lunch box", "Tea"]), "Kebab is removed from the list", list(now));
  ok(/“Kebab” removed from your list/.test(await snack(page)) && /Undo/.test(await snack(page)), "an Undo bar names what was removed", await snack(page));
  ok((await undo(page)) === "ok", "Undo can be tapped while the add form is open (the bar is not hidden under it)"); await wait(500);
  now = await get(page, SKEY);
  ok(same(list(now), list(before)) && same(list(now), ["Lunch box", "Kebab", "Tea"]), "after Undo: Lunch box, Kebab, Tea, in the same order", list(now));
  ok(await page.evaluate(() => document.querySelectorAll(".sub-chip-x").length === 3), "the add form shows all three again");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run51_undo", browser);
