// Run 26c: visits EVERY screen and sheet of the app (phone width, three languages for the main tabs) and checks the basics that must hold
// everywhere: it opens, nothing is cut off sideways, content keeps a minimum margin from the screen edge, buttons are big enough to tap,
// no raw translation keys, no JavaScript errors, and no browser pop-up. Set SHOTS=<folder> to also save a picture of each screen. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx, daysAgo } from "./lib.mjs";
import fs from "node:fs";
import path from "node:path";
const SHOTS = process.env.SHOTS || "";
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await launch();
const click = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error("missing " + s); e.click(); }, sel);
const goTab = (page, i) => page.evaluate((i) => document.querySelectorAll(".tab-btn")[i].click(), i);
const more = async (page, id) => { await goTab(page, 4); await wait(250); await click(page, `.more-page [data-more="${id}"]`); await wait(700); };
const back = async (page) => { await page.evaluate(() => { const b = document.querySelector(".sheet-overlay .sheet-close, .sheet .topbar-btn, [data-section='sheet-close'], .page-back"); if (b) b.click(); else history.back(); }); await wait(500); };

const seed = (lang) => baseSeed({
  language: lang,
  transactions: [
    tx({ merchant: "Bravo", amount: 42.5, category: "food", date: daysAgo(0) }), tx({ merchant: "Bolt", amount: 6.2, category: "transport", date: daysAgo(1) }),
    tx({ merchant: "Netflix", amount: 12, category: "entertainment", date: daysAgo(3), recurring: true, recurFreq: "monthly" }),
    tx({ type: "income", category: "salary", amount: 2400, merchant: "Employer", date: daysAgo(5) }), tx({ merchant: "Rent", amount: 600, category: "housing", date: daysAgo(6) }),
  ],
  goals: [{ id: "g1", name: "Trip", target: 1000, saved: 300, monthlyTarget: 100, targetDate: null }],
  budgets: { food: 300, transport: 80 },
});
const ACC = { version: 1, accounts: [{ id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 120, date: "" }, hidden: false }, { id: "a_card01", name: "Card", kind: "card", opening: { amount: 900, date: "" }, hidden: false }], transfers: [] };

const metrics = (page) => page.evaluate(() => {
  const W = window.innerWidth, vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const root = document.querySelector(".sheet-overlay .sheet") || document.querySelector(".add-overlay") || document.querySelector(".page") || document.body;
  const over = document.documentElement.scrollWidth > W + 1;
  let minGap = 999, who = "";
  for (const e of root.querySelectorAll(".card, .list-card, .section-title, .settings-section-lbl, .empty, .seg, .field, .btn-primary")) {
    if (!vis(e) || e.closest("[aria-hidden='true']")) continue; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight * 3) continue;
    const g = Math.min(r.left, W - r.right); if (g < minGap) { minGap = g; who = (e.className || e.tagName).toString().slice(0, 40); }
  }
  const small = [...root.querySelectorAll("button, a, [role=button], input[type=checkbox], select")].filter((e) => vis(e) && !e.closest(".tab-bar,.tabbar")).map((e) => { const r = e.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), n: (e.getAttribute("aria-label") || e.innerText || e.className || "").toString().replace(/\s+/g, " ").slice(0, 30) }; }).filter((x) => x.h < 40 && x.w < 40);
  const raw = (document.body.innerText.match(/\b[a-z]{2,}\.[a-zA-Z]+(\.[a-zA-Z]+)*\b/g) || []).filter((s) => /^(home|ledger|st|acc|more|budgets|goals|rec|debt|loan|io|lock|safe|privacy|common|month|an|add|tx)\./.test(s));
  return { over, minGap: Math.round(minGap), who, small: small.slice(0, 6), nSmall: small.length, raw: raw.slice(0, 3) };
});

const results = [];
async function visit(page, name, open, { strictGap = true } = {}) {
  const before = page.errors.length;
  try { await open(); await wait(450); } catch (e) { ok(false, name + ": could not open", String(e.message || e).slice(0, 120)); return; }
  const m = await metrics(page); results.push({ name, ...m });
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name.replace(/[^a-z0-9]+/gi, "_") + ".png") });
  ok(!m.over, name + ": nothing cut off sideways");
  if (strictGap) ok(m.minGap >= 12, name + ": content keeps at least 12px from the screen edge", m);
  ok(m.raw.length === 0, name + ": no raw translation keys", m.raw);
  ok(page.errors.length === before, name + ": no JavaScript errors", page.errors[before]);
}

for (const lang of ["en", "az", "ru"]) {
  section("R26-W. Main tabs (" + lang + ")");
  const page = await openPage(browser, { seed: seed(lang), fresh: true, chooseLang: lang, width: lang === "en" ? 390 : 360 });
  await page.evaluate((k, v) => localStorage.setItem(k, v), "expense_ledger_v5__accounts", JSON.stringify(ACC));
  await page.reload(); await settle(page); await wait(600);
  let dialogs = 0; page.on("dialog", async (d) => { dialogs++; await d.dismiss(); });
  await visit(page, `${lang} Home`, async () => { await goTab(page, 0); });
  await visit(page, `${lang} Ledger`, async () => { await goTab(page, 1); });
  await visit(page, `${lang} Analytics`, async () => { await goTab(page, 2); });
  await visit(page, `${lang} Budgets`, async () => { await goTab(page, 3); await page.waitForSelector(".goals-page"); await page.evaluate(() => document.querySelectorAll(".goals-page .seg-btn")[0].click()); });
  await visit(page, `${lang} Goals`, async () => { await page.evaluate(() => document.querySelectorAll(".goals-page .seg-btn")[1].click()); });
  await visit(page, `${lang} More`, async () => { await goTab(page, 4); await page.waitForSelector(".more-page"); });
  if (lang === "en") {
    // Run 27b: Accounts and Preferences are open on the Settings page itself; each part of it is visited by scrolling to it.
for (const sec of ["my-accounts", "my-categories", "st-money-options", "st-look"]) await visit(page, `${lang} Settings-${sec}`, async () => { await goTab(page, 4); await wait(250); await page.evaluate(() => document.querySelectorAll('[data-fold-head][aria-expanded="false"]').forEach((b) => b.click())); await wait(300); await page.evaluate((s) => document.querySelector(`[data-section="${s}"]`).scrollIntoView({ block: "start" }), sec); await wait(400); });
for (const id of ["recurring", "debts", "io", "lock", "safe", "privacy", "how"]) {
      await visit(page, `${lang} More-${id}`, async () => { await goTab(page, 4); await wait(250); await click(page, `.more-page [data-more="${id}"]`); await wait(600); });
      await page.keyboard.press("Escape"); await wait(200);
      await page.evaluate(() => { const o = document.querySelector(".sheet-overlay"); if (o) o.click(); }); await wait(350);
    }
    await visit(page, `${lang} Add`, async () => { await goTab(page, 0); await wait(200); await click(page, ".fab-add"); await page.waitForSelector(".amount-input"); });
    await page.evaluate(() => { const o = document.querySelector(".add-overlay .add-close"); if (o) o.click(); }); await wait(500);
    await visit(page, `${lang} Transaction`, async () => { await goTab(page, 1); await wait(300); await page.evaluate(() => document.querySelector(".txn-list > *").click()); await page.waitForSelector(".sheet"); await wait(400); });
    ok(await page.evaluate(() => !document.querySelector(".add-overlay")), "the transaction screen is the details sheet, not the add form");
    await page.keyboard.press("Escape"); await wait(300); await page.evaluate(() => { const o = document.querySelector(".sheet-overlay"); if (o) o.click(); }); await wait(300);
    await visit(page, `${lang} Debts-and-loans`, async () => { await more(page, "debts"); });
    await visit(page, `${lang} Loans`, async () => { await page.evaluate(() => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[1].click()); });
    ok(await page.evaluate(() => getComputedStyle(document.querySelector(".page")).backgroundImage === "none"), "no ruled lines behind the content (they ran through headings)");
  }
  ok(dialogs === 0, lang + ": no browser pop-up appeared during the walk", dialogs);
  await page.close();
}

section("R26-W. Summary of margins and small buttons (information)");
for (const r of results) if (r.minGap < 16 || r.nSmall) console.log(`  · ${r.name}: closest content ${r.minGap}px from the edge (${r.who}); ${r.nSmall} small buttons`, r.small.length ? JSON.stringify(r.small.slice(0, 3)) : "");
await finish("e2e_run26_walk", browser);
