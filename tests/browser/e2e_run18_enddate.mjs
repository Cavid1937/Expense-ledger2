// Run 18e (2026-10-31): a bill can have a last payment date; the Recurring list counts the payments left; a wrong end date is refused.
import { launch, openPage, state, tab, wait, ok, section, finish, baseSeed, tx } from "./lib.mjs";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const todayS = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const left = [0, 1, 2, 3].filter((m) => `${ym(m)}-28` >= todayS).length;   // the 28th of this month .. +3, not already past
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: `${ym(0)}-01` })], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } }) });
const fill = (vals) => page.evaluate((v) => { const set = (el, x) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, x); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  for (const [sel, x] of Object.entries(v)) set(document.querySelector(sel), x); }, vals);
const openNew = async () => { await tab(page, "Recurring"); await page.evaluate(() => document.querySelector(".fab-add").click()); await page.waitForSelector(".bill-sheet"); await wait(300); };

section("R18-EB1. A wrong end date is refused");
await openNew();
await fill({ "#bill-name": "Phone credit", "#bill-amount": "50", "#bill-date": `${ym(-1)}-28`, "#bill-end": `${ym(-2)}-28` });
await page.evaluate(() => document.querySelector(".bill-save").click()); await wait(400);
ok((await state(page)).bills?.length === 0 || !(await state(page)).bills, "nothing saved");
ok(!!(await page.$(".bill-sheet")) && /before the first due date/.test(await page.evaluate(() => document.body.innerText)), "the sheet stays open and explains why");

section("R18-EB2. A valid end date is saved and counted down");
await fill({ "#bill-end": `${ym(3)}-28` });
await page.evaluate(() => document.querySelector(".bill-save").click()); await wait(500);
const st = await state(page);
ok(st.bills.length === 1 && st.bills[0].endDate === `${ym(3)}-28`, "the bill keeps its end date", st.bills);
const txt = await page.evaluate(() => document.querySelector(".bill-row")?.innerText || "");
ok(new RegExp(`${left} payments? left`).test(txt), `the list says ${left} payment(s) left`, txt);
await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
ok((await state(page)).bills[0].endDate === `${ym(3)}-28`, "the end date survives a reload");

section("R18-EB3. Clearing the end date");
await tab(page, "Recurring"); await page.evaluate(() => document.querySelector(".bill-row").click()); await page.waitForSelector(".bill-sheet"); await wait(300);
await fill({ "#bill-end": "" }); await page.evaluate(() => document.querySelector(".bill-save").click()); await wait(500);
const st2 = await state(page);
ok(st2.bills[0].endDate === undefined && !/payments? left/.test(await page.evaluate(() => document.querySelector(".bill-row")?.innerText || "")), "no end date: no countdown, bill unchanged otherwise", st2.bills[0]);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await browser.close();
finish("e2e_run18_enddate");
