// Interface language in the real bundled app (2026-10-26): first-launch chooser, persistence, the Settings switch,
// data untouched by switching, untranslated leftovers on every screen, locale dates, and narrow layouts in all languages.
import { openSafe, launch, openPage, state, toast, clickText, setInput, openSettings, openAdd, openGoals, tab, wait, ok, section, finish, tx, baseSeed, KEY, fs, path } from "./lib.mjs";
import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(here, "..", "evidence", "screens-lang"); fs.mkdirSync(shots, { recursive: true });
// The catalog itself, read from the candidate's i18n.js (the same file the page was built from).
const i18nSrc = fs.readFileSync(path.join(path.dirname(process.env.CANDIDATE), "i18n.js"), "utf8");
const { MESSAGES } = await import("data:text/javascript;base64," + Buffer.from(i18nSrc).toString("base64"));
const browser = await launch();
const NAMES = { az: "Azərbaycan dili", en: "English", ru: "Русский" };
const radios = (page) => page.evaluate(() => [...document.querySelectorAll(".lang-opt input")].map((r) => ({ v: r.value, checked: r.checked, label: r.closest("label").innerText.trim() })));
const contDisabled = (page) => page.evaluate(() => document.querySelector(".lang-continue").disabled);
const tabs = (page) => page.evaluate(() => [...document.querySelectorAll(".tab-lbl")].map((x) => x.textContent.trim()));   // CSS upper-cases innerText

section("F1. First launch: chooser before anything else, nothing preselected, Continue disabled");
let page = await openPage(browser, { fresh: true, seed: null, chooseLang: false });
ok(!!(await page.$(".lang-screen")) && !(await page.$(".tabbar")), "a fresh install shows the language chooser, not the app");
let r = await radios(page);
ok(r.length === 3 && r.map((x) => x.v).join() === "az,en,ru" && r.every((x) => x.label === NAMES[x.v]), "three choices with native names: Azərbaycan dili · English · Русский", r);
ok(r.every((x) => !x.checked), "no language is preselected");
ok(await contDisabled(page), "Continue is disabled until a choice is made");
const looks = await page.evaluate(() => { const o = [...document.querySelectorAll(".lang-opt")]; const cs = o.map((e) => getComputedStyle(e)); return { fs: [...new Set(cs.map((c) => c.fontSize))], fw: [...new Set(cs.map((c) => c.fontWeight))], h: o.map((e) => Math.round(e.getBoundingClientRect().height)), w: [...new Set(o.map((e) => Math.round(e.getBoundingClientRect().width)))] }; });
ok(looks.fs.length === 1 && looks.fw.length === 1 && looks.w.length === 1 && Math.max(...looks.h) - Math.min(...looks.h) <= 1 && Math.min(...looks.h) >= 44, "the three options are equally prominent (same size, weight, width and height ≥ 44 px)", looks);
ok(await page.evaluate(() => !document.querySelector(".lang-screen img") && !/[\u{1F1E6}-\u{1F1FF}]/u.test(document.querySelector(".lang-screen").innerText)), "no flags (no images or flag emoji)");
const titleTxt = await page.evaluate(() => document.querySelector(".lang-title").innerText);
ok(/Dilinizi seçin/.test(titleTxt) && /Choose your language/.test(titleTxt) && /Выберите язык/.test(titleTxt), "before a choice, the heading is shown in all three languages", titleTxt);
await page.screenshot({ path: path.join(shots, "chooser-390-none.png") });
for (const l of ["az", "en", "ru"]) {
  await page.evaluate((v) => document.querySelector(`.lang-opt input[value="${v}"]`).click(), l); await wait(80);
  r = await radios(page);
  ok(!(await contDisabled(page)) && r.filter((x) => x.checked).map((x) => x.v).join() === l, `selecting ${NAMES[l]} enables Continue and marks only that option`);
}
const selStyle = await page.evaluate(() => { const s = document.querySelector(".lang-opt.sel"), o = document.querySelector(".lang-opt:not(.sel)"); return { sel: getComputedStyle(s).borderColor + "|" + getComputedStyle(s).backgroundColor, other: getComputedStyle(o).borderColor + "|" + getComputedStyle(o).backgroundColor }; });
ok(selStyle.sel !== selStyle.other, "the selected option looks different from the others (border and background)", selStyle);
ok((await page.evaluate(() => document.querySelector(".lang-continue").innerText)) === "Продолжить", "after choosing Русский the Continue button reads 'Продолжить'");
await page.screenshot({ path: path.join(shots, "chooser-390-ru.png") });
// keyboard: Tab reaches the options, arrow keys move the choice, Enter continues
await page.reload(); await page.waitForSelector(".lang-screen");
await page.keyboard.press("Tab"); await wait(50);
let focusInfo = await page.evaluate(() => ({ v: document.activeElement?.value, ring: getComputedStyle(document.activeElement.closest(".lang-opt")).outlineStyle }));
ok(focusInfo.v === "az" && focusInfo.ring !== "none", "keyboard: Tab focuses the first option and a visible focus ring appears", focusInfo);
await page.keyboard.press("ArrowDown"); await wait(50);
r = await radios(page);
ok(r.find((x) => x.checked)?.v === "en" && !(await contDisabled(page)), "keyboard: the arrow key moves the choice to English (native radio behaviour)");
await page.keyboard.press("Enter"); await page.waitForSelector(".tabbar"); await wait(300);
let st = await state(page);
ok(st && st.language === "en" && (await tabs(page))[0] === "Home", "Enter continues; the app opens in English and the choice is saved", st && st.language);
await page.close();

section("F2. The chosen language applies everywhere and survives a reload");
page = await openPage(browser, { fresh: true, seed: null, chooseLang: "ru" });
ok(eq2(await tabs(page), ["Главная", "Операции", "Аналитика", "Цели", "Ещё"]), "choosing Русский: the navigation is in Russian", await tabs(page));
st = await state(page); ok(st.language === "ru" && st.transactions.length === 0, "language 'ru' is stored with the app's settings (expense_ledger_v5), nothing else is created");
ok(eq2(st.templates.map((x) => x.name), ["Автобус / метро", "Manatlıq B-S", "Продукты", "Кофе", "Футбольное поле"]) && st.templates[0].merchant === "BakuBus" && st.templates[0].amount === 0.6, "a new user's starter templates are named in the chosen language (a proper name like 'Manatlıq B-S' and merchants/amounts stay)", st.templates.map((x) => x.name));
ok((await page.evaluate(() => document.documentElement.lang)) === "ru", "the page's lang attribute is 'ru' (screen readers pronounce it correctly)");
await page.reload(); await page.waitForSelector(".tabbar, .lang-screen"); await wait(300);
ok(!(await page.$(".lang-screen")) && (await tabs(page))[0] === "Главная", "after a reload the chooser does not reappear and the app opens in Russian");
await page.close();

section("F3. Existing users are not sent through onboarding");
page = await openPage(browser, { seed: baseSeed(), chooseLang: false });
ok(!(await page.$(".lang-screen")) && (await tabs(page))[0] === "Home", "stored data from before this feature (no language) opens directly in English, as before");
await page.close();
page = await openPage(browser, { seed: baseSeed({ language: "az" }), chooseLang: false });
ok(!(await page.$(".lang-screen")) && (await tabs(page))[0] === "Ana səhifə", "a saved Azerbaijani preference opens directly in Azerbaijani");
ok((await state(page)).templates[0].name === "Bus", "an existing user's templates are never renamed");
await page.close();

section("F4. Switching in Settings: everything changes at once, nothing else does");
page = await openPage(browser, { seed: baseSeed() });
const before = await state(page);
await openSettings(page);
await page.evaluate(() => [...document.querySelectorAll(".sheet .btn-sm")].filter((b) => /\+ Add/.test(b.textContent)).pop().click()); await wait(200);
// Redesign: goals moved to their own page; the half-filled form in Settings is now the quick-add template form.
const goalField = () => document.querySelector("#tpl-name"), targetField = () => document.querySelector("#tpl-amt");
await setInput(page, goalField, "Laptop"); await setInput(page, targetField, "1500");
for (const [l, title, tab0] of [["az", "Parametrlər", "Ana səhifə"], ["ru", "Настройки", "Главная"], ["en", "Settings", "Home"]]) {
  await page.evaluate((v) => document.querySelector(`.lang-pill input[value="${v}"]`).click(), l); await wait(250);
  const s = await page.evaluate(() => ({ open: !!document.querySelector(".sheet"), title: document.querySelector(".sheet-title")?.innerText, goal: document.querySelector("#tpl-name")?.value, target: document.querySelector("#tpl-amt")?.value }));
  ok(s.open && s.title === title && (await tabs(page))[0] === tab0, `switch to ${NAMES[l]}: Settings stays open and the whole interface changes (${s.title})`, s);
  ok(s.goal === "Laptop" && s.target === "1500", `…the half-filled template form keeps what was typed`, s);
  st = await state(page);
  ok(st.language === l && eq2(st.transactions, before.transactions) && st.currency === before.currency && eq2(st.budgets, before.budgets) && eq2(st.goals, before.goals) && eq2(st.safeToSpend, before.safeToSpend), `…only the language changed in saved data (transactions, ids, amounts, currency, budgets, goals untouched)`);
}
ok(await page.evaluate(() => [...document.querySelectorAll(".lang-pill input")].filter((r) => r.checked).map((r) => r.value).join()) === "en", "the Settings switch shows the current language as selected");
await page.close();

section("F5. No untranslated English on any screen (az and ru)");
// Every English catalog sentence/label (no placeholders, ≥ 2 words or ≥ 6 letters) must be absent from the page in az/ru.
const enTexts = [...new Set(Object.values(MESSAGES).flatMap((e) => typeof e.en === "string" ? [e.en] : Object.values(e.en)))]
  .filter((s) => !/\{\w+\}/.test(s) && (/\s\S/.test(s.trim()) || /[A-Za-z]{6,}/.test(s)) && !["Expense Ledger"].includes(s));
const shared = new Set(Object.values(MESSAGES).filter((e) => ["az", "ru"].some((l) => (typeof e[l] === "string" ? e[l] : Object.values(e[l]).join(" ")) === (typeof e.en === "string" ? e.en : Object.values(e.en).join(" ")))).map((e) => typeof e.en === "string" ? e.en : ""));
const rich = baseSeed({ transactions: [tx({ merchant: "Bravo", amount: 35, subcategory: "Groceries" }), tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer" }), tx({ merchant: "Rent", category: "housing", amount: 450, recurring: true, recurFreq: "monthly" }), tx({ merchant: "Bravo", amount: 20 })], safeToSpend: { enabled: true, savingsTarget: 100 } });
for (const l of ["az", "ru"]) {
  page = await openPage(browser, { seed: { ...rich, language: l } });
  const seen = [];
  // whole-word match, after removing the product name (it stays "Expense Ledger" in every language)
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const check = async (where) => { const txt = (await page.evaluate(() => document.body.innerText)).replaceAll("Expense Ledger", ""); for (const s of enTexts) if (!shared.has(s) && new RegExp(`(^|[^A-Za-z])${esc(s)}($|[^A-Za-z])`).test(txt)) seen.push(`${where}: "${s}"`); };
  await check("Home");
  // redesign: every tab, then the two pages under More
  for (const tb of ["ledger", "monthly", "goals", "more"]) { await page.evaluate((i) => document.querySelectorAll(".tab-btn")[i].click(), ["home", "ledger", "monthly", "goals", "more"].indexOf(tb)); await wait(250); await check(tb); }
  for (const sub of ["Recurring", "ImportExport"]) { await tab(page, sub); await wait(250); await check(sub); }
  await openSettings(page); await check("Settings"); await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(300);
  await openAdd(page); await check("Add form"); await page.evaluate(() => document.querySelector(".add-close").click()); await wait(200);
  ok(seen.length === 0, `${NAMES[l]}: no English interface text on Home, Ledger, Monthly, Recurring, Settings or the add form`, seen.slice(0, 15));
  const aria = await page.evaluate(() => [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")));
  const ariaEn = aria.filter((a) => enTexts.includes(a) && !shared.has(a));
  ok(ariaEn.length === 0, `${NAMES[l]}: accessible names (aria-label) are translated too`, ariaEn);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[0].click()); await wait(300);   // back to Home
  const eyebrow = await page.evaluate(() => document.querySelector(".hero-eyebrow")?.innerText || "");
  ok(l === "ru" ? /[а-я]/i.test(eyebrow) : /oktyabr|noyabr|sentyabr|dekabr|yanvar|fevral|mart|aprel|may|iyun|iyul|avqust/i.test(eyebrow), `${NAMES[l]}: the month name is written in that language ("${eyebrow}")`);
  ok(/\d{1,3}(,\d{3})*\.\d{2} ₼/.test(await page.evaluate(() => document.querySelector(".hero-amount").innerText)), `${NAMES[l]}: amounts keep the 1,234.56 form that matches how amounts are typed (documented decision)`);
  ok(page.errors.length === 0, `${NAMES[l]}: no JavaScript errors`, page.errors[0]);
  await page.close();
}

section("F6. Narrow screens: 320 / 360 / 390 px in all three languages");
// Flags (a) text wider than its own box (clipped or spilling) and (b) elements past the right edge of the screen —
// except inside a deliberately horizontal-scrolling strip (category tiles, filter chips), where that is the design.
const overflowing = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const inScroller = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth) return true; } return false; };
  const out = [];
  for (const e of document.querySelectorAll("button, .tab-lbl, .safe-row, .stat-cell, .hero-stat, .label-sm, .a-card-title, .settings-row, .lang-opt, .lang-pill, .field-lbl, .sheet-title, .add-title, .empty-title, .chip, .cat-filter-btn, .cat-tile-name, .sub-chip")) {
    const b = e.getBoundingClientRect(); if (!b.width) continue;
    // Width of the element's actual contents (text and icons) — not scrollWidth, which also counts the invisible enlarged tap
    // areas (::after) that deliberately extend past small buttons.
    const rg = document.createRange(); rg.selectNodeContents(e); const cw = rg.getBoundingClientRect().width;
    const inner = e.clientWidth - parseFloat(getComputedStyle(e).paddingLeft) - parseFloat(getComputedStyle(e).paddingRight);
    if (cw > inner + 1 && e.scrollWidth > e.clientWidth + 1) out.push(`text wider than box: ${e.className || e.tagName} "${e.innerText.slice(0, 30)}" (${Math.round(cw)}>${Math.round(inner)})`);
    else if (b.right > vw + 1 && !inScroller(e)) out.push(`past screen edge: ${e.className || e.tagName} "${e.innerText.slice(0, 30)}"`);
  }
  return out;
});
// Self-check of the detector: a deliberately clipped label must be reported, a button with an enlarged tap area must not.
page = await openPage(browser, { width: 320, height: 760 });
await page.evaluate(() => { const b = document.createElement("button"); b.className = "probe-clipped"; b.style.cssText = "width:40px;white-space:nowrap;overflow:hidden"; b.textContent = "A label much too long for its box"; document.querySelector(".topbar").appendChild(b); });
const probe = await overflowing(page);
ok(probe.some((x) => /probe-clipped/.test(x)) && !probe.some((x) => /topbar-add|topbar-btn/.test(x)), "the overflow detector catches a clipped label and ignores invisible enlarged tap areas", probe);
await page.close();
for (const l of ["az", "en", "ru"]) for (const w of [320, 360, 390]) {
  const bad = [];
  page = await openPage(browser, { width: w, height: 760, fresh: true, seed: null, chooseLang: false });
  await page.evaluate((v) => document.querySelector(`.lang-opt input[value="${v}"]`).click(), l); await wait(60);
  bad.push(...(await overflowing(page)).map((x) => "chooser " + x));
  if (w === 320) await page.screenshot({ path: path.join(shots, `chooser-320-${l}.png`) });
  await page.close();
  page = await openPage(browser, { width: w, height: 760, seed: { ...rich, language: l } });
  for (const [i, tb] of ["home", "ledger", "monthly", "goals", "more", "recurring", "io"].entries()) {   // redesign: all screens
    if (i < 5) await page.evaluate((k) => document.querySelectorAll(".tab-btn")[k].click(), i); else await tab(page, tb === "io" ? "ImportExport" : "Recurring"); await wait(250);
    if (tb === "home") await openSafe(page);   // Run 9: measure the Safe to Spend rows too (they open on tap now)
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) bad.push(`${tb}: horizontal page scroll`);
    bad.push(...(await overflowing(page)).map((x) => `${tb} ${x}`));
    if (w === 320) await page.screenshot({ path: path.join(shots, `${tb}-320-${l}.png`), fullPage: tb === "home" });
  }
  await openSettings(page); bad.push(...(await overflowing(page)).map((x) => "settings " + x));
  if (w === 320) await page.screenshot({ path: path.join(shots, `settings-320-${l}.png`) });
  await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(300);
  await openAdd(page); bad.push(...(await overflowing(page)).map((x) => "add " + x));
  if (w === 320) await page.screenshot({ path: path.join(shots, `add-320-${l}.png`) });
  const tabFit = await page.evaluate(() => [...document.querySelectorAll(".tab-lbl")].map((e) => ({ t: e.innerText, lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 12)) })));
  ok(bad.length === 0, `${NAMES[l]} @ ${w}px: nothing clipped or overflowing on the chooser, 4 tabs, Settings and the add form`, bad.slice(0, 12));
  await page.close();
}

section("F7. Add form with the keyboard open (short viewport) in Azerbaijani and Russian");
for (const l of ["az", "ru"]) {
  page = await openPage(browser, { width: 320, height: 420, seed: { ...rich, language: l } });
  await openAdd(page);
  await page.focus("#txn-note"); await wait(150);
  const vis = await page.evaluate(() => { const b = document.querySelector("#txn-note").getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: innerHeight }; });
  ok(vis.top >= 0 && vis.bottom <= vis.h, `${NAMES[l]}: the focused note field is visible in a 320×420 viewport`, vis);
  const reach = await page.evaluate(() => { const b = document.querySelector(".add-overlay .btn-primary"); b.scrollIntoView({ block: "nearest" }); const r = b.getBoundingClientRect(); return { ok: r.top >= 0 && r.bottom <= innerHeight, label: b.innerText }; });
  ok(reach.ok && !/Record/.test(reach.label), `${NAMES[l]}: the translated save button ("${reach.label}") can be scrolled into reach`, reach);
  await page.screenshot({ path: path.join(shots, `add-keyboard-320x420-${l}.png`) });
  await page.close();
}
await finish("e2e_lang", browser);
function eq2(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
