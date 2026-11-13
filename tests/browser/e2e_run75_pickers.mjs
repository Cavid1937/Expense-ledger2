// Run 75 in the real bundled app: the app's own date and option pickers on the Add screen (owner, 13 Nov: the phone's grey windows looked
// foreign). The real controls stay hidden in the page and keep the value. Synthetic data only.
import { launch, openPage, openAdd, state, ok, section, finish, baseSeed, wait, TODAY, daysAgo } from "./lib.mjs";
const browser = await launch();
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), width: 360 });
await openAdd(page);
await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /More details/.test(x.innerText)); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); }); await wait(500);

section("R75-P1. The visible controls are the app's own, the real ones stay hidden underneath");
const info = await page.evaluate(() => { const d = document.querySelector('.add-overlay input[type="date"]'), btn = d && d.parentElement.querySelector(".pick-btn"); const cs = d && getComputedStyle(d); return { hasNative: !!d, hidden: cs ? cs.opacity === "0" && cs.pointerEvents === "none" : null, aria: d && d.getAttribute("aria-hidden"), btn: btn ? btn.innerText : null, label: btn && btn.getAttribute("aria-label") }; });
ok(info.hasNative && info.hidden && info.aria === "true", "the date field's real control is still there but hidden from view and from screen readers", info);
ok(info.btn && /\d{4}/.test(info.btn) && /Date/i.test(info.label || ""), "the visible button shows the date in words and is named after its field for screen readers", info);

section("R75-P2. Choosing a date");
await page.evaluate(() => document.querySelector('.add-overlay input[type="date"]').parentElement.querySelector(".pick-btn").click()); await page.waitForSelector('[data-section="pick-date-sheet"]'); await wait(300);
const sheet = await page.evaluate(() => { const s = document.querySelector('[data-section="pick-date-sheet"]'); return { today: !!s.querySelector('[data-quick="today"]'), yest: !!s.querySelector('[data-quick="yesterday"]'), days: s.querySelectorAll(".pick-day").length, onToday: !!s.querySelector(".pick-day.on.today") }; });
ok(sheet.today && sheet.yest && sheet.days >= 28 && sheet.onToday, "the sheet offers Today, Yesterday and the month, with today chosen", sheet);
await page.evaluate(() => document.querySelector('[data-quick="yesterday"]').click()); await wait(300);
ok(!(await page.$('[data-section="pick-date-sheet"]')) && (await page.evaluate(() => document.querySelector('.add-overlay input[type="date"]').value)) === daysAgo(1), "Yesterday closes the sheet and the form now holds yesterday's date", daysAgo(1));
const future = await page.evaluate(() => { const d = document.querySelector('.add-overlay input[type="date"]'); return d.getAttribute("max"); });
if (future) {
  await page.evaluate(() => document.querySelector('.add-overlay input[type="date"]').parentElement.querySelector(".pick-btn").click()); await wait(300);
  await page.evaluate(() => { const nx = document.querySelector('[data-section="pick-date-sheet"] [aria-label="Next month"]'); nx.click(); }); await wait(200);
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-section="pick-date-sheet"] .pick-day')].every((b) => b.disabled)), "days after the allowed last date cannot be picked");
  await page.keyboard.press("Escape"); await wait(300);
} else ok(true, "this date field has no upper limit (nothing to check)");

section("R75-P3. Choosing from a list, then saving");
const selId = await page.evaluate(() => { const s = [...document.querySelectorAll(".add-overlay select")].find((x) => x.options.length > 1); return s ? s.id || "" : null; });
ok(selId !== null, "the Add screen has at least one option list", selId);
if (selId !== null) {
  const pickBtn = await page.evaluate((id) => { const s = id ? document.getElementById(id) : [...document.querySelectorAll(".add-overlay select")].find((x) => x.options.length > 1); const b = s.parentElement.querySelector(".pick-btn"); b.click(); return [...s.options].map((o) => o.value); }, selId); await wait(300);
  const target = pickBtn[pickBtn.length - 1];
  await page.evaluate((v) => document.querySelector(`[data-section="pick-select-sheet"] [data-value="${CSS.escape(v)}"]`).click(), target); await wait(300);
  ok(await page.evaluate((a) => { const s = a.id ? document.getElementById(a.id) : [...document.querySelectorAll(".add-overlay select")].find((x) => x.options.length > 1); return s.value === a.v && s.parentElement.querySelector(".pick-btn").innerText.trim() === s.selectedOptions[0].text.trim(); }, { id: selId, v: target }), "choosing in the sheet sets the real list and the button shows the choice");
}
await page.evaluate(() => { const i = document.querySelector(".amount-input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "12.50"); i.dispatchEvent(new Event("input", { bubbles: true })); }); await wait(200);
await page.evaluate(() => [...document.querySelectorAll(".add-overlay button")].find((b) => /^Record/.test(b.innerText.trim())).click()); await wait(800);
const e = (await state(page)).transactions[0];
ok(e && e.amount === 12.5 && e.date === daysAgo(1), "the entry is saved with the date chosen in the app's own picker", e && { amount: e.amount, date: e.date });
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await browser.close();
finish("e2e_run75_pickers");
