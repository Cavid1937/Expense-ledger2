// Run 17 (2026-10-30), owner feedback: "I'm not sure how helpful the heatmap is ... replace with something better" (decision: a month calendar).
// Contract on Analytics: the 8-week heatmap is gone; a month calendar for the SELECTED month shows one cell per day (Monday first),
// shaded by how much was spent; days with spending say so for screen readers; tapping a day shows its date, total and categories, tapping
// again hides it; the month selector above changes the calendar; today is marked. Written BEFORE the change. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, tx, settle, TODAY } from "./lib.mjs";
const browser = await launch();
const [Y, M] = TODAY.split("-").map(Number);
const prevMonthDay = (d) => { const dt = new Date(Y, M - 2, d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; };
const seed = () => baseSeed({ language: "en", transactions: [tx({ category: "food", amount: 40, date: TODAY }), tx({ category: "transport", amount: 15, date: TODAY }), tx({ category: "shopping", amount: 25, date: prevMonthDay(3) }), tx({ type: "income", category: "salary", amount: 2000, date: TODAY })] });
const cal = (page) => page.evaluate(() => { const c = document.querySelector('[data-section="an-calendar"]'); if (!c) return null; const cells = [...c.querySelectorAll("button.cal-day")]; return { n: cells.length, heat: !!document.querySelector(".heatmap"), head: [...c.querySelectorAll(".cal-dow")].map((x) => x.innerText.trim()), first: cells[0] && cells[0].dataset.date, spend: cells.filter((x) => x.classList.contains("has-spend")).map((x) => x.dataset.date), today: [...c.querySelectorAll('[aria-current="date"]')].map((x) => x.dataset.date), minH: Math.min(...cells.map((x) => x.getBoundingClientRect().height)), minW: Math.min(...cells.map((x) => x.getBoundingClientRect().width)), title: (c.querySelector(".cal-title") || {}).innerText || "" }; });
const detail = (page) => page.evaluate(() => (document.querySelector('[data-section="an-calendar-detail"]') || {}).innerText || "");
const daysIn = (y, m) => new Date(y, m, 0).getDate();

section("R17-K1. The calendar replaces the heatmap");
{
  const page = await openPage(browser, { seed: seed() }); await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await settle(page);
  await tab(page, "Analytics"); await wait(500);
  const c = await cal(page);
  ok(!!c && !c.heat, "a calendar is shown and the heatmap is gone", c && c.heat);
  ok(c.n === daysIn(Y, M), "one cell per day of this month", [c.n, daysIn(Y, M)]);
  ok(c.head.length === 7 && c.head[0] !== c.head[6], "seven weekday headings", c.head);
  ok(c.spend.length === 1 && c.spend[0] === TODAY, "only the day with spending is shaded", c.spend);
  ok(c.today.length === 1 && c.today[0] === TODAY, "today is marked", c.today);
  ok(c.minH >= 36 && c.minW >= 36, "every day is at least 36px wide and tall to tap", [c.minW, c.minH]);
  const lbl = await page.evaluate((d) => document.querySelector(`button.cal-day[data-date="${d}"]`).getAttribute("aria-label"), TODAY);
  ok(/55\.00/.test(lbl), "a screen reader hears the date and the 55.00 spent", lbl);
  await page.close();
}
section("R17-K2. Tapping a day shows what was spent; tapping again hides it");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page); await tab(page, "Analytics"); await wait(400);
  await page.evaluate((d) => document.querySelector(`button.cal-day[data-date="${d}"]`).click(), TODAY); await wait(500);
  let d = await detail(page);
  ok(/55\.00/.test(d) && /Food/.test(d) && /Transport/.test(d), "55.00 with Food and Transport", d);
  await page.evaluate((d) => document.querySelector(`button.cal-day[data-date="${d}"]`).click(), TODAY); await wait(500);
  ok((await detail(page)) === "", "tapping the same day again hides the detail");
  const quiet = `${Y}-${String(M).padStart(2, "0")}-01`;
  await page.evaluate((d) => document.querySelector(`button.cal-day[data-date="${d}"]`).click(), quiet); await wait(250);
  ok(/no spending/i.test(await detail(page)) || TODAY === quiet, "a day with nothing spent says so", await detail(page));
  await page.close();
}
section("R17-K3. The month selector above drives the calendar");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page); await tab(page, "Analytics"); await wait(400);
  await page.evaluate(() => document.querySelector(".month-nav-btn").click()); await wait(400);
  const pm = new Date(Y, M - 2, 1);
  const c = await cal(page);
  ok(c.n === daysIn(pm.getFullYear(), pm.getMonth() + 1), "the previous month has its own number of days", [c.n]);
  ok(c.spend.length === 1 && c.spend[0] === prevMonthDay(3), "and shows its own spending day", c.spend);
  ok(c.first.startsWith(`${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, "0")}`), "starting on the 1st of that month", c.first);
  await page.close();
}
await browser.close();
finish("e2e_run17_calendar");
