// Run 9 (2026-10-27 evening) in the real bundled app: placeholder contrast (the Add form's empty "0.00" was ≈1.4:1),
// header actions, privacy mode, linking an existing expense to a recurring bill. Written before each fix.
import { openSafe, launch, openPage, state, clickText, openAdd, tab, wait, ok, section, finish, tx, baseSeed, settle, fs, path } from "./lib.mjs";
const browser = await launch();
const LANGS = ["en", "az", "ru"];

// Contrast of every placeholder against the field's own background (WCAG 1.4.3 does not strictly cover placeholders, but the
// empty amount "0.00" is read as the value, so it is held to 4.5:1 like text).
const placeholderContrast = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 0, g: 0, b: 0, a: 1 }; };
  return [...document.querySelectorAll("input[placeholder], textarea[placeholder]")].filter((el) => el.getBoundingClientRect().width > 0 && el.placeholder).map((el) => {
    const fg = parse(getComputedStyle(el, "::placeholder").color), bg = bgOf(el); const L1 = lum(fg), L2 = lum(bg);
    return { ph: el.placeholder.slice(0, 20), ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100 };
  });
};

section("R9-1. Placeholders are readable (Add form and Ledger search)");
for (const l of LANGS) {
  const page = await openPage(browser, { seed: { ...baseSeed(), language: l }, chooseLang: l });
  await openAdd(page); const add = await page.evaluate(placeholderContrast);
  await page.keyboard.press("Escape"); await wait(300); await tab(page, "Ledger"); const led = await page.evaluate(placeholderContrast);
  const all = [...add, ...led], low = all.filter((x) => x.ratio < 4.5);
  ok(all.length >= 4 && low.length === 0, `${l}: ${all.length} placeholders, all ≥ 4.5:1 (the empty amount "0.00" included)`, low);
  await page.close();
}

// ── Synthetic data with distinctive names and amounts, so a leak is easy to spot ────────────────────────────────────────
const d = new Date(), pad = (n) => String(n).padStart(2, "0"), ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const SECRET = { names: ["Qwertymart", "Zebrafone", "Acmecorp", "Yachtfund", "Secretnote"] };
const seed9 = (lang) => baseSeed({ language: lang, transactions: [
  tx({ merchant: "Qwertymart", amount: 1234.56, category: "food", note: "Secretnote" }),
  tx({ merchant: "Zebrafone", amount: 77.77, category: "digital", recurring: true, recurFreq: "monthly", date: `${ym(-2)}-05` }),
  tx({ merchant: "Zebrafone", amount: 77.77, category: "digital", recurring: true, recurFreq: "monthly", date: `${ym(-1)}-05` }),
  tx({ type: "income", category: "salary", merchant: "Acmecorp", amount: 3210.98, date: `${ym(0)}-01` }),
  tx({ merchant: "Qwertymart", amount: 45.67, category: "food", date: `${ym(-1)}-12` })],
  budgets: { food: 2222.22 }, goals: [{ id: "g9", name: "Yachtfund", target: 9876.54, saved: 1111.11, monthlyTarget: 100, targetDate: null }] });
// Everything a screen exposes as text: visible text, accessible names and tooltips.
const exposed = (page) => page.evaluate(() => [document.body.innerText, ...[...document.querySelectorAll("[aria-label],[title],[alt]")].map((e) => [e.getAttribute("aria-label"), e.getAttribute("title"), e.getAttribute("alt")].filter(Boolean).join(" "))].join("\n"));
const leaks = (txt) => { const out = []; for (const n of SECRET.names) if (txt.includes(n)) out.push(n);
  // "×4.33" in the Recurring explanation is a fixed factor, not data
  const money = txt.match(/(?<![×\d.,])\d[\d,]*\.\d{2}/g); if (money) out.push(...new Set(money)); const pct = txt.match(/\d+\s?%/g); if (pct) out.push(...new Set(pct)); return out; };
const eyeBtn = (page) => page.$(".topbar .privacy-toggle");
const togglePrivacy = async (page) => { await (await eyeBtn(page)).click(); await wait(250); };
const goSettings = async (page) => { await tab(page, "More"); await page.evaluate(() => document.querySelectorAll(".more-page .list-row")[2].click()); await page.waitForSelector(".sheet"); await wait(350); };
const closeSheet = async (page) => { await page.evaluate(() => { const o = document.querySelectorAll(".sheet-overlay"); o[o.length - 1]?.click(); }); await wait(350); };

section("R9-2. Header: no Settings gear anywhere; the + matches the screen");
{
  const page = await openPage(browser, { seed: seed9("en") });
  const head = () => page.evaluate(() => ({ gear: !!document.querySelector('.topbar [aria-label="Settings"]'), eye: !!document.querySelector(".topbar .privacy-toggle"),
    add: document.querySelector(".topbar .topbar-add")?.getAttribute("aria-label") || null }));
  const seen = {};
  for (const s of ["Home", "Ledger", "Monthly", "Goals", "More", "Recurring", "ImportExport"]) { await tab(page, s); await wait(200); seen[s] = await head(); }
  ok(Object.values(seen).every((h) => !h.gear && h.eye), "no screen has a Settings gear in its title bar; every screen has the privacy eye there", seen);
  ok(seen.Home.add === "Add transaction" && seen.Ledger.add === "Add transaction" && seen.Monthly.add === null && seen.More.add === null && seen.ImportExport.add === null,
    "+ adds a transaction on Home and Transactions; Analytics, More and Import / Export have no +", seen);
  ok(seen.Goals.add === "Add budget" && seen.Recurring.add === "Add bill", "Budgets & Goals: '+' = Add budget; Recurring: '+' = Add bill (Run 12: bills are their own records)", { goals: seen.Goals.add, rec: seen.Recurring.add });
  await tab(page, "Recurring"); await (await page.$(".topbar .topbar-add")).click(); await page.waitForSelector(".bill-sheet"); await wait(350);
  const billForm = await page.evaluate(() => /Add bill/.test(document.querySelector(".bill-sheet .sheet-title")?.innerText || "") && !!document.querySelector("#bill-name") && !!document.querySelector("#bill-date"));
  ok(billForm, "Recurring '+' opens the bill form (name, amount, how often, due date)");
  await page.keyboard.press("Escape"); await wait(350);
  await tab(page, "Goals"); await page.evaluate(() => document.querySelectorAll(".goals-page .seg-btn")[1].click()); await wait(200);
  const gAdd = await page.evaluate(() => document.querySelector(".topbar .topbar-add")?.getAttribute("aria-label"));
  await (await page.$(".topbar .topbar-add")).click(); await wait(300);
  ok(gAdd === "Add goal" && !!(await page.$("#goal-name")), "on the Goals segment '+' = Add goal and opens the new-goal form", gAdd);
  await page.evaluate(() => document.querySelectorAll(".goals-page .seg-btn")[0].click()); await wait(200);
  await (await page.$(".topbar .topbar-add")).click(); await wait(300);
  ok(!!(await page.$(".goals-page .new-budget select")) && !!(await page.$(".goals-page .new-budget input")), "on the Budgets segment '+' opens a 'new budget' form (category + monthly limit)");
  await goSettings(page);
  ok(!!(await page.$('.sheet[aria-label="Settings"]')), "Settings opens from More → Settings");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R9-3. Privacy mode hides amounts, names and chart values on every screen (en / az / ru)");
for (const l of LANGS) {
  const page = await openPage(browser, { seed: seed9(l), chooseLang: l });
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const visibleBefore = leaks(await exposed(page));
  const lbl0 = await page.evaluate(() => [document.querySelector(".topbar .privacy-toggle").getAttribute("aria-label"), document.querySelector(".topbar .privacy-toggle").getAttribute("aria-pressed")]);
  await togglePrivacy(page);
  const lbl1 = await page.evaluate(() => [document.querySelector(".topbar .privacy-toggle").getAttribute("aria-label"), document.querySelector(".topbar .privacy-toggle").getAttribute("aria-pressed")]);
  ok(visibleBefore.length > 0 && lbl0[1] === "false" && lbl1[1] === "true" && lbl0[0] !== lbl1[0], `${l}: the eye button says what it will do and reports its state (aria-pressed)`, { lbl0, lbl1 });
  const bad = {};
  const check = async (name) => { const lk = leaks(await exposed(page)); if (lk.length) bad[name] = lk; };
  await check("home");
  for (const s of ["Ledger", "Monthly", "Goals", "More", "Recurring", "ImportExport"]) { await tab(page, s); await wait(250); await check(s); }
  await tab(page, "Goals"); await page.evaluate(() => document.querySelectorAll(".goals-page .seg-btn")[1].click()); await wait(200); await check("goals-seg");
  await tab(page, "Ledger"); await page.evaluate(() => document.querySelector(".txn-row").click()); await page.waitForSelector(".sheet"); await wait(300); await check("detail"); await closeSheet(page);
  await goSettings(page); await check("settings"); await closeSheet(page);
  ok(Object.keys(bad).length === 0, `${l}: with privacy on, no amount, percentage, merchant, note or goal name is shown or read out on 10 screens`, bad);
  await tab(page, "Home"); await wait(200);
  const blur = await page.evaluate(() => ({ donut: getComputedStyle(document.querySelector(".donut svg")).filter, pressed: document.querySelector(".topbar .privacy-toggle").getAttribute("aria-pressed") }));
  ok(/blur/.test(blur.donut) && blur.pressed === "true", `${l}: the spending ring is blurred and privacy is still on after visiting every screen`, blur);
  const navOk = await page.evaluate(() => [...document.querySelectorAll(".tab-lbl")].every((e) => e.innerText.trim().length > 1 && getComputedStyle(e).filter === "none"));
  ok(navOk, `${l}: tab labels stay readable (navigation is not blurred)`);
  ok((await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))) === before, `${l}: turning privacy on writes nothing to storage (ledger data untouched)`);
  await togglePrivacy(page);
  ok(leaks(await exposed(page)).some((x) => /\d/.test(x)), `${l}: turning it off shows the amounts again`);
  await togglePrivacy(page); await page.reload(); await page.waitForSelector(".tabbar"); await wait(400);
  ok((await page.evaluate(() => document.querySelector(".topbar .privacy-toggle").getAttribute("aria-pressed"))) === "false", `${l}: privacy is for this session only — after a reload it is off`);
  ok(page.errors.length === 0, `${l}: no JavaScript errors`, page.errors[0]);
  await page.close();
}

section("R9-4. A rent paid as an ordinary expense is linked to the bill only when the user says so");
{
  // Rent 800 on the 1st of the last two months (a monthly bill); this month it was paid as an ordinary expense "Rent".
  const rentPaid = tx({ merchant: "Rent", amount: 800, category: "housing" });
  const page = await openPage(browser, { seed: baseSeed({ transactions: [
    tx({ merchant: "Rent", amount: 800, category: "housing", recurring: true, recurFreq: "monthly", date: `${ym(-2)}-01` }),
    tx({ merchant: "Rent", amount: 800, category: "housing", recurring: true, recurFreq: "monthly", date: `${ym(-1)}-01` }),
    tx({ type: "income", category: "salary", amount: 3000, merchant: "Employer", date: `${ym(0)}-01` }),
    tx({ type: "income", category: "salary", amount: 3000, merchant: "Employer", recurring: true, recurFreq: "monthly", date: `${ym(-1)}-01` }),
    rentPaid], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } }) });
  const safe = async () => { await openSafe(page); return page.evaluate(() => { const r = [...document.querySelectorAll(".safe-row")].map((e) => e.innerText.replace(/\s+/g, " ")); return { upcoming: r.find((x) => /Upcoming/.test(x)) || "", left: r.find((x) => /Discretionary/.test(x)) || "" }; }); };
  const s0 = await safe();
  ok(/−800\.00/.test(s0.upcoming) && /\+1,400\.00/.test(s0.left), "before: this month's rent is still set aside (−800) although 800 was spent on 'Rent' — the double count the user can't see", s0);
  ok((await state(page)).transactions.find((t) => t.id === rentPaid.id).recurring === false, "nothing was linked automatically (same merchant and amount are not enough)");
  await tab(page, "Ledger"); await page.evaluate((id) => [...document.querySelectorAll(".txn-row")].find((r) => /Today/.test(r.innerText) && /Rent/.test(r.innerText)).click(), rentPaid.id);
  await page.waitForSelector(".sheet"); await wait(350);
  await clickText(page, ".sheet button", /payment of a recurring bill/i); await wait(300);
  const choices = await page.evaluate(() => [...document.querySelectorAll(".sheet .link-bill-option")].map((b) => b.innerText.replace(/\s+/g, " ")));
  ok(choices.length === 1 && /Rent/.test(choices[0]) && /800\.00/.test(choices[0]) && /monthly/i.test(choices[0]), "the user is offered the matching kind of bill only (expense bills, not the salary schedule) and sees which one", choices);
  await clickText(page, ".sheet .link-bill-option", /Rent/); await wait(400);
  const t1 = (await state(page)).transactions.find((t) => t.id === rentPaid.id);
  ok(t1.recurring === true && t1.recurFreq === "monthly" && t1.amount === 800 && t1.date === rentPaid.date && t1.category === "housing", "after choosing the bill: the expense is now that bill's payment (recurring, monthly); amount, date and id are unchanged", t1);
  await tab(page, "Home"); await wait(300);
  const s1 = await safe();
  ok(!/800/.test(s1.upcoming) && /\+2,200\.00/.test(s1.left), "Safe to Spend no longer sets the rent aside: discretionary 1,400 → 2,200 (counted once, as spent)", s1);
  ok(/Undo/.test(await page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "")), "an Undo is offered");
  await clickText(page, ".snackbar-undo", /Undo/); await wait(300);
  ok((await state(page)).transactions.find((t) => t.id === rentPaid.id).recurring === false, "Undo puts the expense back exactly as it was");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R9-5. Settings overview names surplus, deficit and break-even in words (en / az / ru)");
{
  const { tIn } = await import(new URL("../../i18n.js", import.meta.url));
  const cases = [["surplus", 1000, 600, "month.net.Net surplus", "400.00"], ["deficit", 500, 900, "month.net.Net deficit", "400.00"], ["break-even", 700, 700, "month.net.Break-even", "0.00"]];
  for (const l of LANGS) {
    const res = [];
    for (const [name, inc, exp, key, amt] of cases) {
      const page = await openPage(browser, { seed: baseSeed({ language: l, transactions: [tx({ type: "income", category: "salary", amount: inc }), tx({ amount: exp })] }), chooseLang: l });
      await goSettings(page);
      const txt = await page.evaluate(() => document.querySelector(".sheet").innerText);
      const label = tIn(l, key), line = txt.split("\n").map((x, i, a) => x.trim() === label ? `${x.trim()} ${a[i + 1] || ""}` : null).find(Boolean);
      res.push({ name, ok: !!line && line.includes(amt), line });
      await page.close();
    }
    ok(res.every((r) => r.ok), `${l}: overview shows "${tIn(l, "month.net.Net surplus")}" / "${tIn(l, "month.net.Net deficit")}" / "${tIn(l, "month.net.Break-even")}" with the right amount`, res);
  }
}

section("R9-6. The routine backup reminder is compact and stays dismissed while moving around; data-loss alerts stay strong");
{
  const old = new Date(Date.now() - 9 * 86400000).toISOString();
  let page = await openPage(browser, { seed: baseSeed({ lastBackup: old, backupConfirmedAt: old }) });
  const rem = () => page.evaluate(() => { const b = [...document.querySelectorAll(".backup-banner")].find((x) => /Back up your data/.test(x.innerText)); if (!b) return null; const r = b.getBoundingClientRect(); return { compact: b.classList.contains("backup-reminder"), h: Math.round(r.height), w: Math.round(r.width), vw: innerWidth }; });
  const r0 = await rem();
  ok(r0 && r0.compact && r0.h <= 64 && r0.w < r0.vw, "the reminder is a compact card (not a full-width bar), still visible", r0);
  await page.evaluate(() => [...document.querySelectorAll(".backup-banner")].find((x) => /Back up your data/.test(x.innerText)).querySelector(".backup-dismiss").click()); await wait(200);
  for (const s of ["Ledger", "Monthly", "Goals", "Recurring", "Home"]) { await tab(page, s); await wait(150); }
  ok((await rem()) === null, "after dismissing, it stays away on every screen during this visit");
  await page.close();
  page = await openPage(browser, { seed: null, seedRaw: JSON.stringify({ ...baseSeed(), transactions: [tx({ merchant: "OK", amount: 5 }), tx({ merchant: "Bad", amount: -5 })] }) });
  const rec = await page.evaluate(() => { const b = [...document.querySelectorAll(".backup-banner")].find((x) => /set aside/.test(x.innerText)); return b ? { compact: b.classList.contains("backup-reminder"), role: b.getAttribute("role") } : null; });
  ok(rec && !rec.compact && rec.role === "alert", "a recovery notice keeps the full-width alert banner (Master Prompt §8)", rec);
  await page.close();
}

await finish("e2e_run9", browser);
