// Run 105 (owner, 17 Nov: "the time picker in reminders should be improved, must be alive and better"): the reminder time is chosen on two
// snapping wheels inside the Android app (mocked shell). Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, openSettings, baseSeed } from "./lib.mjs";
const browser = await launch();
const SHELL = `window.__ticks=0;window.LedgerNative={installId:function(){return "ID-1";},haptic:function(k){if(k==="tick")window.__ticks++;},
  reminders:{requestPermission:function(){return Promise.resolve({granted:true});},sync:function(){return Promise.resolve();}},
  onShortcut:function(){return function(){};}}`;
const prefs = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__reminders") || "null"));
const openTime = async (page) => { await page.evaluate(() => document.querySelector('[data-pick-time="rem-time"]').click()); await wait(450); };
const wheel = (page, k) => page.evaluate((x) => { const w = document.querySelector(`[data-wheel="${x}"]`); return w ? { now: Number(w.getAttribute("aria-valuenow")), text: w.getAttribute("aria-valuetext"), label: w.getAttribute("aria-label"), role: w.getAttribute("role"), top: w.scrollTop } : null; }, k);
const nowText = (page) => page.evaluate(() => (document.querySelector('[data-section="time-now"]') || {}).textContent || "");
const sheetOpen = (page) => page.evaluate(() => !!document.querySelector('[data-section="pick-time-sheet"]'));

section("R105-T1. Wheels: open on the saved time, follow scroll and keys, save only on Save");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page); await openSettings(page);
  const t0 = await page.evaluate(() => window.__ticks);
  await openTime(page);
  const h = await wheel(page, "hour"), m = await wheel(page, "minute");
  ok(await sheetOpen(page) && h && m && h.role === "spinbutton" && m.role === "spinbutton" && h.label === "Hour" && m.label === "Minute", "the sheet shows two wheels that screen readers hear as Hour and Minute", { h, m });
  ok(h.now === 9 && m.now === 0 && (await nowText(page)) === "09:00" && Math.abs(h.top - 360) < 2, "they open on the saved 09:00, hour wheel scrolled to row 9", { h, m });
  ok((await page.evaluate(() => window.__ticks)) === t0, "opening gives no tick (nothing changed yet)");
  await page.evaluate(() => document.querySelector('[data-wheel="hour"]').focus());
  for (let i = 0; i < 9; i++) { await page.keyboard.press("ArrowDown"); await wait(15); }
  await wait(700);
  ok((await wheel(page, "hour")).now === 18 && (await nowText(page)).startsWith("18:"), "Arrow Down nine times moves the hour to 18 and the big time follows", await wheel(page, "hour"));
  ok((await page.evaluate(() => window.__ticks)) > t0, "each new row gives a short tick on the phone");
  await page.evaluate(() => { const w = document.querySelector('[data-wheel="minute"]'); w.scrollTop = 30 * 40; w.dispatchEvent(new Event("scroll")); }); await wait(300);
  ok((await wheel(page, "minute")).now === 30 && (await nowText(page)) === "18:30", "scrolling the minute wheel to row 30 shows 18:30", await nowText(page));
  ok((await prefs(page) || {}).time !== "18:30", "nothing is saved while the wheels turn");
  await page.evaluate(() => document.querySelector('[data-action="time-save"]').click()); await wait(450);
  ok(!(await sheetOpen(page)) && (await prefs(page)).time === "18:30", "Save stores 18:30 and the sheet goes", await prefs(page));
  ok(await page.evaluate(() => /18:30/.test(document.querySelector('[data-pick-time="rem-time"]').textContent)), "the field now reads 18:30");

  await openTime(page);
  ok((await wheel(page, "hour")).now === 18 && (await wheel(page, "minute")).now === 30, "opening again starts at 18:30");
  await page.evaluate(() => document.querySelector('[data-wheel="minute"]').focus());
  await page.keyboard.press("End"); await wait(700);
  ok((await wheel(page, "minute")).now === 59, "End jumps to minute 59");
  await page.keyboard.press("Escape"); await wait(450);
  ok(!(await sheetOpen(page)) && (await prefs(page)).time === "18:30", "Escape closes without saving: still 18:30", await prefs(page));

  await openTime(page);
  await page.evaluate(() => document.querySelector('[data-wheel="minute"] [data-v="45"]').click()); await wait(700);
  ok((await wheel(page, "minute")).now === 45 && (await nowText(page)) === "18:45", "tapping a row turns the wheel to it", await nowText(page));
  await page.evaluate(() => document.querySelector('.pick-close').click()); await wait(450);
  ok((await prefs(page)).time === "18:30", "closing with X keeps the saved time");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R105-T2. Azerbaijani and Russian labels, a time that is not on a 5-minute step");
{
  for (const [lang, H, M] of [["az", "Saat", "Dəqiqə"], ["ru", "Час", "Минута"]]) {
    const page = await openPage(browser, { seed: baseSeed({ language: lang }), pre: SHELL + `;localStorage.setItem("expense_ledger_v5__reminders",JSON.stringify({time:"07:43",dailyTime:"21:00"}))` });
    await settle(page); await openSettings(page); await openTime(page);
    const h = await wheel(page, "hour"), m = await wheel(page, "minute");
    ok(h && h.label === H && m.label === M && h.now === 7 && m.now === 43 && (await nowText(page)) === "07:43", `${lang}: wheels read ${H} / ${M} and open on 07:43`, { h, m });
    ok(page.errors.length === 0, `${lang}: no JavaScript errors`, page.errors[0]);
    await page.close();
  }
}
section("R105-A. Screen audit fixes: last month's spending sits with Spent; a one-entry day shows no repeated total");
{
  const { tx, daysAgo, tab } = await import("./lib.mjs");
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [
    tx({ amount: 30, date: daysAgo(0) }), tx({ amount: 12, date: daysAgo(0) }), tx({ amount: 7, date: daysAgo(1) }), tx({ type: "income", category: "salary", amount: 900, date: daysAgo(1) }),
    tx({ amount: 61, date: (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); })() }) ] }) });
  await settle(page); await tab(page, "Ledger"); await settle(page);
  const heads = await page.evaluate(() => [...document.querySelectorAll(".txn-group")].slice(0, 2).map((g) => (g.querySelector(".txn-date-total") || {}).textContent || ""));
  ok(/42[.,]00/.test(heads[0]) && heads[1] === "", "today (30 + 12) shows its total 42.00; yesterday (one 7.00 entry, plus income) shows none", heads);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500); await settle(page);
  const a = await page.evaluate(() => ({ net: (document.querySelector('[data-section="an-month-net"]') || {}).textContent || "", sum: (document.querySelector('[data-section="an-summary"]') || {}).textContent || "" }));
  ok(!/last month: /.test(a.net) && /spent the same days last month: 61[.,]00/.test(a.sum), "'spent the same days last month: 61.00' is under Spent, not under Monthly surplus", a);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R105-E. Opening the encrypted backup form brings both passphrase boxes above the tab bar");
{
  const { openData } = await import("./lib.mjs");
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await openData(page);
  await page.evaluate(() => document.querySelector('[data-section="enc-toggle"]').click()); await wait(1200);
  const hits = await page.evaluate(() => [...document.querySelectorAll('[data-section="enc-backup"] input')].map((i) => { const r = i.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e === i; }));
  ok(hits.length === 2 && hits.every(Boolean), "a tap on either passphrase box reaches the box, not the tab bar", hits);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run105_time");
