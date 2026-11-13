// Run 75 in the real bundled app: last month's summary on Home (first week of a month), its sheet, sharing (stand-in share menu), and
// the reminder switch. The page's clock is set to 3 Nov 2026. Synthetic data only.
import { launch, openPage, openSettings, ok, section, finish, baseSeed, tx, wait } from "./lib.mjs";
const browser = await launch();
const CLOCK = `{ const R = Date, T = new R(2026, 10, 3, 10, 0, 0).getTime(); class D extends R { constructor(...a) { if (a.length === 0) super(T); else super(...a); } static now() { return T; } } window.Date = D;
  window.__shared = []; navigator.share = (o) => { window.__shared.push(o); return Promise.resolve(); }; }`;
const seed = () => baseSeed({ language: "en", budgets: { food: 150 }, goals: [], transactions: [
  tx({ type: "income", category: "salary", merchant: "Employer", amount: 1000, date: "2026-10-01" }),
  tx({ merchant: "Bravo", category: "food", amount: 170, date: "2026-10-06" }), tx({ merchant: "Metro", category: "transport", amount: 30, date: "2026-10-21" }),
] });

section("R75-RB1. The card in the first week, the sheet, sharing");
{
  const page = await openPage(browser, { seed: seed(), fresh: true, pre: CLOCK }); await wait(600);
  const card = await page.evaluate(() => (document.querySelector('[data-section="home-report"]') || {}).innerText || "");
  ok(/Your October 2026 summary is ready/.test(card), "on 3 November, Home offers October's summary", card);
  await page.evaluate(() => document.querySelector('[data-section="home-report-open"]').click()); await page.waitForSelector('[data-section="report-sheet"]'); await wait(300);
  const sh = await page.evaluate(() => ({ earned: document.querySelector('[data-section="report-earned"]').innerText, spent: document.querySelector('[data-section="report-spent"]').innerText, net: document.querySelector('[data-section="report-net"]').innerText, all: document.querySelector('[data-section="report-sheet"]').innerText }));
  ok(/1,000\.00/.test(sh.earned) && /200\.00/.test(sh.spent) && /surplus/i.test(sh.net) && /800\.00/.test(sh.net), "earned 1,000, spent 200, surplus 800", sh);
  ok(/Budgets that were exceeded/.test(sh.all) && /Nothing is sent anywhere unless you share it/.test(sh.all), "it shows the exceeded Food budget and says nothing leaves the phone unless shared");
  await page.evaluate(() => document.querySelector('[data-section="report-share"]').click()); await wait(400);
  const shared = await page.evaluate(() => window.__shared);
  ok(shared.length === 1 && /Expense Ledger: October 2026/.test(shared[0].title) && /Spent: 200\.00/.test(shared[0].text), "Share hands the summary text to the phone's share menu", shared[0]);
  await page.evaluate(() => document.querySelector('[data-section="report-sheet"] [data-closer]').click()); await wait(400);
  ok(!(await page.$('[data-section="home-report"]')), "once opened, the card does not come back this month");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R75-RB2. The reminder switch");
{
  const page = await openPage(browser, { seed: seed(), fresh: true, pre: CLOCK + `;window.LedgerNative={reminders:{requestPermission:async()=>({granted:true}),permissionState:async()=>"granted",sync:function(p){(window.__calls=window.__calls||[]).push(JSON.parse(JSON.stringify(p)));return Promise.resolve();}}}` });
  await openSettings(page); await wait(400);
  ok(await page.evaluate(() => document.querySelector('[data-section="rem-report"]').getAttribute("aria-checked")) === "false", "'Monthly summary' is in Reminders, off by default");
  await page.evaluate(() => document.querySelector('[data-section="rem-report"]').click()); await wait(700);
  const items = await page.evaluate(() => { const c = window.__calls || []; return c.length ? c[c.length - 1].items : []; });
  ok(items.some((i) => i.kind === "report" && i.date === "2026-12-01" && /summary is ready/.test(i.title) && !/\d/.test(i.body)), "turning it on schedules '…summary is ready' for 1 December, with no amounts", items.filter((i) => i.kind === "report"));
  await page.close();
}
await browser.close();
finish("e2e_run75_report");
