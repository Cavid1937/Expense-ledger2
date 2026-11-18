// Run 108 (release readiness): a phone keeps the app open in the background for days. When it comes back to the screen on a new day, the
// figures must be today's, not yesterday's (Home's pay-cycle card and run-out day were kept from the day they were first worked out).
// Checked without depending on any wording: after the clock moves on a day, the screen must read exactly like the app freshly opened on
// that day. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, tab, tx, baseSeed, ymd } from "./lib.mjs";
const browser = await launch();
const DAY = 86400000;
// a clock the test can move forward, and a fixed "random" so the greeting is the same in both pages
const clock = (shift) => `(() => { const R = Date, off = { v: ${shift} }; window.__clockOff = off;
  class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off.v); } static now() { return R.now() + off.v; } }
  window.Date = D; Math.random = () => 0.25; })()`;
const base = new Date(); base.setHours(12, 0, 0, 0);
const at = (k) => ymd(new Date(base.getTime() - k * DAY));
const seed = baseSeed({ language: "en", safeToSpend: { enabled: true, savingsTarget: 50 }, budgets: { food: 300 },
  transactions: [tx({ id: 1, type: "income", category: "salary", amount: 1500, merchant: "Employer", date: at(10) }), tx({ id: 2, amount: 42.5, merchant: "Bazar", category: "food", date: at(1) }),
    tx({ id: 3, amount: 18, merchant: "Bolt", category: "transport", date: at(3) }), tx({ id: 4, amount: 300, category: "housing", merchant: "Rent", date: at(20), recurring: true, recurFreq: "monthly" })] });
const text = (page) => page.evaluate(() => (document.querySelector("main.page") || document.body).innerText);
const noon = base.getTime() - Date.now();

section("R108-D. Back on screen the next day: Home shows the new day's figures");
const page = await openPage(browser, { seed, pre: new Function(clock(noon)) }); await settle(page);
const day1 = await text(page);
// next day, 09:00; the app was in the background and comes back
await page.evaluate((ms) => { window.__clockOff.v += ms; document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); }, DAY - 3 * 3600000);
await wait(700); await settle(page);
const back = await text(page);
const fresh = await openPage(browser, { seed, pre: new Function(clock(noon + DAY - 3 * 3600000)) }); await settle(fresh);
const day2 = await text(fresh);
ok(day1 !== day2, "the test is meaningful: the app opened on the next day reads differently from the first day", { day1: day1.slice(0, 200), day2: day2.slice(0, 200) });
ok(back === day2, "after coming back on the new day, Home reads exactly like the app freshly opened that day",
  back === day2 ? "" : back.split("\n").map((l, i) => l === day2.split("\n")[i] ? null : `was: ${l} | fresh: ${day2.split("\n")[i]}`).filter(Boolean).slice(0, 5));
section("R108-D2. The same day: nothing is redrawn");
const marker = await page.evaluate(() => { const m = document.querySelector("main.page"); m.dataset.mark = "kept"; return true; });
await page.evaluate(() => { window.__clockOff.v += 3600000; document.dispatchEvent(new Event("visibilitychange")); }); await wait(500);
ok(marker && await page.evaluate(() => document.querySelector("main.page")?.dataset.mark === "kept"), "coming back an hour later on the same day leaves the screen as it was (no needless redraw)");
section("R108-D3. A new day while the person is typing: the text is kept, the page catches up afterwards");
// the second page opened above is in front; a page behind it gets no animation frames
await page.bringToFront(); await tab(page, "Ledger"); await settle(page);
await page.click(".search-input"); await page.keyboard.type("Baz");
await page.evaluate((ms) => { document.querySelector("main.page").dataset.mark = "kept"; window.__clockOff.v += ms; document.dispatchEvent(new Event("visibilitychange")); }, DAY); await wait(500);
const typing = await page.evaluate(() => ({ v: document.querySelector(".search-input")?.value, f: document.activeElement?.className, m: document.querySelector("main.page")?.dataset.mark }));
ok(typing.v === "Baz" && /search-input/.test(typing.f || "") && typing.m === "kept", "while the search box is in use, the new day does not redraw the page or clear the typed text", typing);
await page.evaluate(() => { document.activeElement.blur(); window.dispatchEvent(new Event("focus")); }); await wait(500);
ok(await page.evaluate(() => document.querySelector("main.page")?.dataset.mark !== "kept"), "once the box is left, the next check redraws the page for the new day");
ok(page.errors.length === 0 && fresh.errors.length === 0, "no JavaScript errors", page.errors[0] || fresh.errors[0]);
await browser.close();
finish("e2e_run108_newday");
