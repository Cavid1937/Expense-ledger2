// Run 78 in the real bundled app (owner, 14 Nov: the calendar and the "how often" list "close and select instantly", switches feel "hard"):
// a choice lights up first and the sheet then slides away; months slide in from the side asked for; with reduced motion everything is instant;
// on the phone a switch or a choice gives a short tick. Synthetic data only.
import { launch, openPage, openAdd, ok, section, finish, baseSeed, wait } from "./lib.mjs";
const browser = await launch();
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }), width: 360 });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
await openAdd(page);
await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /More details/.test(x.innerText)); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); }); await wait(500);
const openDate = async () => { await page.evaluate(() => document.querySelector('.add-overlay input[type="date"]').parentElement.querySelector(".pick-btn").click()); await page.waitForSelector('[data-section="pick-date-sheet"]'); await wait(350); };
const sheetState = () => page.evaluate(() => { const o = document.querySelector(".pick-overlay"); return { present: !!o, leaving: !!(o && o.classList.contains("leaving")), dialog: !!document.querySelector('[data-section="pick-date-sheet"],[data-section="pick-select-sheet"]') }; });

section("R78-M1. Picking a day: it lights up first, then the sheet slides away");
await openDate();
const day = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-section="pick-date-sheet"] .pick-day:not(:disabled):not(.on)')][0]; b.click(); return b.dataset.date; });
await wait(40);
const early = await page.evaluate((d) => { const b = document.querySelector(`.pick-overlay .pick-day[data-date="${d}"]`); return { shown: !!b && b.classList.contains("on") && b.classList.contains("just"), value: document.querySelector('.add-overlay input[type="date"]').value }; }, day);
const s1 = await sheetState();
ok(early.shown && early.value === day && s1.present && !s1.leaving, "right after the tap the chosen day is highlighted, the form already holds it and the sheet is still there", { early, s1 });
await wait(160);
const s2 = await sheetState();
ok(s2.present && s2.leaving && !s2.dialog, "a moment later the sheet is sliding away and is no longer announced as an open window", s2);
await wait(300);
ok(!(await sheetState()).present, "then it is gone");

section("R78-M2. Months slide in from the side that was asked for");
await openDate();
const first = await page.evaluate(() => document.querySelector(".pick-grid").className);
const heights = [await page.evaluate(() => Math.round(document.querySelector(".pick-sheet").getBoundingClientRect().height))];
await page.evaluate(() => document.querySelector('[data-section="pick-date-sheet"] [aria-label="Previous month"]').click()); await wait(30);
const back = await page.evaluate(() => ({ grid: document.querySelector(".pick-grid").className, name: document.querySelector(".pick-month-label").className }));
await page.evaluate(() => document.querySelector('[data-section="pick-date-sheet"] [aria-label="Next month"]').click()); await wait(30);
const fwd = await page.evaluate(() => document.querySelector(".pick-grid").className);
ok(!/in-(next|prev)/.test(first) && /in-prev/.test(back.grid) && /in-prev/.test(back.name) && /in-next/.test(fwd), "the first month just appears; back slides from the left, next from the right", { first, back, fwd });
for (let i = 0; i < 4; i++) { await page.evaluate(() => document.querySelector('[data-section="pick-date-sheet"] [aria-label="Next month"]').click()); await wait(320); heights.push(await page.evaluate(() => Math.round(document.querySelector(".pick-sheet").getBoundingClientRect().height))); }
ok(new Set(heights).size === 1, "the sheet keeps the same height from month to month (no jump)", heights);
await page.evaluate(() => document.querySelector(".pick-close").click()); await wait(40);
ok((await sheetState()).leaving, "the close button slides the sheet away too");
await wait(400);

section("R78-M3. Choosing from a list: the check shows, then the sheet goes");
const target = await page.evaluate(() => { const s = [...document.querySelectorAll(".add-overlay select")].find((x) => x.options.length > 1); const btn = s.parentElement.querySelector(".pick-btn"); btn.click(); const other = [...s.options].find((o) => o.value !== s.value); return { id: s.id, v: other.value }; });
await page.waitForSelector('[data-section="pick-select-sheet"]'); await wait(350);
await page.evaluate((v) => document.querySelector(`[data-section="pick-select-sheet"] [data-value="${CSS.escape(v)}"]`).click(), target.v); await wait(40);
const chk = await page.evaluate((v) => { const b = document.querySelector(`.pick-overlay [data-value="${CSS.escape(v)}"]`); return !!b && b.classList.contains("on") && b.classList.contains("just") && !!b.querySelector(".pick-check"); }, target.v);
ok(chk && !(await sheetState()).leaving, "the new choice gets its check while the sheet is still open", chk);
await wait(500);
ok(!(await sheetState()).present && (await page.evaluate((a) => document.getElementById(a.id).value, target)) === target.v, "then the sheet is gone and the list holds the choice");

section("R78-M4. Switches give a short tick on the phone (stubbed here), nothing else changes");
await page.evaluate(() => { window.__ticks = []; window.LedgerNative = Object.assign(window.LedgerNative || {}, { haptic: (k) => window.__ticks.push(k) }); });
const before = await page.evaluate(() => { const t = document.querySelector('.add-overlay [role="switch"]'); if (!t) return null; const b = t.getAttribute("aria-checked"); t.click(); return b; });
await wait(80);
const sw = before === null ? null : { before, after: await page.evaluate(() => document.querySelector('.add-overlay [role="switch"]').getAttribute("aria-checked")) };
const ticks = await page.evaluate(() => window.__ticks.slice());
if (sw) ok(sw.before !== sw.after && ticks.length === 1 && ticks[0] === "tick", "flipping a switch flips it and asks the phone for one tick", { sw, ticks });
else ok(true, "no switch on this Add screen (nothing to check)");
const knob = await page.evaluate(() => { const k = document.querySelector(".toggle-knob"); return k ? getComputedStyle(k).transitionTimingFunction : ""; });
ok(/cubic-bezier\(0\.3, 1\.22, 0\.45, 1\)/.test(knob), "the switch knob moves on the soft spring curve", knob);

section("R78-M5. With reduced motion the picker closes at once");
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await openDate();
await page.evaluate(() => document.querySelector('[data-quick="today"],[data-quick="yesterday"]').click()); await wait(30);
ok(!(await sheetState()).present, "the sheet is gone straight after the tap");
ok(errors.length === 0, "no JavaScript errors", errors);
await browser.close();
finish("e2e_run78_softmotion");
