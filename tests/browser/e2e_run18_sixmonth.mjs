// Run 18g: the 6-month section shows spending AND income per month, with a legend, and the detail line gives spent, income and net.
import { launch, openPage, tab, wait, ok, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const day = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-01`; };
const list = [];
for (const o of [-2, -1]) { list.push(tx({ id: "i" + o, type: "income", category: "salary", amount: 1000, merchant: "Job", date: day(o) })); list.push(tx({ id: "e" + o, amount: 400, category: "food", merchant: "Shop", date: day(o) })); }
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: list }) }); await settle(page);
await tab(page, "Analytics"); await wait(500);
ok(await page.evaluate(() => document.querySelectorAll(".month-bars .m-col").length === 6 && document.querySelectorAll(".month-bars .m-bar-inc").length === 6), "six months, each with a spending bar and an income bar");
ok(/Spent/.test(await page.evaluate(() => document.querySelector('[data-section="an-sixmonth-legend"]')?.innerText || "")) && /Income/.test(await page.evaluate(() => document.querySelector('[data-section="an-sixmonth-legend"]')?.innerText || "")), "a legend names both");
await page.evaluate(() => document.querySelectorAll(".month-bars .m-col")[3].click()); await wait(300);
const det = await page.evaluate(() => document.querySelector('[data-section="an-sixmonth-detail"]')?.innerText || "");
ok(/Spent 400\.00/.test(det) && /Income 1,000\.00/.test(det) && /Net 600\.00/.test(det), "tapping a month: spent 400, income 1,000, net 600", det);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await browser.close();
finish("e2e_run18_sixmonth");
