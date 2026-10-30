// Run 14 (2026-10-28), UX pass: keyboard and screen-reader access to the places that were mouse-only, visible focus, quieter
// banners and restrained motion. Written BEFORE the fixes. Synthetic data. Confirmed in the active source first:
// .txn-row, the recurring-payment row, .m-col (Analytics bars) and .io-card.drop-zone are clickable <div>s; the drop zone's only
// file input is display:none, so importing a backup had NO keyboard or screen-reader route at all.
import { launch, openPage, state, tab, openData, wait, ok, section, finish, tx, baseSeed, KEY } from "./lib.mjs";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const DAY = pad(Math.min(d.getDate() - 1, 27) || 1);
const income = tx({ id: 1790000400001, type: "income", category: "salary", amount: 2000, merchant: "Employer", date: `${ym(0)}-01` });
const seed = (over = {}) => baseSeed({ transactions: [income, tx({ id: 1790000400002, merchant: "Bravo", amount: 18.4, date: `${ym(0)}-${DAY}` }), tx({ id: 1790000400003, merchant: "Rent", amount: 450, category: "housing", recurring: true, recurFreq: "monthly", billId: "bR", date: `${ym(-1)}-03` }),
  tx({ id: 1790000400004, merchant: "Pharmacy", amount: 35, category: "health", date: `${ym(-1)}-20` })],
  bills: [{ id: "bR", name: "Rent", type: "expense", category: "housing", subcategory: "", amount: 450, freq: "monthly", anchorDate: `${ym(-1)}-03`, active: true, createdAt: "2026-09-01T00:00:00Z" }], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 }, ...over });
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a ? { cls: a.className && a.className.baseVal === undefined ? a.className : "", tag: a.tagName, role: a.getAttribute("role"), text: (a.innerText || "").slice(0, 40) } : null; });
const tabTo = async (page, selector, max = 40) => { for (let i = 0; i < max; i++) { await page.keyboard.press("Tab"); if (await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), selector)) return i + 1; } return 0; };
const outline = (page) => page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });

section("UX-K1. Transaction rows work from the keyboard");
{
  const page = await openPage(browser, { seed: seed() }); await tab(page, "Ledger"); await wait(250);
  const info = await page.evaluate(() => { const r = document.querySelector(".txn-row"); return { role: r.getAttribute("role"), tab: r.getAttribute("tabindex") }; });
  ok(info.role === "button" && info.tab === "0", "a transaction row is a keyboard-focusable button", info);
  await page.focus(".txn-list input, .search-input, input[type=search], input[type=text]").catch(() => {});
  const steps = await tabTo(page, ".txn-row");
  ok(steps > 0, "pressing Tab from the search box reaches a transaction row", steps);
  const o = await outline(page);
  ok(steps > 0 && o.style !== "none" && o.width >= 2, "the focused row shows a visible focus outline (2 px or more)", o);
  await page.keyboard.press("Enter"); await wait(400);
  ok(!!(await page.$(".sheet")), "Enter opens the transaction's detail sheet");
  await page.keyboard.press("Escape"); await wait(300);
  await page.evaluate(() => document.querySelectorAll(".txn-row")[1].focus()); await page.keyboard.press("Space"); await wait(400);
  ok(!!(await page.$(".sheet")), "Space opens it too");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("UX-K2. Recurring payments / bills");
{
  const page = await openPage(browser, { seed: seed() }); await tab(page, "Recurring"); await wait(300);
  const info = await page.evaluate(() => { const r = document.querySelector(".bill-row"); return { role: r.getAttribute("role"), tab: r.getAttribute("tabindex"), iconHidden: r.previousElementSibling && r.previousElementSibling.getAttribute("aria-hidden") }; });
  ok(info.role === "button" && info.tab === "0" && info.iconHidden === "true", "the bill row is one keyboard-focusable button; its decorative icon is hidden from screen readers (one tab stop, not two)", info);
  await page.evaluate(() => document.querySelector(".bill-row").focus()); await page.keyboard.press("Enter"); await wait(400);
  ok(!!(await page.$(".bill-sheet")), "Enter opens the bill sheet");
  await page.close();
  const p2 = await openPage(browser, { seed: seed() }); await tab(p2, "Recurring"); await wait(300);
  await p2.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Pause/.test(x.innerText)); b.focus(); }); await p2.keyboard.press("Enter"); await wait(400);
  ok(!(await p2.$(".bill-sheet")) && (await state(p2)).bills[0].active === false, "pressing Enter on 'Pause' pauses the bill and does NOT also open the sheet (no double action)");
  await p2.close();
}

section("UX-K3. Importing a backup by keyboard (was impossible)");
{
  const page = await openPage(browser, { seed: seed() }); await openData(page);
  const info = await page.evaluate(() => { const z = document.querySelector(".drop-zone"); return { role: z.getAttribute("role"), tab: z.getAttribute("tabindex"), name: z.getAttribute("aria-label") || z.innerText }; });
  ok(info.role === "button" && info.tab === "0" && /import|idxal|импорт/i.test(info.name), "the import tile is a focusable button with a readable name", info);
  const steps = await tabTo(page, ".drop-zone");
  ok(steps > 0, "Tab reaches the import tile", steps);
  // Observe what the app does (it calls the file input's click) instead of racing the browser's own dialog: in one full run the
  // dialog wait timed out (log 305) while the same step passed 6 of 6 times alone. The dialog itself is the browser's job.
  await page.evaluate(() => { window.__fileClicks = 0; const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === "file") window.__fileClicks++; return orig.call(this); }; });
  await page.keyboard.press("Enter"); await wait(300);
  ok((await page.evaluate(() => window.__fileClicks)) === 1, "Enter makes the app open the file picker (exactly one call to the file input)");
  await page.close();
}

section("UX-K4. Analytics month bars");
{
  const page = await openPage(browser, { seed: seed() }); await tab(page, "Monthly"); await wait(400);
  const info = await page.evaluate(() => { const c = document.querySelector(".m-col"); return c ? { role: c.getAttribute("role"), tab: c.getAttribute("tabindex"), pressed: c.getAttribute("aria-pressed"), label: c.getAttribute("aria-label") } : null; });
  ok(info && info.role === "button" && info.tab === "0" && info.pressed === "false" && /\d/.test(info.label || ""), "each month bar is a button with a name that includes the month and its amount, and a pressed state", info);
  await page.evaluate(() => document.querySelectorAll(".m-col")[document.querySelectorAll(".m-col").length - 1].focus()); await page.keyboard.press("Enter"); await wait(250);
  ok(await page.evaluate(() => document.querySelectorAll(".m-col")[document.querySelectorAll(".m-col").length - 1].getAttribute("aria-pressed")) === "true", "Enter selects the bar (pressed = true)");
  await page.close();
  const p2 = await openPage(browser, { seed: seed() });
  await p2.evaluate(() => { const b = document.querySelector(".privacy-toggle, [aria-label*='rivacy'], [aria-label*='ide']"); b && b.click(); }); await tab(p2, "Monthly"); await wait(400);
  const labels = await p2.evaluate(() => [...document.querySelectorAll(".m-col")].map((c) => c.getAttribute("aria-label") || ""));
  ok(labels.length > 0 && labels.every((l) => !/\d[\d.,\s]*\s?₼/.test(l)), "with privacy mode on, the bar names reveal no amount", labels.slice(0, 3));
  await p2.close();
}

section("UX-K5. Banners: routine reminders only where they can be acted on; critical ones everywhere");
{
  const page = await openPage(browser, { seed: seed({ lastBackup: new Date().toISOString() }) });
  const has = async () => !!(await page.$(".backup-banner.backup-reminder:not(.update-banner)"));
  const where = {}; for (const [n, t] of [["Home", "Home"], ["Ledger", "Ledger"], ["Monthly", "Monthly"], ["Goals", "Goals"], ["More", "More"], ["Recurring", "Recurring"]]) { await tab(page, t); await wait(200); where[n] = await has(); }
  await openData(page); where.ImportExport = await has();
  ok(where.Home && where.ImportExport && !where.Ledger && !where.Monthly && !where.Goals && !where.More && !where.Recurring, "the 'did you keep the backup file?' reminder shows on Home and Import / Export only", where);
  await page.close();
  const p2 = await openPage(browser, { seed: seed({ lastBackup: new Date().toISOString() }) }); await wait(300);
  await p2.evaluate(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "expense_ledger_v5") throw new DOMException("full", "QuotaExceededError"); return orig.call(this, k, v); }; });
  await tab(p2, "Recurring"); await p2.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await p2.waitForSelector(".bill-sheet"); await wait(300);
  await p2.evaluate((dd) => { const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
    set(document.querySelector("#bill-name"), "Internet"); set(document.querySelector("#bill-amount"), "25"); set(document.querySelector("#bill-date"), dd); }, `${ym(0)}-${DAY}`);
  await wait(150); await p2.evaluate(() => document.querySelector(".bill-save").click()); await wait(500);
  await tab(p2, "Ledger"); await wait(300);
  ok(/could not be saved|can't be saved|not saved|full/i.test(await p2.evaluate(() => (document.querySelector(".backup-banner[role=alert]") || {}).innerText || "")), "a critical 'cannot save' warning still shows on the Transactions tab");  await p2.close();
}

section("UX-K6. Motion: no staggered slide-in of every section; focus ring on controls that lacked one");
{
  const page = await openPage(browser, { seed: seed() }); await wait(500);
  const m = await page.evaluate(() => { const els = [...document.querySelectorAll("[class*='section-enter']")]; return { n: els.length, delays: [...new Set(els.map((e) => getComputedStyle(e).animationDelay))], dur: [...new Set(els.map((e) => getComputedStyle(e).animationDuration))] }; });
  ok(m.n > 0 && m.delays.length === 1 && m.delays[0] === "0s", "all sections of a screen appear together (no per-section delay)", m);
  const kf = await page.evaluate(() => { const rules = [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r.name === "sectionIn" || r.name === "pageIn"); return rules.map((r) => r.cssText).join(" "); });
  ok(!/translate/.test(kf), "the screen-change animation is a short fade only (no sliding)", kf.slice(0, 160));
  ok(await page.evaluate(() => { const css = [...document.styleSheets].flatMap((s) => [...s.cssRules]).map((r) => r.cssText).join("\n"); return /\.m-col:focus-visible/.test(css) && /\.drop-zone:focus-visible/.test(css) && /\.txn-row:focus-visible/.test(css) && /\.bill-row:focus-visible/.test(css); }), "focus rings exist for rows, bars, the import tile and bill rows");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]); await tab(page, "Ledger"); await wait(300);
  ok(await page.evaluate(() => [...document.querySelectorAll("[class*='section-enter']")].every((e) => getComputedStyle(e).animationName === "none")), "with 'reduce motion' on there is no animation at all");
  await page.close();
}
await browser.close();
finish("e2e_ux_keyboard");
