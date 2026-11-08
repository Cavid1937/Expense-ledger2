// Run 43 (2026-11-08): money others will pay back. Add form, Home line, entry row, "Mark paid back", validation. Synthetic data only.
import { launch, openPage, openAdd, wait, ok, section, finish, baseSeed, settle, state } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const save = (page) => page.evaluate(() => document.querySelector(".add-foot .btn-primary").click());
const openMore = (page) => page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click());

section("R43-B1. Add an expense where someone pays back part of it");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page); await openMore(page); await wait(350);
  await page.type(".amount-input", "100"); await wait(150);
  await page.type("#txn-reimb-amt", "60"); await page.type("#txn-reimb-who", "Aysel"); await wait(250);
  const note = await page.evaluate(() => document.querySelector('[data-section="add-reimb-note"]').textContent);
  ok(/40\.00/.test(note) && /60\.00/.test(note), "the form says: your share 40.00, 60.00 expected back", note);
  await save(page); await wait(800);
  const tx = (await state(page)).transactions;
  ok(tx.length === 1 && tx[0].amount === 100 && tx[0].reimb && tx[0].reimb.amt === 60 && tx[0].reimb.who === "Aysel", "saved with the full 100 and reimb 60 from Aysel", tx);
  const home = await page.evaluate(() => (document.querySelector('[data-section="home-reimb"]') || {}).textContent || "");
  ok(/60\.00/.test(home) && /waiting/i.test(home), "Home says 60.00 is waiting to be paid back", home);
  const row = await page.evaluate(() => (document.querySelector('[data-section="home-latest"] .txn-sub') || {}).innerText || "");
  ok(/Aysel owes/.test(row) && /60\.00/.test(row), "the entry row says Aysel owes 60.00", row);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R43-B2. Mark paid back");
{
  const seed = baseSeed({ language: "en", transactions: [{ id: 501, type: "expense", category: "food", amount: 100, date: new Date().toISOString().slice(0, 10), merchant: "Dinner", note: "", subcategory: "", recurring: false, recurFreq: null, isActive: true, createdAt: new Date().toISOString(), reimb: { amt: 60, who: "Aysel" } }] });
  const page = await openPage(browser, { seed }); await phone(page); await settle(page);
  await page.evaluate(() => document.querySelector('[data-section="home-latest"] .txn-row').click()); await wait(500);
  const btn = await page.evaluate(() => (document.querySelector('[data-section="reimb-paid"]') || {}).textContent || "");
  ok(/60\.00/.test(btn), "the detail sheet offers 'Mark 60.00 as paid back'", btn);
  await page.evaluate(() => document.querySelector('[data-section="reimb-paid"]').click()); await wait(800);
  const tx = (await state(page)).transactions;
  const rep = tx.find((x) => x.type === "income");
  ok(tx.length === 2 && rep && rep.category === "refund" && rep.amount === 60 && rep.reimbFor === 501 && rep.merchant === "Aysel", "a Refunds income entry of 60 linked to the dinner was recorded", tx);
  ok(await page.evaluate(() => !document.querySelector('[data-section="home-reimb"]')), "Home no longer shows anything waiting");
  await page.evaluate(() => [...document.querySelectorAll('[data-section="home-latest"] .txn-row')].find((r) => /Dinner/.test(r.innerText)).click()); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="reimb-settled"]') && !document.querySelector('[data-section="reimb-paid"]')), "reopening the dinner says it is fully paid back and has no button");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R43-B3. Validation");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page); await openMore(page); await wait(350);
  await page.type(".amount-input", "50"); await page.type("#txn-reimb-amt", "80"); await wait(200);
  await save(page); await wait(600);
  ok((await state(page)).transactions.length === 0, "more coming back than the total: nothing is saved");
  ok(await page.evaluate(() => /cannot be more/i.test(document.body.innerText)), "and the form says why");
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "ru", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page); await openMore(page); await wait(350);
  ok(await page.evaluate(() => /Вернут другие/.test(document.querySelector('[data-section="add-reimb"]').innerText)), "Russian: the section is named in Russian");
  await page.close();
}
await browser.close();
finish("e2e_run43");
