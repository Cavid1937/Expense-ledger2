// Run 2 (2026-10-26): problems the owner found on a real phone after the release.
//  R2-A  sheets opened inside a page stay on screen with a long, scrolled list (was: blank dimmed page; sheet ~4000px below)
//  R2-B  the Ledger category list follows the Expenses / Income choice
//  R2-C  a Ledger search that matches nothing shows "No results" (was: a crash, a variable hid the translation function)
//  R2-D  the phone's Back button closes the open sheet, then returns to Home, and only then leaves the app
//  R2-E  swiping left/right on a page moves between the five sections
import { launch, openPage, openSettings, tab, wait, ok, section, finish, tx, baseSeed, ymd, setInput } from "./lib.mjs";
const browser = await launch();
const now = new Date();
const day = (k) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - k));
const cats = ["food", "transport", "shopping", "home"];
const longList = [...Array.from({ length: 40 }, (_, i) => tx({ category: cats[i % 4], merchant: "Shop " + i, amount: 5 + i, date: day(i) })),
  tx({ type: "income", category: "salary", merchant: "Employer", amount: 1800, date: day(2) })];
const phone = async (seed) => {   // a touch phone: 390×844, touch events on
  const page = await openPage(browser, { seed: baseSeed({ transactions: seed }) });
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await wait(300);
  return page;
};
const activeTab = (page) => page.evaluate(() => (document.querySelector(".tab-btn.active .tab-lbl") || {}).textContent || "");
const sheetBox = (page) => page.evaluate(() => { const s = document.querySelector(".sheet"); if (!s) return null; const r = s.getBoundingClientRect(), tb = document.querySelector(".tabbar").getBoundingClientRect();
  const hit = document.elementFromPoint(tb.left + tb.width / 2, tb.top + tb.height / 2); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, tabbarCovered: !!(hit && hit.closest(".sheet-overlay")) }; });

section("R2-A. A sheet opened from a long Ledger list is on screen and above the tab bar");
let page = await phone(longList);
await tab(page, "Ledger"); await wait(400);
for (const where of ["top", "bottom"]) {
  await page.evaluate((w) => window.scrollTo(0, w === "top" ? 0 : document.documentElement.scrollHeight), where); await wait(200);
  await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await wait(700);
  const b = await sheetBox(page);
  ok(b && b.top >= 0 && b.top < b.vh && Math.abs(b.bottom - b.vh) <= 2, `list scrolled to the ${where}: the category sheet sits at the bottom of the screen (top ${b && b.top}, bottom ${b && b.bottom}, screen ${b && b.vh})`, b);
  ok(b && b.tabbarCovered, `…and it covers the tab bar (the tab bar is not drawn over it)`, b);
  await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(400);
}
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R2-B. The category list follows Expenses / Income");
page = await phone(longList);
await tab(page, "Ledger"); await wait(300);
const sheetItems = async () => { await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await wait(500);
  const items = await page.evaluate(() => [...document.querySelectorAll(".sheet button")].map((b) => b.innerText.replace("✓", "").trim()).filter((x) => x && x !== "Close"));
  await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(350); return items; };
const chip = (label) => page.evaluate((l) => [...document.querySelectorAll(".filter-bar .chip")].find((c) => c.innerText.trim() === l).click(), label);
let items = await sheetItems();
ok(items.includes("Food & Dining") && items.includes("Salary"), "All: both expense and income categories are listed", items);
await chip("Expenses"); await wait(200); items = await sheetItems();
ok(items.includes("Food & Dining") && !items.includes("Salary"), "Expenses: only expense categories (no Salary)", items);
await chip("Income"); await wait(200); items = await sheetItems();
ok(items.includes("Salary") && !items.includes("Food & Dining"), "Income: only income categories (no Food & Dining)", items);
await chip("Expenses"); await wait(200);
await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await wait(500);
await page.evaluate(() => [...document.querySelectorAll(".sheet button")].find((b) => b.innerText.includes("Transport")).click()); await wait(400);
await chip("Income"); await wait(300);
const incomeView = await page.evaluate(() => ({ btn: document.querySelector(".cat-filter-btn").innerText.trim(), text: document.body.innerText }));
ok(!/Transport/.test(incomeView.btn) && /Employer/.test(incomeView.text), "switching to Income drops a Transport filter instead of showing an empty list", incomeView.btn);
await page.close();

section("R2-C. A search with no match shows 'No results' and does not crash");
page = await phone(longList);
await tab(page, "Ledger"); await wait(300);
await setInput(page, () => document.querySelector(".search-input"), "zzqq"); await wait(400);
const txt = await page.evaluate(() => document.body.innerText);
ok(page.errors.length === 0 && /No results/.test(txt), "searching 'zzqq' shows 'No results' with no JavaScript error", page.errors[0]);
await setInput(page, () => document.querySelector(".search-input"), "octob"); await wait(400);
ok(page.errors.length === 0, "searching part of a month name works too (it reaches the month-name check)", page.errors[0]);
await page.close();

section("R2-D. The phone's Back button");
page = await phone(longList);
const back = async () => { await page.evaluate(() => history.back()); await wait(500); };
const inApp = () => page.evaluate(() => !!document.querySelector(".tabbar"));
await openSettings(page);   // Run 9: Settings opens from More
ok(await page.$(".sheet"), "Settings is open (precondition)");
await back();
ok(!(await page.$(".sheet")) && await inApp(), "Back closes the Settings sheet and stays in the app");
await tab(page, "Ledger"); await wait(300);
await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await wait(500);
await back();
ok(!(await page.$(".sheet")) && /Transactions/.test(await activeTab(page)), "Back closes the Ledger category sheet and stays on Ledger");
await back();
ok(/Home/.test(await activeTab(page)) && await inApp(), "Back on Ledger returns to Home", await activeTab(page));
await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await wait(500);
await back();
ok(!(await page.$(".add-overlay")) && await inApp(), "Back closes the Add form");
await back();
const toastText = await page.evaluate(() => (document.querySelector(".toast") || {}).textContent || "");
ok(await inApp() && /back again/i.test(toastText), "Back on Home with nothing open does not leave at once: it says 'Press Back again to exit'", toastText);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R2-E. Swiping left / right moves between sections");
page = await phone(longList);
const cdp = await page.target().createCDPSession();
const swipe = async (x0, y0, x1, y1, steps = 8) => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] }); await wait(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await wait(500);
};
ok(/Home/.test(await activeTab(page)), "starts on Home");
await swipe(320, 450, 60, 460);
ok(/Transactions/.test(await activeTab(page)), "swipe left on Home → Transactions", await activeTab(page));
await swipe(320, 450, 60, 460);
ok(/Analytics/.test(await activeTab(page)), "swipe left again → Analytics", await activeTab(page));
await swipe(60, 450, 320, 460);
ok(/Transactions/.test(await activeTab(page)), "swipe right → back to Transactions", await activeTab(page));
await swipe(200, 300, 230, 650);
ok(/Transactions/.test(await activeTab(page)), "a mostly vertical drag (scrolling) does not change section", await activeTab(page));
await swipe(200, 450, 170, 455);
ok(/Transactions/.test(await activeTab(page)), "a short sideways nudge (30px) does not change section", await activeTab(page));
const chipY = await page.evaluate(() => { const r = document.querySelector(".filter-bar").getBoundingClientRect(); return r.top + r.height / 2; });
const scrollsX = await page.evaluate(() => { const f = document.querySelector(".filter-bar"); return f.scrollWidth > f.clientWidth; });
// Precondition, checked rather than assumed: at 390px the chips must overflow, or the next check would prove nothing.
ok(scrollsX, "precondition: the filter chips are wider than the screen (they scroll sideways)");
await swipe(320, chipY, 60, chipY); ok(/Transactions/.test(await activeTab(page)), "a swipe on the sideways-scrolling filter chips scrolls them instead of changing section", await activeTab(page));
await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await wait(500);
await swipe(320, 700, 60, 705);
ok(/Transactions/.test(await activeTab(page)) && await page.$(".sheet"), "with a sheet open, a sideways swipe does not change section", await activeTab(page));
await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(400);
await tab(page, "Home"); await wait(300);
await swipe(60, 450, 320, 460);
ok(/Home/.test(await activeTab(page)), "swipe right on Home (the first section) stays on Home", await activeTab(page));
await tab(page, "Recurring"); await wait(300);
await swipe(320, 450, 60, 460);
ok(/More/.test(await activeTab(page)) && !!(await page.$(".more-page, .tabbar")), "swipe left on Recurring (under More, the last section) stays there", await activeTab(page));
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await finish("e2e_run2", browser);
