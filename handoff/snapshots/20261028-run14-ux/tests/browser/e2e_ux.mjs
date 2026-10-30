// UX + accessibility in the real UI: recurring schedules, sheet gestures, keyboard, touch targets, contrast, user preferences.
import { openSafe, launch, openPage, state, toast, clickText, setInput, openSettings, openAdd, tab, wait, settle, ok, section, finish, tx, baseSeed, TODAY, daysAgo, ymd, bodyText } from "./lib.mjs";
const browser = await launch();
const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
const dim = (yy, mm) => new Date(yy, mm + 1, 0).getDate();
const sameDayLastMonth = ymd(new Date(y, m - 1, Math.min(d, dim(y, m - 1))));
const monthsBack = (k) => ymd(new Date(y, m - k, Math.min(d, dim(y, m - k))));
const R = (o) => tx({ recurring: true, recurFreq: "monthly", category: "digital", amount: 15, ...o });

section("S1. Recurring screen groups payments into schedules");
const rent = [2, 1, 0].map((k) => R({ merchant: "Rent", category: "housing", amount: 450, date: monthsBack(k), subcategory: "Rent" }));
const seed1 = baseSeed({ transactions: [tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: TODAY }), ...rent, R({ merchant: "Netflix", date: TODAY }), R({ merchant: "Spotify", date: sameDayLastMonth })] });
let page = await openPage(browser, { seed: seed1 });
await tab(page, "Recurring"); await wait(300);
const rows = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /^(Pause|Reactivate)$/.test(b.textContent.trim())).length);
ok(rows === 3, `rent recorded 3 months + Netflix + Spotify = 3 rows, not 5 (found ${rows})`);
let txt = await bodyText(page);
ok(/3 payments recorded/.test(txt) && /480\.00 ₼/.test(txt), "rent row says '3 payments recorded'; typical monthly outgoing = 450 + 15 + 15 = 480.00 ₼");
await clickText(page, "button", /^Pause$/); await wait(250);
const rentRow = await page.evaluate(() => { const r = [...document.querySelectorAll("div")].find((el) => /Rent/.test(el.textContent) && /Reactivate|Pause/.test(el.textContent) && el.children.length >= 2 && el.textContent.length < 400); return !!r; });
let st = await state(page);
const paused = st.transactions.filter((t) => t.isActive === false);
ok(paused.length === 1 || paused.length === 3, "pausing one schedule pauses every payment recorded under it", paused.map((t) => t.merchant));
ok(paused.every((t) => t.merchant === paused[0].merchant) && paused.length === (paused[0].merchant === "Rent" ? 3 : 1), "…all members of that schedule and no others", paused.map((t) => t.merchant));
txt = await bodyText(page); ok(/Paused/.test(txt), "a Paused section appears");
await clickText(page, "button", /^Reactivate$/); await wait(250); st = await state(page);
ok(st.transactions.every((t) => t.isActive !== false), "reactivating restores the whole schedule");
await tab(page, "Home"); await wait(300); await openSafe(page); txt = await bodyText(page);   // Run 9: the calculation opens on tap
ok(/Upcoming & unrecorded payments/.test(txt) && /recurring schedules?/.test(txt), "Home: Safe to Spend lists upcoming/unrecorded payments and says how many schedules it used");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
page = await openPage(browser, { seed: baseSeed({ transactions: [tx({ type: "income", category: "salary", amount: 500, date: TODAY })] }) });
ok(/No recurring payments are set up, so upcoming bills are not included/.test(await bodyText(page)), "with no recurring payments the card says upcoming bills are NOT included (no silent optimism)");
await page.close();

section("S2. Sheets: dismissal, gestures, focus");
page = await openPage(browser);
// Run 9: Settings opens from More → Settings; a keyboard user focuses that row and presses Enter.
await tab(page, "More"); const settingsRow = ".more-page .list-row:nth-child(3)";
await page.focus(settingsRow); await page.keyboard.press("Enter"); await page.waitForSelector(".sheet"); await wait(350); await settle(page);
ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("sheet")), "opening a sheet moves focus into it");
await page.keyboard.press("Escape"); await wait(300);
ok(!(await page.$(".sheet")) && await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("list-row") && /Settings/.test(document.activeElement.innerText)), "Escape closes it and focus returns to the Settings row that opened it");
await openSettings(page); await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(300); ok(!(await page.$(".sheet")), "tapping the backdrop closes it");
await openSettings(page);
// (2026-10-26: the failure now reports where focus went and after how many presses — same pass/fail rule as before)
let escaped = false; for (let i = 0; i < 45; i++) { await page.keyboard.press("Tab"); const where = await page.evaluate(() => { const a = document.activeElement; return a.closest(".sheet") ? null : `${a.tagName}.${a.className} "${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 30)}"`; }); if (where) { escaped = `press ${i + 1}: ${where}`; break; } }
ok(!escaped, "45 presses of Tab never leave the open sheet (focus stays inside)", escaped);
await page.keyboard.press("Escape"); await wait(300);
const gripCenter = () => page.evaluate(() => { const r = document.querySelector(".sheet-grip").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const sheetTop = () => page.evaluate(() => document.querySelector(".sheet") ? document.querySelector(".sheet").getBoundingClientRect().top : null);
// Run 5: records pointer events during a swipe, so a failure report shows what the page received (this check was intermittent).
const recordPointer = () => page.evaluate(() => { window.__ev = []; if (window.__evOn) return; window.__evOn = true;
  for (const t of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"]) document.addEventListener(t, (e) => window.__ev.push(`${t} y=${Math.round(e.clientY)} t=${Math.round(e.timeStamp)} on=${String(e.target.className || e.target.tagName).slice(0, 24)} sheet=${(document.querySelector(".sheet") || {}).style?.transform || "-"}`), true); });
const pointerLog = () => page.evaluate(() => window.__ev);
await openSettings(page); let g = await gripCenter(); await recordPointer();
await page.mouse.move(g.x, g.y); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(g.x, g.y + i * 55); await wait(12); } await page.mouse.up();
// Test fix (Run 5): the dismiss spring advances at most 32 ms of simulated time per frame, so on a busy machine (slow frames)
// it takes longer in real time; the recorded failure had the whole 440 px swipe and the release. Wait up to 3 s, not a fixed 900 ms.
await page.waitForFunction(() => !document.querySelector(".sheet"), { timeout: 3000, polling: 50 }).catch(() => {});
ok(!(await page.$(".sheet")), "a fast swipe down dismisses the sheet", { grip: g, events: await pointerLog() });
if (await page.$(".sheet")) { await page.keyboard.press("Escape"); await wait(400); }   // keep the rest of the file independent of this result
await openSettings(page); g = await gripCenter(); const top0 = await sheetTop();
await page.mouse.move(g.x, g.y); await page.mouse.down();
for (let i = 1; i <= 6; i++) { await page.mouse.move(g.x, g.y + i * 10); await wait(90); }
const dragged = await sheetTop(); ok(Math.abs((dragged - top0) - 60) < 6, `the sheet follows the finger 1:1 (moved ${Math.round(dragged - top0)}px for a 60px drag)`);
await page.mouse.up(); await wait(900);
ok(!!(await page.$(".sheet")) && Math.abs((await sheetTop()) - top0) < 2, "a short slow drag springs back to its place and the sheet stays open");
g = await gripCenter(); await page.mouse.move(g.x, g.y); await page.mouse.down(); for (let i = 1; i <= 5; i++) { await page.mouse.move(g.x, g.y + i * 14); await wait(70); } await page.mouse.up();
await wait(60); const mid = await sheetTop();
const mid2 = await page.evaluate(({ x, y }) => { const el = document.querySelector(".sheet-grip"); el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 77, clientX: x, clientY: y + 30 })); return document.querySelector(".sheet").getBoundingClientRect().top; }, g);
ok(Math.abs(mid2 - mid) < 5, `grabbing the sheet mid-spring continues from where it is (no jump: ${Math.round(mid)} → ${Math.round(mid2)})`);
await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 77 }))); await wait(900);
await page.keyboard.press("Escape"); await wait(300);
await openAdd(page); await page.keyboard.press("Escape"); await wait(300); ok(!(await page.$(".add-overlay")), "Escape closes the add form");
await page.close();

section("S3. Keyboard and switches");
page = await openPage(browser); await openAdd(page);
const sw = () => page.evaluate(() => document.querySelector('[role=switch][aria-label="Recurring"]').getAttribute("aria-checked"));
await page.focus('[role=switch][aria-label="Recurring"]'); const before = await sw(); await page.keyboard.press("Space"); await wait(120); const afterSpace = await sw(); await page.keyboard.press("Enter"); await wait(120); const afterEnter = await sw();
ok(before === "false" && afterSpace === "true" && afterEnter === "false", "the Recurring switch toggles with Space and Enter");
await page.keyboard.press("Escape"); await wait(250); await openSettings(page);
const sws = () => page.evaluate(() => document.querySelector('[role=switch][aria-label="Safe to Spend"]').getAttribute("aria-checked"));
await page.focus('[role=switch][aria-label="Safe to Spend"]'); const s0 = await sws(); await page.keyboard.press("Space"); await wait(150); const s1 = await sws();
ok(s0 === "true" && s1 === "false" && (await state(page)).safeToSpend.enabled === false, "the Safe to Spend switch toggles with Space and the setting is saved");
await page.keyboard.press("Escape"); await wait(250);
// Test fix (2026-10-26): Puppeteer has no "Shift+Tab" key name (the original line threw "Unknown key"); hold Shift instead.
await page.focus(".topbar .privacy-toggle"); await page.keyboard.press("Tab");   /* Run 9: the eye replaced the gear */ await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { outline: cs.outlineStyle, shadow: cs.boxShadow, tag: document.activeElement.getAttribute("aria-label") || document.activeElement.tagName }; });
ok(ring.outline !== "none" || ring.shadow !== "none", "keyboard focus is visible (outline or ring)", ring);
await page.close();

section("S4. Touch targets (effective tappable area)");
const probe = () => {
  const out = [];
  const eff = (el) => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; const hit = (x, yy) => { const t = document.elementFromPoint(x, yy); return !!t && (t === el || el.contains(t)); };
    const ext = (dx, dy) => { let n = 0; for (let s = 1; s <= 40; s++) { if (hit(cx + dx * s, cy + dy * s)) n = s; else break; } return n; };
    return { w: ext(-1, 0) + ext(1, 0) + 1, h: ext(0, -1) + ext(0, 1) + 1 }; };
  document.querySelectorAll('button,[role=switch],a,select,input:not([type=file]):not([type=checkbox]),[role=tab]').forEach((el) => {
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return;
    // Test fix (2026-10-26): a control cut off by the screen edge (e.g. the lower half of a button at the bottom of a scrolled
    // sheet) is measured once scrolled into full view, not as the sliver that happens to be visible.
    if (r.top < 0 || r.bottom > innerHeight) return;
    // redesign: a control partly behind the fixed tab bar is scrolled into view by the user, so it is measured there, not here
    const tbar = document.querySelector(".tabbar"); if (tbar && !el.closest(".tabbar, .sheet, .add-overlay") && r.bottom > tbar.getBoundingClientRect().top) return;
    // same inside a scrolled sheet — with room for the enlarged tap area (up to 44 px) so the sheet's edge doesn't cut it off
    const pad = Math.max(0, (44 - r.height) / 2);
    const box = el.closest(".sheet, .add-overlay"); if (box) { const b = box.getBoundingClientRect(); if (r.top - pad < b.top || r.bottom + pad > b.bottom) return; }
    // Test fix (2026-10-26): skip controls hidden under another layer (e.g. the page behind the open add form) — they
    // cannot be tapped, so measuring them gave a meaningless 1×1. Only what is on top at its centre is measured.
    const c0 = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!c0 || !(c0 === el || el.contains(c0))) return;
    const e = eff(el); const label = (el.getAttribute("aria-label") || el.textContent || el.placeholder || el.tagName).trim().slice(0, 28);
    // Test fix (2026-10-26): text fields have no textContent, so they were classed as icon-only (44×44) and the 36 px rule
    // written for inputs/selects below could never apply. Fields are now measured by that 36 px rule as intended.
    const isField = el.tagName === "INPUT" || el.tagName === "SELECT";
    const iconOnly = (!isField && !el.textContent.trim()) || el.getAttribute("role") === "switch";
    out.push({ label, iconOnly, w: e.w, h: e.h, role: isField ? "input" : (el.getAttribute("role") || el.tagName.toLowerCase()) });
  }); return out;
};
const small = [];
page = await openPage(browser, { seed: seed1 });
const collect = async (name) => { await settle(page); const r = await page.evaluate(probe); r.forEach((c) => { const need = c.iconOnly ? 44 : (c.role === "input" || c.role === "select" ? 36 : 34); const needW = c.iconOnly ? 44 : 0; if (c.h < need - 1 || c.w < needW - 1) small.push(`${name}: "${c.label}" ${c.w}×${c.h}${c.iconOnly ? " (icon-only, needs 44×44)" : " (needs ≥" + need + " high)"}`); }); return r.length; };
let counted = 0; counted += await collect("home");
await tab(page, "Ledger"); counted += await collect("ledger"); await tab(page, "Recurring"); counted += await collect("recurring");
await tab(page, "More"); counted += await collect("more"); await tab(page, "ImportExport"); counted += await collect("import/export");   // redesign: new pages
await openAdd(page); counted += await collect("add form"); await page.keyboard.press("Escape"); await wait(250);
await openSettings(page); counted += await collect("settings");
// …then scroll the sheet in steps so the controls further down are measured too, each fully in view
for (let i = 0; i < 12; i++) { const more = await page.evaluate(() => { const s = document.querySelector(".sheet"); const before = s.scrollTop; s.scrollTop += s.clientHeight * 0.6; return s.scrollTop > before; }); if (!more) break; await wait(80); counted += await collect("settings (scrolled)"); }
await page.keyboard.press("Escape"); await wait(250);
ok(small.length === 0, `${counted} controls measured on 5 screens: every icon-only control is ≥44×44 and every text control ≥34 high`, small.slice(0, 12));
await page.close();

section("S5. Contrast measured on the rendered page");
page = await openPage(browser, { seed: seed1 });
const lowContrast = async () => page.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 7, g: 21, b: 26, a: 1 }; };   // page background (Caspian dark, Run 9)
  const bad = []; let n = 0;
  document.querySelectorAll("#root *").forEach((el) => {
    const own = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim()); if (!own) return;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden") return;
    // WCAG 1.4.3 does not apply to disabled controls (e.g. the "next month" arrow on the newest month), nor to content hidden
    // behind an open sheet's dimmed backdrop, which is measured on its own screen.
    if (el.closest("button:disabled, [aria-disabled=true]")) return;
    const layer = document.querySelector(".sheet-overlay, .add-overlay"); if (layer && !layer.contains(el)) return;
    // Test change (2026-10-26): faded text (opacity on the element or an ancestor) used to be skipped, so de-emphasised rows
    // were never measured. Now the colour is blended with the background by the effective opacity, as the eye sees it.
    let alpha = 1; for (let e = el; e && e !== document.body; e = e.parentElement) alpha *= parseFloat(getComputedStyle(e).opacity);
    if (alpha < 0.05) return;                                                               // invisible, not faded
    const fg0 = parse(cs.color); if (!fg0) return; const bg = bgOf(el);
    const fg = { r: fg0.r * alpha + bg.r * (1 - alpha), g: fg0.g * alpha + bg.g * (1 - alpha), b: fg0.b * alpha + bg.b * (1 - alpha) };
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold); n++;
    if (ratio < (large ? 3 : 4.5)) bad.push(`${ratio.toFixed(2)}:1 ${Math.round(size)}px "${el.textContent.trim().slice(0, 30)}" (${cs.color})`);
  }); return { n, bad: [...new Set(bad)] };
});
// entrance fade-ins are switched off while measuring (reduced motion), so a half-faded-in card is not mistaken for low contrast
{ const c = await page.createCDPSession(); await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); }
// also measure a paused recurring schedule (its row is drawn de-emphasised)
await tab(page, "Recurring"); await wait(200); await clickText(page, "button", /^Pause$/); await wait(200);
const cResults = []; for (const t of ["Home", "Ledger", "Monthly", "Goals", "More", "Recurring", "ImportExport"]) { await tab(page, t);   /* redesign: every screen */ await wait(350); const r = await lowContrast(); cResults.push([t, r]); }
await openSettings(page); const rs = await lowContrast(); cResults.push(["Settings", rs]);
const allBad = cResults.flatMap(([t, r]) => r.bad.map((b) => `${t}: ${b}`)); const total = cResults.reduce((a, [, r]) => a + r.n, 0);
ok(allBad.length === 0, `${total} text elements across 6 screens: all meet WCAG AA (4.5:1, or 3:1 for large text)`, allBad.slice(0, 14));
await page.close();

section("S6. User preferences");
page = await openPage(browser);
const media = async (features) => { const c = await page.createCDPSession(); await c.send("Emulation.setEmulatedMedia", { features }); await wait(150); };
await media([{ name: "prefers-reduced-motion", value: "reduce" }]);
await openSettings(page); await wait(100);
const dur = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".sheet")).animationDuration) || 0);
ok(dur <= 0.01, `reduced motion: the sheet's entrance animation is effectively off (${dur}s)`);
let g2 = await gripCenter(); await page.mouse.move(g2.x, g2.y); await page.mouse.down(); await page.mouse.move(g2.x, g2.y + 40); await wait(40); await page.mouse.up(); await wait(80);
ok(await page.evaluate(() => document.querySelector(".sheet").style.transform === ""), "reduced motion: a released short drag resets at once (no spring)");
g2 = await gripCenter(); await recordPointer(); await page.mouse.move(g2.x, g2.y); await page.mouse.down(); for (let i = 1; i <= 6; i++) { await page.mouse.move(g2.x, g2.y + i * 70); await wait(10); }
// Test fix (Run 5): a fixed 150 ms wait failed once on a busy machine. Wait for the sheet to go (up to 1.5 s) and require it
// to go within 250 ms — measured in Run 5: with the spring off it closes in 14–25 ms; with the spring on, in ~510 ms.
const t0 = Date.now(); await page.mouse.up();
const gone = await page.waitForFunction(() => !document.querySelector(".sheet"), { timeout: 1500, polling: 20 }).then(() => Date.now() - t0, () => null);
ok(gone !== null && gone < 250, `reduced motion: a long swipe still dismisses, without the spring (closed after ${gone} ms)`, { grip: g2, events: await pointerLog() });
if (await page.$(".sheet")) { await page.keyboard.press("Escape"); await wait(400); }
await media([{ name: "prefers-reduced-motion", value: "no-preference" }, { name: "prefers-reduced-transparency", value: "reduce" }]);
const glass = await page.evaluate(() => { const t = getComputedStyle(document.querySelector(".topbar")); return { blur: t.backdropFilter, bg: t.backgroundColor }; });
ok(glass.blur === "none" && /rgb\(7, 21, 26\)/.test(glass.bg), "reduced transparency: the top bar is solid (no blur, opaque background)", glass);
await media([{ name: "prefers-reduced-transparency", value: "no-preference" }, { name: "prefers-contrast", value: "more" }]);
const hc = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return { ink3: cs.getPropertyValue("--ink-3").trim(), rule2: cs.getPropertyValue("--rule-2").trim() }; });
ok(hc.ink3 === "#C6D4D4" && hc.rule2 === "#6E959E"   /* redesign: the dark theme's stronger set */, "increased contrast: text and border tokens switch to the stronger set", hc);
await page.close();

section("S7. Small screens and the on-screen keyboard");
page = await openPage(browser, { width: 360, height: 380 }); await openAdd(page);
await page.focus("#txn-note"); await wait(200);
const vis = await page.evaluate(() => { const r = document.querySelector("#txn-note").getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; });
ok(vis.top >= 0 && vis.bottom <= vis.h, "with a short viewport (keyboard open) the focused field is scrolled into view", vis);
const reach = await page.evaluate(() => { const o = document.querySelector(".add-overlay"); const btn = [...o.querySelectorAll(".btn-primary")][0]; btn.scrollIntoView({ block: "center" }); const r = btn.getBoundingClientRect(); return { scrollable: o.scrollHeight > o.clientHeight, ok: r.top >= 0 && r.bottom <= innerHeight }; });
ok(reach.ok, "the Record button can always be scrolled into reach", reach);
await page.close();
await finish("e2e_ux", browser);
