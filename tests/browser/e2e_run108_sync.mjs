// Run 108 (owner, 18 Nov: "My website app doesn't possess the ones I recorded" in the Android app): two account-sync gaps fixed.
// (1) The check for a newer account copy ran only when the app opened, so a website tab left open never looked again; it now runs again
// each time the app comes back to the screen. (2) While saving is paused, the bell says so (before, only the card deep in Settings did).
// The server is answered from memory, as in e2e_run81_account. Synthetic data only.
import { launch, openPage, state, ok, section, finish, baseSeed, tx, wait, KEY } from "./lib.mjs";
const browser = await launch();
const UID = "11111111-2222-3333-4444-555555555555";
const AKEY = KEY + "__account";
const FAKE = (preset = {}) => `{
  const P = ${JSON.stringify(preset)};
  window.__srv = window.__srv || { row: P.row || null, calls: [], n: 1 };
  if (!sessionStorage.getItem("seeded")) { if (P.session) localStorage.setItem("${AKEY}", JSON.stringify(P.session)); else localStorage.removeItem("${AKEY}"); sessionStorage.setItem("seeded", "1"); }
  window.LedgerNative = Object.assign(window.LedgerNative || {}, { google: { getToken: async () => ({ token: "T1" }), getIdToken: async () => ({ idToken: "aaa.bbb.ccc" }) } });
  const real = window.fetch;
  window.fetch = async function (u, o = {}) {
    const url = String(u); if (!/qkztocsrxhubsljtsjpd\\.supabase\\.co\\/(auth|rest\\/v1\\/ledgers)/.test(url)) return real.apply(this, arguments);
    const S = window.__srv; S.calls.push({ url, method: o.method || "GET" });
    const J = (s, b) => new Response(JSON.stringify(b), { status: s });
    const p = new URL(url);
    if (p.pathname === "/auth/v1/token") { S.n++; return J(200, { access_token: "A" + S.n, refresh_token: "R" + S.n, expires_in: 3600, user: { id: "${UID}", email: "test@example.invalid", user_metadata: { full_name: "Test Person" } } }); }
    if (p.pathname === "/rest/v1/ledgers" && (o.method || "GET") === "GET") return J(200, S.row ? [S.row] : []);
    if (p.pathname === "/rest/v1/ledgers" && o.method === "POST") { const b = JSON.parse(o.body); S.row = { data: b.data, version: 1, device: b.device, updated_at: "2026-11-18T10:00:00Z" }; return J(201, [S.row]); }
    if (p.pathname === "/rest/v1/ledgers" && o.method === "PATCH") { const v = Number(p.searchParams.get("version").replace("eq.", "")); if (!S.row || S.row.version !== v) return J(200, []); const b = JSON.parse(o.body); S.row = { ...S.row, data: b.data, version: b.version }; return J(200, [S.row]); }
    return J(404, {});
  };
}`;
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const srv = (page) => page.evaluate(() => window.__srv);
const acct = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), AKEY);
const seed = () => baseSeed({ language: "en", transactions: [tx({ merchant: "Bravo Market", amount: 23.45 }), tx({ merchant: "Metro", amount: 0.9 })] });
const backupOf = (txs) => ({ version: 5, exportedAt: "2026-11-18T09:00:00Z", meta: { app: "expense-ledger", transactionCount: txs.length }, transactions: txs, budgets: {}, templates: [], currency: "AZN", goals: [], safeToSpend: {}, bills: [] });
const far = (o) => ({ id: 88001, type: "expense", amount: 7, category: "food", subcategory: "", merchant: "Phone Kafe", note: "", date: "2026-11-18", recurring: false, recurFreq: null, isActive: true, ...o });
const show = (page) => page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
const bellIds = (page) => page.evaluate(() => (document.querySelector("[data-inbox-bell]") || { getAttribute: () => "" }).getAttribute("data-notices") || "");

section("R108-Y1. The other device saved while this one was open: coming back to the app offers its records");
{
  const page = await openPage(browser, { seed: seed(), pre: FAKE() });
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector('[data-section="st-account"]'); await wait(300);
  await click(page, '[data-section="acct-signin"]'); await wait(1500);
  const a0 = await acct(page);
  ok(a0 && a0.version === 1 && !a0.paused, "signed in; this phone's copy is the account's version 1", a0 && a0.version);
  // the phone app saves its new record (version 2) while this tab stays open
  await page.evaluate((d) => { window.__srv.row = { ...window.__srv.row, data: d, version: 2, device: "Android app" }; }, backupOf([far()]));
  await show(page);
  await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 6000 }).catch(() => {}); await wait(300);
  const sheet = await page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");
  ok(/Your account/.test(sheet) && /New, will be added: 1/.test(sheet), "the account's newer records open in the usual review (1 new entry)", sheet.slice(0, 200));
  ok((await state(page)).transactions.length === 2, "nothing is added until the person confirms");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R108-Y2. Both changed: saving pauses and the bell says so, with a Review button");
{
  const row = { data: backupOf([far({ id: 88002 })]), version: 7, device: "Android app", updated_at: "2026-11-18T08:00:00Z" };
  const session = { access: "A1", refresh: "R1", until: Date.now() + 3600000, userId: UID, email: "test@example.invalid", name: "Test Person", version: 6, syncedAt: "2026-11-17T09:00:00Z", lastHash: "different", paused: "", lastError: "" };
  const page = await openPage(browser, { seed: seed(), pre: FAKE({ row, session }) });
  await wait(1500);
  const a = await acct(page);
  ok(a && a.paused === "conflict", "the newer account copy is noticed; saving pauses", a && a.paused);
  ok(/acct-paused/.test(await bellIds(page)), "the bell holds a 'saving is paused' notice", await bellIds(page));
  await page.evaluate(() => document.querySelector("[data-inbox-bell]").click()); await wait(350);
  const txt = await page.evaluate(() => (document.querySelector('[data-notice="acct-paused"]') || {}).innerText || "");
  ok(/Another device saved newer data/.test(txt) && /Review account data/.test(txt), "it explains why and offers Review", txt.slice(0, 200));
  await page.evaluate(() => document.querySelector('[data-notice="acct-paused"] [data-act="review"]').click());
  await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 6000 }).catch(() => {}); await wait(300);
  ok(!!(await page.$('[aria-label="Restore backup"]')), "Review opens the account's records in the usual review");
  ok((await srv(page)).row.version === 7 && (await state(page)).transactions.length === 2, "nothing was overwritten on either side");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run108_sync");
