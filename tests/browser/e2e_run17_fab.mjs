// Run 17 (2026-10-30), owner feedback: the "+" at the top-right is hard to reach on a Poco F6; "bottom + is a good idea".
// Contract: one floating "+" at the bottom-right, just above the tab bar and clear of it, big enough to tap (>= 48px), in the
// lower third of the screen; none in the top bar; shown only where something is created (Home, Ledger, Goals, Recurring);
// hidden while a form is open; it creates the same thing the top "+" used to. Synthetic data only.
import { launch, openPage, tab, openAdd, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const fab = (page) => page.evaluate(() => { const b = document.querySelector(".fab-add"); if (!b) return null; const r = b.getBoundingClientRect(); const tb = document.querySelector(".tabbar").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, tabTop: tb.top, vw: innerWidth, vh: innerHeight, label: b.getAttribute("aria-label") }; });

section("R17-F1. Where the + sits");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) });
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await settle(page);
  const f = await fab(page);
  ok(!!f, "Home has a floating +");
  ok(f.w >= 48 && f.h >= 48, "it is at least 48px wide and tall", [f.w, f.h]);
  ok(f.r >= f.vw - 24 && f.r <= f.vw, "it is at the right edge (within 24px)", f.r);
  ok(f.t > f.vh * 0.6, "it is in the lower part of the screen, where a thumb reaches", [f.t, f.vh]);
  ok(f.b <= f.tabTop - 4, "it sits above the tab bar and does not cover a tab", [f.b, f.tabTop]);
  ok((await page.$$(".topbar .topbar-add, .topbar .fab-add")).length === 0, "the top bar no longer has a + button");
  await page.close();
}
section("R17-F2. Which screens have it");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const has = async (name) => { await tab(page, name); await wait(350); return !!(await fab(page)); };
  ok(await has("Ledger"), "Ledger has the +");
  ok(await has("Goals"), "Goals has the +");
  ok(!(await has("Analytics")), "Analytics has none (nothing is created there)");
  ok(!(await has("More")), "More has none");
  await page.close();
}
section("R17-F3. It creates, and it steps aside while a form is open");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  ok(((await fab(page)).label || "").length > 0, "it has a spoken name for screen readers", (await fab(page)).label);
  await openAdd(page);
  ok(!!(await page.$(".amount-input")), "tapping it on Home opens the add form");
  ok(!(await page.$(".fab-add")), "the + is hidden while the form is open");
  await page.close();
}
section("R17-F4. Goals: the + starts a goal or budget form");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await tab(page, "Goals"); await wait(350);
  await page.evaluate(() => document.querySelector(".fab-add").click()); await wait(400);
  ok(/goal|budget/i.test(await page.evaluate(() => document.body.innerText)), "tapping it on Goals starts a goal or budget form");
  await page.close();
}
await browser.close();
finish("e2e_run17_fab");
