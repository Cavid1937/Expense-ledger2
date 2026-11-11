// Run 51 (owner: a merge counted most things twice): Import / Export -> "Entries counted twice?". The person sees groups of entries with the
// same day and amount, ticks the copies, deletes them, and can undo. Nothing is ticked or deleted by the app on its own. Synthetic data only.
import { launch, openPage, openData, state, wait, ok, section, finish, baseSeed, tx, settle, daysAgo } from "./lib.mjs";
const browser = await launch();
const box = (page) => page.evaluate(() => (document.querySelector('[data-section="io-doubles"]') || {}).innerText || "");
const snack = (page) => page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "");
const spent = (l) => l.filter((x) => x.type === "expense").reduce((s, x) => s + Math.round(x.amount * 100), 0);

section("R51-X1. Nothing doubled: the card says so and offers nothing");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openData(page);
  const t = await box(page);
  ok(/No two entries have the same day and amount/.test(t) && !(await page.$('[data-dbl="open"]')), "three different entries: 'nothing to check', no button", t);
  await page.close();
}

section("R51-X2. Doubled entries: look, tick, delete, undo");
{
  const d1 = daysAgo(1), d2 = daysAgo(2);
  // Real spending: 12.50 + 30.00 + 8.00 + 0.60 = 51.10. The first three were merged in twice with other words (as after the owner's merge).
  const list = [tx({ id: 1, merchant: "Bravo", amount: 12.5, date: d1 }), tx({ id: 2, merchant: "Bravo", subcategory: "Groceries", amount: 12.5, date: d1 }),
    tx({ id: 3, note: "Taxi home", amount: 30, date: d2 }), tx({ id: 4, note: "Taxi", amount: 30, date: d2, category: "transport" }),
    tx({ id: 5, merchant: "Cafe", amount: 8, date: d2 }), tx({ id: 6, merchant: "Cafe", amount: 8, date: d2 }), tx({ id: 7, note: "Metro", amount: 0.6, date: d1 })];
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: list }) }); await settle(page); await openData(page);
  let t = await box(page);
  ok(/3 groups of entries have the same day and amount/.test(t) && !!(await page.$('[data-dbl="open"]')) && !(await page.$("[data-dbl-group]")), "the card says 3 groups and stays closed until asked", t);
  await page.evaluate(() => document.querySelector('[data-dbl="open"]').click()); await wait(300);
  const view = await page.evaluate(() => ({ groups: document.querySelectorAll("[data-dbl-group]").length, boxes: document.querySelectorAll("[data-dbl-pick]").length, ticked: document.querySelectorAll("[data-dbl-pick]:checked").length, del: document.querySelector('[data-dbl="delete"]').disabled }));
  ok(view.groups === 3 && view.boxes === 6 && view.ticked === 0 && view.del === true, "3 groups, 6 entries, nothing ticked, Delete is off", view);
  t = await box(page);
  ok(/Bravo, Groceries/.test(t) && /Taxi home/.test(t) && !/Metro/.test(t), "each entry is shown with its own words; the single Metro entry is not listed");
  await page.evaluate(() => document.querySelector('[data-dbl="tick-extra"]').click()); await wait(200);
  const ticked = await page.evaluate(() => [...document.querySelectorAll("[data-dbl-pick]:checked")].map((e) => e.getAttribute("data-dbl-pick")).sort());
  ok(JSON.stringify(ticked) === JSON.stringify(["1", "4", "6"]), "'keep one in each group' ticks one copy per group: the one with fewer details (1), and the later one where they are equal (4, 6)", ticked);
  ok(/Delete ticked \(3\)/.test(await box(page)), "the button says Delete ticked (3)");
  // The person changes their mind about the taxi: unticks 4.
  await page.evaluate(() => document.querySelector('[data-dbl-pick="4"]').click()); await wait(150);
  ok(/Delete ticked \(2\)/.test(await box(page)), "unticking one: Delete ticked (2)");
  const before = (await state(page)).transactions;
  await page.evaluate(() => document.querySelector('[data-dbl="delete"]').click()); await wait(500);
  let st = await state(page);
  ok(st.transactions.length === 5 && !st.transactions.some((x) => x.id === 1 || x.id === 6) && spent(st.transactions) === 12.5 * 100 + 30 * 100 * 2 + 800 + 60, "the 2 ticked copies are deleted; spending is 12.50 + 30 + 30 + 8 + 0.60 = 81.10", [st.transactions.length, spent(st.transactions)]);
  ok(/1 group of entries has the same day and amount/.test(await box(page)), "the card now says 1 group (the taxi pair the person kept)", await box(page));
  ok(/2 transactions deleted/.test(await snack(page)) && /Undo/.test(await snack(page)), "the usual Undo bar is shown", await snack(page));
  await page.evaluate(() => document.querySelector(".snackbar-undo").click()); await wait(500);
  st = await state(page);
  ok(st.transactions.length === 7 && spent(st.transactions) === spent(before) && [1, 6].every((id) => st.transactions.some((x) => x.id === id)), "Undo brings both entries back");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R51-X3. Azerbaijani and Russian");
for (const [l, re] of [["az", /İki dəfə sayılan qeydlər\?/], ["ru", /Записи, учтённые дважды\?/]]) {
  const p = await openPage(browser, { seed: baseSeed({ language: l, transactions: [tx({ id: 1, amount: 5 }), tx({ id: 2, amount: 5, note: "x" })] }), chooseLang: l }); await settle(p); await openData(p);
  ok(re.test(await p.evaluate(() => document.querySelector(".io-page").innerText)) && !!(await p.$('[data-dbl="open"]')), `${l}: the section title is shown and one group is offered`);
  await p.close();
}
await finish("e2e_run51_doubles", browser);
