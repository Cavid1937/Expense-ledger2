// Run 17 (2026-10-30): the "Get set up" checklist on Home. Four steps, each ticks itself from what the person has done (a transaction,
// an income, a budget or goal, a backup); it can be hidden for good and disappears when all four are done. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const back = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dstr(d); };
const card = (page) => page.evaluate(() => { const c = document.querySelector('[data-section="home-setup"]'); return c ? { text: c.innerText, done: [...c.querySelectorAll("[data-step]")].map((e) => e.getAttribute("data-done") === "true") } : null; });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

section("R17-SU1. A new ledger: the list shows with nothing ticked");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [], budgets: {}, goals: [], lastBackup: null, backupConfirmedAt: null }) }); await settle(page); await wait(300);
  const c = await card(page);
  ok(!!c && /Get set up/.test(c.text) && c.done.length === 4 && c.done.every((d) => !d), "four steps, none done", c);
  await page.close();
}
section("R17-SU2. Steps tick from what the person has done");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 10, date: back(1) }), tx({ type: "income", category: "salary", amount: 400, date: back(2) })], budgets: {}, goals: [], lastBackup: null, backupConfirmedAt: null }) }); await settle(page); await wait(300);
  const c = await card(page);
  ok(!!c && same(c.done, [true, true, false, false]), "a transaction and an income are ticked; budget/goal and backup are not", c);
  await page.close();
}
section("R17-SU3. A step opens the right place");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 10, date: back(1) })], budgets: {}, goals: [], lastBackup: null, backupConfirmedAt: null }) }); await settle(page); await wait(300);
  await page.evaluate(() => document.querySelectorAll('[data-section="home-setup"] [data-step]')[2].click()); await wait(500);
  ok(await page.evaluate(() => document.querySelectorAll(".tab-btn")[3].classList.contains("active")), "'Set a budget or a goal' opens the Goals tab");
  await page.close();
}
section("R17-SU4. Hide it for good");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [], budgets: {}, goals: [], lastBackup: null, backupConfirmedAt: null }) }); await settle(page); await wait(300);
  await page.evaluate(() => document.querySelector('[data-section="home-setup"] .setup-hide').click()); await wait(400);
  ok((await card(page)) === null, "gone after Hide");
  await page.reload(); await settle(page); await wait(400);
  ok((await card(page)) === null, "still gone after reloading (remembered)");
  await page.close();
}
section("R17-SU5. All done: it disappears by itself");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 10, date: back(1) }), tx({ type: "income", category: "salary", amount: 400, date: back(2) })], budgets: { food: 100 }, goals: [], lastBackup: new Date().toISOString() }) }); await settle(page); await wait(300);
  ok((await card(page)) === null, "all four done: no card");
  await page.close();
}
section("R17-SU6. Russian and Azerbaijani");
for (const [l, re] of [["ru", /Начало работы/], ["az", /Başlanğıc/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l, transactions: [], budgets: {}, goals: [], lastBackup: null, backupConfirmedAt: null }), chooseLang: l }); await settle(page); await wait(300);
  const c = await card(page);
  ok(!!c && re.test(c.text), `${l}: the list is in ${l}`, c);
  await page.close();
}
await browser.close();
finish("e2e_run17_setup");
