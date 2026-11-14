// Run 78 in the real bundled app: the owner's "does it feel native" video (14 Nov) - press reacts when the finger lands, the active tab
// scrolls to the top, a sheet follows the finger from its title and springs back, haptics only when something changes. Synthetic data only.
import { launch, openPage, openAdd, ok, section, finish, baseSeed, tx, daysAgo, wait } from "./lib.mjs";
const browser = await launch();
const many = Array.from({ length: 80 }, (_, i) => tx({ amount: 3 + (i % 9), merchant: "Shop " + i, date: daysAgo(i % 25) }));
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: many }), width: 360, height: 700 });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));

section("R78-N1. Press: a control reacts the moment the finger lands");
const css = await page.evaluate(() => [...document.querySelectorAll("style")].map((s) => s.textContent).join("").includes(":is(:active,.pressed)"));
ok(css, "every pressed look in the stylesheet also answers to the instant 'pressed' mark");
const box = await page.evaluate(() => { const b = document.querySelectorAll(".tab-btn")[1]; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(box.x, box.y); await page.mouse.down();
const down = await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].classList.contains("pressed"));
await page.mouse.move(box.x + 40, box.y - 60, { steps: 4 });
const moved = await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].classList.contains("pressed"));
await page.mouse.up(); await wait(120);
const up = await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].classList.contains("pressed"));
ok(down && !moved && !up, "pressed as soon as the finger is down, released when it slides away or lifts", { down, moved, up });

section("R78-N2. Tab: tapping the tab you are on scrolls back to the top");
await page.evaluate(() => document.querySelectorAll(".tab-btn")[0].click()); await wait(500);
await page.evaluate(() => { window.scrollTo(0, 1200); const m = document.querySelector("main.page"); if (m) m.scrollTop = 1200; }); await wait(200);
const before = await page.evaluate(() => Math.max(window.scrollY, (document.querySelector("main.page") || {}).scrollTop || 0));
await page.evaluate(() => document.querySelectorAll(".tab-btn")[0].click()); await wait(900);
const after = await page.evaluate(() => Math.max(window.scrollY, (document.querySelector("main.page") || {}).scrollTop || 0));
ok(before > 100 && after === 0, "the page was scrolled down and is back at the top", { before, after });

section("R78-N3. Sheet: pulled by its title it follows the finger, and springs back when let go early");
await openAdd(page);
await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /More details/.test(x.innerText)); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); }); await wait(500);
await page.evaluate(() => document.querySelector('.add-overlay input[type="date"]').parentElement.querySelector(".pick-btn").click());
await page.waitForSelector('[data-section="pick-date-sheet"]'); await wait(450);
const tb = await page.evaluate(() => { const r = document.querySelector('[data-section="pick-date-sheet"] .sheet-title').getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; });
await page.mouse.move(tb.x, tb.y); await page.mouse.down();
await page.mouse.move(tb.x, tb.y + 60, { steps: 6 }); await wait(60);
const mid = await page.evaluate(() => { try { return new DOMMatrix(getComputedStyle(document.querySelector(".pick-sheet")).transform).m42; } catch { return 0; } });
await wait(250); await page.mouse.up(); await wait(900);
const rest = await page.evaluate(() => { const s = document.querySelector('[data-section="pick-date-sheet"]'); if (!s) return null; try { return new DOMMatrix(getComputedStyle(s).transform).m42; } catch { return 0; } });
ok(mid > 40 && mid < 80, "while the finger moves, the sheet moves with it", mid);
ok(rest !== null && Math.abs(rest) < 1, "let go early, it springs back and stays open", rest);

section("R78-N4. Haptics only when something changes");
await page.evaluate(() => { window.__ticks = []; window.LedgerNative = Object.assign(window.LedgerNative || {}, { haptic: (k) => window.__ticks.push(k) }); });
await page.evaluate(() => document.querySelector('[data-section="pick-date-sheet"] .pick-day.on').click()); await wait(500);
const same = await page.evaluate(() => window.__ticks.slice());
await page.evaluate(() => document.querySelector('.add-overlay input[type="date"]').parentElement.querySelector(".pick-btn").click());
await page.waitForSelector('[data-section="pick-date-sheet"]'); await wait(400);
await page.evaluate(() => document.querySelector('[data-section="pick-date-sheet"] [data-quick="yesterday"]').click()); await wait(500);
const changed = await page.evaluate(() => window.__ticks.slice());
ok(same.length === 0 && changed.length === 1 && changed[0] === "tick", "choosing the day already chosen gives no tick; a new day gives one", { same, changed });
const plain = await page.evaluate(() => { window.__ticks = []; const b = [...document.querySelectorAll(".add-overlay button")].find((x) => /More details|Fewer details/.test(x.innerText)); if (b) b.click(); return window.__ticks.length; });
ok(plain === 0, "an ordinary button gives no tick", plain);
ok(errors.length === 0, "no JavaScript errors", errors);
await browser.close();
finish("e2e_run78_nativefeel");
