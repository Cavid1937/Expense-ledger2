// Run 3 (2026-10-27): master prompt MP-10 in Azerbaijani and Russian — touch targets and text contrast were measured only in
// English (e2e_ux S4/S5). Longer az/ru labels can wrap, shrink or crowd controls, so the same two measurements are repeated
// here per language. The probe and contrast functions are copied unchanged from e2e_ux.mjs S4/S5 (same rules, same
// thresholds: icon-only ≥44×44, text controls ≥34 high, fields ≥36; WCAG AA 4.5:1, 3:1 for large text). Screens are reached
// by tab position and class names, never by English labels.
import { launch, openPage, wait, ok, section, finish, tx, baseSeed, TODAY, ymd, openAdd, openSettings, tab } from "./lib.mjs";
const browser = await launch();
const now = new Date(), monthsBack = (k) => ymd(new Date(now.getFullYear(), now.getMonth() - k, Math.min(now.getDate(), 28)));
const R = (o) => tx({ recurring: true, recurFreq: "monthly", category: "digital", amount: 15, ...o });
const seedFor = (language) => baseSeed({ language, transactions: [tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: TODAY }),
  ...[2, 1, 0].map((k) => R({ merchant: "Rent", category: "housing", amount: 450, date: monthsBack(k), subcategory: "Rent" })), R({ merchant: "Netflix", date: TODAY }),
  tx({ merchant: "Bravo", amount: 31.4 }), tx({ merchant: "BakuBus", amount: 0.6, category: "transport" })] });
const tabAt = async (page, i) => { await page.evaluate((n) => document.querySelectorAll(".tab-btn")[n].click(), i); await wait(350); };
const escape = async (page) => { await page.keyboard.press("Escape"); await wait(250); };

// ── copied from e2e_ux.mjs S4 (unchanged)
const probe = () => {
  const out = [];
  const eff = (el) => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; const hit = (x, yy) => { const t = document.elementFromPoint(x, yy); return !!t && (t === el || el.contains(t)); };
    const ext = (dx, dy) => { let n = 0; for (let s = 1; s <= 40; s++) { if (hit(cx + dx * s, cy + dy * s)) n = s; else break; } return n; };
    return { w: ext(-1, 0) + ext(1, 0) + 1, h: ext(0, -1) + ext(0, 1) + 1 }; };
  document.querySelectorAll('button,[role=switch],a,select,input:not([type=file]):not([type=checkbox]),[role=tab]').forEach((el) => {
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return;
    if (r.top < 0 || r.bottom > innerHeight) return;
    // redesign: a control partly behind the fixed tab bar is scrolled into view by the user, so it is measured there, not here
    const tbar = document.querySelector(".tabbar"); if (tbar && !el.closest(".tabbar, .sheet, .add-overlay") && r.bottom > tbar.getBoundingClientRect().top) return;
    const pad = Math.max(0, (44 - r.height) / 2);
    const box = el.closest(".sheet, .add-overlay"); if (box) { const b = box.getBoundingClientRect(); if (r.top - pad < b.top || r.bottom + pad > b.bottom) return; }
    const c0 = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!c0 || !(c0 === el || el.contains(c0))) return;
    const e = eff(el); const label = (el.getAttribute("aria-label") || el.textContent || el.placeholder || el.tagName).trim().slice(0, 28);
    const isField = el.tagName === "INPUT" || el.tagName === "SELECT";
    const iconOnly = (!isField && !el.textContent.trim()) || el.getAttribute("role") === "switch";
    out.push({ label, iconOnly, w: e.w, h: e.h, role: isField ? "input" : (el.getAttribute("role") || el.tagName.toLowerCase()) });
  }); return out;
};
// ── copied from e2e_ux.mjs S5 (unchanged)
const contrast = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 7, g: 21, b: 26, a: 1 }; };   // page background (Caspian dark, Run 9)
  const bad = []; let n = 0;
  document.querySelectorAll("#root *").forEach((el) => {
    const own = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim()); if (!own) return;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden") return;
    if (el.closest("button:disabled, [aria-disabled=true]")) return;
    const layer = document.querySelector(".sheet-overlay, .add-overlay"); if (layer && !layer.contains(el)) return;
    let alpha = 1; for (let e = el; e && e !== document.body; e = e.parentElement) alpha *= parseFloat(getComputedStyle(e).opacity);
    if (alpha < 0.05) return;
    const fg0 = parse(cs.color); if (!fg0) return; const bg = bgOf(el);
    const fg = { r: fg0.r * alpha + bg.r * (1 - alpha), g: fg0.g * alpha + bg.g * (1 - alpha), b: fg0.b * alpha + bg.b * (1 - alpha) };
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold); n++;
    if (ratio < (large ? 3 : 4.5)) bad.push(`${ratio.toFixed(2)}:1 ${Math.round(size)}px "${el.textContent.trim().slice(0, 30)}" (${cs.color})`);
  }); return { n, bad: [...new Set(bad)] };
};

for (const lang of ["az", "ru"]) {
  section(`${lang.toUpperCase()}. Touch targets and contrast in ${lang === "az" ? "Azerbaijani" : "Russian"} (390×844)`);
  // touch targets: Home, Ledger, Recurring, Add form, Settings (scrolled) — as e2e_ux S4
  let page = await openPage(browser, { seed: seedFor(lang) });
  const shown = await page.evaluate(() => document.documentElement.lang);
  ok(shown === lang, `the interface is in ${lang} (html lang="${shown}")`);
  const small = []; let counted = 0;
  const collect = async (name) => { const r = await page.evaluate(probe); r.forEach((c) => { const need = c.iconOnly ? 44 : (c.role === "input" || c.role === "select" ? 36 : 34); const needW = c.iconOnly ? 44 : 0; if (c.h < need - 1 || c.w < needW - 1) small.push(`${name}: "${c.label}" ${c.w}×${c.h}${c.iconOnly ? " (icon-only, needs 44×44)" : " (needs ≥" + need + " high)"}`); }); return r.length; };
  counted += await collect("home");
  await tabAt(page, 1); counted += await collect("ledger"); await tabAt(page, 3); counted += await collect("goals"); await tab(page, "Recurring"); counted += await collect("recurring");
  await openAdd(page); counted += await collect("add form"); await escape(page);
  await openSettings(page); counted += await collect("settings");
  for (let i = 0; i < 12; i++) { const more = await page.evaluate(() => { const s = document.querySelector(".sheet"); const before = s.scrollTop; s.scrollTop += s.clientHeight * 0.6; return s.scrollTop > before; }); if (!more) break; await wait(80); counted += await collect("settings (scrolled)"); }
  await escape(page);
  ok(small.length === 0, `${lang}: ${counted} controls measured on 6 screens — icon-only ≥44×44, text controls ≥34 high, fields ≥36`, small.slice(0, 12));
  ok(page.errors.length === 0, `${lang}: no JavaScript errors`, page.errors[0]);
  await page.close();
  // contrast: all four sections + Settings — as e2e_ux S5 (animations off while measuring)
  page = await openPage(browser, { seed: seedFor(lang) });
  { const c = await page.createCDPSession(); await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); }
  const res = []; for (let i = 0; i < 5; i++) { await tabAt(page, i); res.push([`tab ${i + 1}`, await page.evaluate(contrast)]); }
  for (const sub of ["Recurring", "ImportExport"]) { await tab(page, sub); await wait(300); res.push([sub, await page.evaluate(contrast)]); }   // redesign: pages under More
  await openSettings(page); res.push(["settings", await page.evaluate(contrast)]);
  const bad = res.flatMap(([t, r]) => r.bad.map((b) => `${t}: ${b}`)), total = res.reduce((a, [, r]) => a + r.n, 0);
  ok(total > 100 && bad.length === 0, `${lang}: ${total} text elements across ${res.length} screens meet WCAG AA (4.5:1, or 3:1 for large text)`, bad.slice(0, 14));
  await page.close();
}
await finish("e2e_ux_lang", browser);
