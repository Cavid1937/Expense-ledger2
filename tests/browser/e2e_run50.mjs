// Run 50 in the real bundled app: the month-end rollover card on Home (add to a goal / not now / not after the 7th).
// The page clock is fixed through a small Date wrapper so the test does not depend on the day it runs.
import { launch, openPage, state, storageKeys, ok, section, finish, tx, baseSeed, wait } from "./lib.mjs";
const browser = await launch();
// Run 59 (owner-approved): the card is now off unless turned on (Budgets & Goals > Goals). These sections turn it on first; R50-B0 checks the default.
const clock = (y, m, d, on = true) => `() => { try { if (!sessionStorage.getItem("__r50")) { sessionStorage.setItem("__r50", "1"); localStorage.removeItem("expense_ledger_v5__rollover"); ${on ? 'localStorage.setItem("expense_ledger_v5__leftovergoal", "1");' : 'localStorage.removeItem("expense_ledger_v5__leftovergoal");'} } } catch (e) { /* none */ } const fixed = new Date(${y}, ${m}, ${d}, 12, 0, 0).getTime(); const RD = Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } } window.Date = FD; }`;
const seed = () => baseSeed({
  transactions: [tx({ type: "income", category: "salary", amount: 1200, date: "2026-10-02", merchant: "Employer" }), tx({ amount: 700, date: "2026-10-15", merchant: "Rent" }), tx({ amount: 5, date: "2026-11-01", merchant: "Shop" })],
  goals: [{ id: "g1", name: "Laptop", target: 4000, saved: 3200, monthlyTarget: 0, targetDate: null }, { id: "g2", name: "Done goal", target: 50, saved: 50, monthlyTarget: 0, targetDate: null }],
});
const card = (page) => page.evaluate(() => { const c = document.querySelector('[data-section="home-rollover"]'); return c ? c.innerText : null; });

section("R50-B0. Off by default: no month-start question (Run 59)");
let page = await openPage(browser, { seed: seed(), pre: eval(clock(2026, 10, 3, false)) });
await wait(600);
ok((await card(page)) === null, "on 3 Nov, with the setting left as it is, nothing is asked");
await page.close();

section("R50-B1. Offer appears on 3 Nov and adding it changes only the goal");
page = await openPage(browser, { seed: seed(), pre: eval(clock(2026, 10, 3)) });
await wait(600);
let txt = await card(page);
ok(txt && /Last month you kept/.test(txt) && /500/.test(txt), "card says last month's leftover (1200 - 700 = 500)", txt);
ok(txt && /Laptop/.test(txt) && !/Done goal/.test(txt), "only the unfinished goal is offered", txt);
const before = await state(page);
await page.evaluate(() => document.querySelector('[data-section="rollover-add"]').click()); await wait(500);
const after = await state(page);
ok(after.goals.find((g) => g.id === "g1").saved === 3700 && after.goals.find((g) => g.id === "g2").saved === 50, "Laptop 3200 -> 3700, the finished goal is unchanged", after.goals);
ok(after.transactions.length === before.transactions.length, "no entries were added or removed");
ok((await card(page)) === null, "card disappears after adding");
ok((await storageKeys(page)).includes("expense_ledger_v5__rollover") && (await page.evaluate(() => localStorage.getItem("expense_ledger_v5__rollover"))) === "2026-10", "October is remembered in its own key");
await page.reload(); await wait(700);
ok((await card(page)) === null, "still gone after a reload");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R50-B2. 'Not now' remembers the month and changes nothing");
page = await openPage(browser, { seed: seed(), pre: eval(clock(2026, 10, 3)) });
await wait(600);
await page.evaluate(() => document.querySelector('[data-section="rollover-skip"]').click()); await wait(400);
const st2 = await state(page);
ok((await card(page)) === null && st2.goals.find((g) => g.id === "g1").saved === 3200, "card gone, goal still 3200");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R50-B3. Not offered after the 7th");
page = await openPage(browser, { seed: seed(), pre: eval(clock(2026, 10, 12)) });
await wait(600);
ok((await card(page)) === null, "no card on 12 Nov");
await page.close();

await browser.close();
finish("e2e_run50");
