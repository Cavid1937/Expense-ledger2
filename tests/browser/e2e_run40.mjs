// Run 40 (2026-11-08), owner list: opening animation, back button, clearer spending chart, daily reminder time, broken-file import message,
// no "categories moved" row. Synthetic data only.
import { launch, openPage, openCategories, openGoals, tab, wait, ok, section, finish, baseSeed, tx, settle, TODAY, openSettings, fs, path } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const back = (page) => page.evaluate(() => window.__ledgerNativeBack());
const curTab = (page) => page.evaluate(() => [...document.querySelectorAll(".tab-btn")].findIndex((b) => b.getAttribute("aria-current") === "page"));

section("R40-1. Opening: the mark shows, hands over, then is gone; it never blocks the app");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: "window.__forceLaunch = true" });
  const t0 = await page.evaluate(() => { const l = document.getElementById("launch"); return l ? { on: true, mark: !!l.querySelector(".launch-mark"), name: (l.querySelector(".launch-name") || {}).textContent, z: getComputedStyle(l).zIndex, hidden: l.getAttribute("aria-hidden") } : { on: false }; });
  ok(t0.on && t0.mark && t0.name === "Expense Ledger" && t0.hidden === "true", "at start: the app mark and name are on screen (hidden from screen readers)", t0);
  await wait(1600);
  ok(await page.evaluate(() => !document.getElementById("launch") && !document.documentElement.classList.contains("launch-rise")), "about 1.5 s later it has handed over and removed itself");
  ok(await page.evaluate(() => { const b = document.querySelector(".tab-btn"); const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && b.contains(hit); }), "the app underneath can be touched");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: "window.__forceLaunch = true" });
  await page.evaluate(() => { const l = document.getElementById("launch"); if (l) l.click(); }); await wait(800);
  ok(await page.evaluate(() => !document.getElementById("launch")), "a tap skips it at once");
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) });
  ok(await page.evaluate(() => !document.getElementById("launch")), "automated test browsers skip it (so other tests are not slowed down)");
  await page.close();
}
{
  // index.html carries a static copy so the mark is drawn before any script; it must match launch.js exactly.
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const L = await import(new URL("../../screens/launch.js", import.meta.url).href);
  ok(html.includes(`<style id="launch-css">${L.LAUNCH_CSS}</style>`) && html.includes(L.LAUNCH_HTML), "index.html's copy is identical to screens/launch.js");
}

section("R40-2. Back cancels what you are doing on the page before leaving it");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await phone(page); await settle(page);
  await openGoals(page, "goals");
  await page.evaluate(() => document.querySelector('[data-section="goal-edit"]').click()); await wait(450);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="goal-form"]')), "a goal's edit form is open");
  ok((await back(page)) === "handled", "Back is used");
  await wait(450);
  ok(await page.evaluate(() => !document.querySelector('[data-section="goal-form"]')) && (await curTab(page)) === 3, "it closed the edit form and stayed on Budgets & Goals");
  ok((await back(page)) === "handled" && (await wait(300), await curTab(page)) === 0, "the next Back leaves the page for Home, as before");
  await openCategories(page);
  ok(await page.evaluate(() => !document.querySelector('[data-section="tpl-form"]')), "(no template form open yet)");
  await page.evaluate(() => document.querySelector('[data-section="gl-templates"] .btn-sm').click()); await wait(450);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="tpl-form"]')), "a new quick-add template form is open");
  await back(page); await wait(450);
  ok(await page.evaluate(() => !document.querySelector('[data-section="tpl-form"]')) && (await curTab(page)) === 3, "Back closes it and the page stays");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")).goals[0]);
  ok(before.name === "Master's" && before.target === 40000, "nothing was saved by Back", before);
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await phone(page); await settle(page);
  await tab(page, "Ledger"); await wait(300);
  await page.evaluate(() => document.querySelector('[data-section="tx-select-toggle"]').click()); await wait(300);
  ok(await page.evaluate(() => document.querySelector('[data-section="tx-select-toggle"]').getAttribute("aria-pressed")) === "true", "Transactions: select mode is on");
  await back(page); await wait(350);
  ok(await page.evaluate(() => document.querySelector('[data-section="tx-select-toggle"]').getAttribute("aria-pressed")) === "false" && (await curTab(page)) === 1, "Back leaves select mode and stays on Transactions");
  await page.keyboard.press("Escape"); await wait(300);
  ok((await curTab(page)) === 1, "Escape with nothing open does not change the page");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R40-3. Spending chart: smooth line, a scale, and one plain sentence comparing with last month");
{
  const mon = TODAY.slice(0, 7);
  const [y, m] = mon.split("-").map(Number), pm = new Date(y, m - 2, 1), prv = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, "0")}`;
  const seed = baseSeed({ language: "en", transactions: [tx({ amount: 30, date: `${mon}-01` }), tx({ amount: 100, date: `${prv}-01` })] });
  const page = await openPage(browser, { seed }); await phone(page); await settle(page); await tab(page, "Monthly"); await wait(400);
  const info = await page.evaluate(() => { const c = [...document.querySelectorAll(".trend-card")].find((x) => x.getBoundingClientRect().width > 0) || document.querySelector(".trend-card"); if (!c) return null;
    const line = c.querySelector(".trend-line"); return { cmp: (c.querySelector('[data-section="trend-cmp"]') || {}).textContent || "", curved: !!line && /C/.test(line.getAttribute("d")), axis: [...c.querySelectorAll(".trend-axis")].map((t) => t.textContent), poly: c.querySelectorAll("polyline").length }; });
  ok(!!info, "the chart card is there");
  ok(info && info.curved && info.poly === 0, "the lines are smooth curves (no zig-zag polylines)", info);
  ok(info && info.axis.length === 2 && info.axis.every((s) => /\d/.test(s)), "two scale labels on the side", info && info.axis);
  ok(info && /70\.00\D{0,3}less than by the same day last month/.test(info.cmp), "30 so far vs 100 by the same day last month: '70.00 less than by the same day last month'", info && info.cmp);
  await page.close();
}

section("R40-4. Daily check-in: its own time, shown when it is on");
{
  const SHELL = `window.LedgerNative={reminders:{requestPermission:async()=>({granted:true}),sync:function(p){(window.__calls=window.__calls||[]).push(JSON.parse(JSON.stringify(p)));return Promise.resolve();}}}`;
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page); await openSettings(page);
  ok(await page.evaluate(() => !document.querySelector('[data-section="rem-dtime"]')), "daily check-in off: no daily time field");
  ok(/At 21:00/.test(await page.evaluate(() => document.querySelector('[data-fold="reminders"]').innerText)), "its description says 21:00 (the default)");
  await page.evaluate(() => document.querySelector('[data-section="rem-daily"]').click()); await wait(450);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="rem-dtime"]')), "switched on: the daily time field slides in");
  await page.evaluate(() => { const i = document.querySelector('[data-section="rem-dtime"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "23:40"); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); }); await wait(300);
  const pr = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__reminders")));
  ok(pr.daily === true && pr.dailyTime === "23:40" && pr.time === "09:00", "saved: daily at 23:40; the bill time is unchanged", pr);
  const last = await page.evaluate(() => window.__calls[window.__calls.length - 1]);
  ok(last.items.length > 0 && last.items.every((i) => { const t = new Date(i.atMs); return t.getHours() === 23 && t.getMinutes() === 40; }), "Android is asked to remind at 23:40 every day", last.items.slice(0, 2).map((i) => new Date(i.atMs).toString()));
  ok(/At 23:40/.test(await page.evaluate(() => document.querySelector('[data-fold="reminders"]').innerText)), "the description follows the chosen time");
  await page.evaluate(() => localStorage.removeItem("expense_ledger_v5__reminders"));
  await page.close();
}

section("R40-5. A broken or wrong file is named for what it is");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(250);
  await page.evaluate(() => document.querySelector('.more-page [data-more="io"]').click()); await page.waitForSelector(".io-page"); await settle(page);
  const input = await page.$('input[type="file"]');
  const dir = fs.mkdtempSync(path.join(process.env.E2E_IMP_DIR || (await import("os")).tmpdir(), "r40-"));
  const f = path.join(dir, "ledger-backup-2026-11-08.json"); fs.writeFileSync(f, JSON.stringify({ version: 10, transactions: [tx({ id: 5 })] }).slice(0, 60));
  await input.uploadFile(f); await wait(500);
  const txt = await page.evaluate(() => document.body.innerText);
  ok(/incomplete or damaged/.test(txt) && /Your data here is unchanged/.test(txt), "a cut-off backup: 'incomplete or damaged … your data here is unchanged'");
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")).transactions.length)) === 3, "nothing was imported (still 3 entries)");
  fs.rmSync(dir, { recursive: true, force: true });
  await page.close();
}
await finish("e2e_run40", browser);
