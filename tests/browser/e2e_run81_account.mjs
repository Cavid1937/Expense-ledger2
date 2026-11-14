// Run 81 in the real bundled app: the optional account. Google is stood in for by window.LedgerNative.google.getIdToken (as the Android
// app supplies it) and the page's fetch answers the account server from memory. Synthetic data only; no real Google or server is used.
import { launch, openPage, state, ok, section, finish, baseSeed, tx, wait, toast, KEY } from "./lib.mjs";
const browser = await launch();
const UID = "11111111-2222-3333-4444-555555555555";
const AKEY = KEY + "__account";
// window.__srv = { row, calls, offline }. `preset` (JSON) seeds the server row and/or the stored sign-in once per page.
const FAKE = (preset = {}) => `{
  const P = ${JSON.stringify(preset)};
  window.__srv = window.__srv || { row: P.row || null, calls: [], offline: !!P.offline, n: 1, deleted: false };
  if (!sessionStorage.getItem("seeded")) { if (P.session) localStorage.setItem("${AKEY}", JSON.stringify(P.session)); else localStorage.removeItem("${AKEY}"); sessionStorage.setItem("seeded", "1"); }
  window.LedgerNative = Object.assign(window.LedgerNative || {}, { google: { getToken: async () => ({ token: "T1" }), getIdToken: async (o) => { window.__srv.nonce = o.nonce; window.__srv.clientId = o.clientId; return { idToken: "aaa.bbb.ccc" }; } } });
  const real = window.fetch;
  window.fetch = async function (u, o = {}) {
    const url = String(u); if (!/qkztocsrxhubsljtsjpd\\.supabase\\.co\\/(auth|rest\\/v1\\/(ledgers|rpc))/.test(url)) return real.apply(this, arguments);
    const S = window.__srv; S.calls.push({ url, method: o.method || "GET", body: o.body });
    if (S.offline) throw new TypeError("Failed to fetch");
    const J = (s, b) => new Response(s === 204 ? null : typeof b === "string" ? b : JSON.stringify(b), { status: s });
    const p = new URL(url);
    if (p.pathname === "/auth/v1/token") { S.n++; return J(200, { access_token: "A" + S.n, refresh_token: "R" + S.n, expires_in: 3600, user: { id: "${UID}", email: "test@example.invalid", user_metadata: { full_name: "Test Person" } } }); }
    if (p.pathname === "/rest/v1/ledgers" && (o.method || "GET") === "GET") return J(200, S.row ? [S.row] : []);
    if (p.pathname === "/rest/v1/ledgers" && o.method === "POST") { if (S.row) return J(409, "{}"); const b = JSON.parse(o.body); S.row = { data: b.data, version: 1, device: b.device, updated_at: "2026-11-14T10:00:00Z" }; return J(201, [S.row]); }
    if (p.pathname === "/rest/v1/ledgers" && o.method === "PATCH") { const v = Number(p.searchParams.get("version").replace("eq.", "")); if (!S.row || S.row.version !== v) return J(200, []); const b = JSON.parse(o.body); S.row = { ...S.row, data: b.data, version: b.version, device: b.device }; return J(200, [S.row]); }
    if (p.pathname === "/rest/v1/rpc/delete_my_account") { S.row = null; S.deleted = true; return J(204, ""); }
    if (p.pathname === "/auth/v1/logout") return J(204, "");
    return J(404, "{}");
  };
}`;
const goSettings = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector('[data-section="st-account"]'); await wait(300); };
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const card = (page) => page.evaluate(() => (document.querySelector('[data-section="st-account"]') || {}).innerText || "");
const srv = (page) => page.evaluate(() => window.__srv);
const acct = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), AKEY);
const seed = () => baseSeed({ language: "en", transactions: [tx({ merchant: "Bravo Market", amount: 23.45 }), tx({ merchant: "Metro", amount: 0.9 })] });
const backupOf = (txs) => ({ version: 5, exportedAt: "2026-11-13T09:00:00Z", meta: { app: "expense-ledger", transactionCount: txs.length }, transactions: txs, budgets: {}, templates: [], currency: "AZN", goals: [], safeToSpend: {}, bills: [] });
const far = (o) => ({ id: 77000 + Math.floor(Math.random() * 999), type: "expense", amount: 7, category: "food", subcategory: "", merchant: "Other Phone Kafe", note: "", date: "2026-11-01", recurring: false, recurFreq: null, isActive: true, ...o });

section("R81-B1. Signed out: the card explains the account; nothing goes to the server before a tap");
{
  const page = await openPage(browser, { seed: seed(), pre: FAKE() });
  await goSettings(page);
  const c = await card(page);
  ok(/Account/.test(c) && /Optional/.test(c) && /only on this phone/.test(c) && /delete it here/.test(c), "it says the account is optional, what is stored where, and that it can be deleted", c.slice(0, 260));
  ok(!!(await page.$('[data-section="acct-signin"]')) && (await srv(page)).calls.length === 0, "a Continue with Google button; no server call yet");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R81-B2. First sign-in with an empty account: this phone's data becomes the account copy");
{
  const page = await openPage(browser, { seed: seed(), pre: FAKE() });
  await goSettings(page);
  await click(page, '[data-section="acct-signin"]'); await wait(1500);
  const S = await srv(page), a = await acct(page);
  ok(S.row && S.row.data.transactions.length === 2 && S.row.version === 1, "the account now holds both entries at version 1", S.row && S.row.version);
  ok(/^[0-9a-f]{64}$/.test(S.nonce) && /\.apps\.googleusercontent\.com$/.test(S.clientId), "Google was asked with a hashed nonce and the public web client ID");
  const tokCall = S.calls.find((x) => /grant_type=id_token/.test(x.url));
  ok(tokCall && JSON.parse(tokCall.body).nonce && JSON.parse(tokCall.body).nonce !== S.nonce, "the server got the raw nonce (not the hash Google got)");
  ok(a && a.userId === UID && a.version === 1 && !a.paused, "the sign-in is stored in its own key at version 1", a);
  const c = await card(page);
  ok(/Test Person/.test(c) && /Saved to your account/.test(c), "the card shows who is signed in and when it was saved", c.slice(0, 200));
  const ledgerRaw = await page.evaluate((k) => localStorage.getItem(k), KEY);
  ok(!ledgerRaw.includes(a.refresh) && !JSON.stringify(S.row.data).includes(a.refresh), "the sign-in is never inside the ledger or the account copy");
  // a change: the profile name, then the app goes to the background -> saved on top of version 1
  await page.evaluate(() => { const i = document.getElementById("profile-name"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "Nigar"); i.dispatchEvent(new Event("input", { bubbles: true })); });
  await click(page, '[data-section="st-name-save"]'); await wait(300);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); }); await wait(1200);
  const S2 = await srv(page);
  ok(S2.row.version === 2 && S2.calls.some((x) => x.method === "PATCH" && /version=eq\.1/.test(x.url)), "a change is saved on top of the version this phone saw (version 2)", S2.row.version);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R81-B3. Signing in when the account already has data: nothing changes until the person chooses");
{
  const row = { data: backupOf([far({ id: 77001 }), far({ id: 77002, merchant: "Other Phone Taxi", amount: 4 })]), version: 4, device: "Android app", updated_at: "2026-11-13T09:00:00Z" };
  const page = await openPage(browser, { seed: seed(), pre: FAKE({ row }) });
  await goSettings(page);
  await click(page, '[data-section="acct-signin"]');
  await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 6000 }); await wait(400);
  const sheet = await page.evaluate(() => document.querySelector('[aria-label="Restore backup"]').innerText);
  ok(/Your account/.test(sheet) && /New, will be added: 2/.test(sheet), "the account's data opens in the usual review (2 new entries)", sheet.slice(0, 260));
  ok((await state(page)).transactions.length === 2 && (await srv(page)).row.version === 4 && !(await srv(page)).calls.some((x) => x.method === "PATCH" || x.method === "POST" && /ledgers/.test(x.url)), "this phone and the account are both unchanged so far");
  await page.keyboard.press("Escape"); await wait(600);
  const c = await card(page);
  ok(/already holds data/.test(c) && !!(await page.$('[data-section="acct-review"]')) && !!(await page.$('[data-section="acct-keep-phone"]')), "cancelled: the card asks which data to keep; saving is paused", c.slice(0, 200));
  await wait(5500);
  ok(!(await srv(page)).calls.some((x) => x.method === "PATCH"), "while paused, nothing is saved automatically");
  await click(page, '[data-section="acct-keep-phone"]'); await wait(200);
  ok(/will be replaced by this phone/.test(await card(page)), "keeping this phone's data asks first, and says this phone does not change");
  await click(page, '[data-section="acct-keep-yes"]'); await wait(1200);
  const S = await srv(page);
  ok(S.row.version === 5 && S.row.data.transactions.length === 2 && S.row.data.transactions.some((x) => x.merchant === "Bravo Market"), "the account now holds this phone's data (version 5)", S.row.version);
  ok((await state(page)).transactions.length === 2 && !(await acct(page)).paused, "this phone's data is unchanged and saving resumed");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R81-B4. Reviewing the account's data and adding it");
{
  const row = { data: backupOf([far({ id: 77011 })]), version: 3, device: "Android app", updated_at: "2026-11-13T09:00:00Z" };
  const page = await openPage(browser, { seed: seed(), pre: FAKE({ row }) });
  await goSettings(page);
  await click(page, '[data-section="acct-signin"]'); await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 6000 }); await wait(400);
  const btn = await page.evaluate(() => { const b = [...document.querySelectorAll('[aria-label="Restore backup"] button')].find((x) => /^(Add|Merge|Import)/i.test(x.innerText.trim())); if (b) { b.click(); return b.innerText.trim(); } return ""; });
  await wait(6500);
  const st = await state(page), S = await srv(page);
  ok(btn && st.transactions.length === 3 && st.transactions.some((x) => x.merchant === "Other Phone Kafe"), "confirmed: the account's entry is added to this phone (3 entries)", btn);
  ok(S.row.version === 4 && S.row.data.transactions.length === 3, "the combined data is saved back to the account on top of version 3", S.row.version);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R81-B5. Another device saved newer data while this phone also changed: nothing is overwritten");
{
  const row = { data: backupOf([far({ id: 77021 })]), version: 7, device: "Android app", updated_at: "2026-11-14T08:00:00Z" };
  const session = { access: "A1", refresh: "R1", until: Date.now() + 3600000, userId: UID, email: "test@example.invalid", name: "Test Person", version: 6, syncedAt: "2026-11-13T09:00:00Z", lastHash: "different", paused: "", lastError: "" };
  const page = await openPage(browser, { seed: seed(), pre: FAKE({ row, session }) });
  await wait(1500);
  await goSettings(page);
  const S = await srv(page), a = await acct(page);
  ok(a.paused === "conflict" && /Another device saved newer data/.test(await card(page)), "on opening, the app notices and asks which data to keep", a && a.paused);
  ok(S.row.version === 7 && !S.calls.some((x) => x.method === "PATCH"), "the newer account copy was not overwritten");
  ok((await state(page)).transactions.length === 2, "this phone's data is unchanged");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R81-B6. A damaged account copy is refused; offline sign-in changes nothing");
{
  const row = { data: { transactions: "not a list" }, version: 2, device: "x", updated_at: "2026-11-14T08:00:00Z" };
  let page = await openPage(browser, { seed: seed(), pre: FAKE({ row }) });
  await goSettings(page);
  await click(page, '[data-section="acct-signin"]'); await wait(1800);
  const txt = await page.evaluate(() => document.body.innerText);
  ok((await state(page)).transactions.length === 2 && (await srv(page)).row.version === 2, "the damaged copy is not applied and the account is not touched");
  ok(/could not|not a valid|damaged|cannot be read|isn't|is not/i.test(txt) || !!(await page.$('[role="dialog"]')), "the person is told the data could not be read");
  await page.close();
  page = await openPage(browser, { seed: seed(), pre: FAKE({ offline: true }) });
  await goSettings(page);
  await click(page, '[data-section="acct-signin"]'); await wait(800);
  const tt = await toast(page, 50);
  ok(/No connection/.test(tt) && (await acct(page)) === null && !!(await page.$('[data-section="acct-signin"]')), "offline: a clear message; still signed out", tt);
  ok((await state(page)).transactions.length === 2, "this phone's data is unchanged");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R81-B7. Sign out and delete account keep the data on this phone");
{
  const page = await openPage(browser, { seed: seed(), pre: FAKE() });
  await goSettings(page);
  await click(page, '[data-section="acct-signin"]'); await wait(1500);
  await click(page, '[data-section="acct-delete"]'); await wait(200);
  ok(/deleted for good/.test(await card(page)) && /phone is kept/.test(await card(page)), "deleting asks first and says the phone's data is kept");
  await click(page, '[data-section="acct-delete-yes"]'); await wait(1000);
  const S = await srv(page);
  ok(S.deleted && S.row === null && (await acct(page)) === null, "the account and its copy are deleted on the server, and the sign-in is forgotten");
  ok((await state(page)).transactions.length === 2 && !!(await page.$('[data-section="acct-signin"]')), "the data on this phone is kept; the card is back to Continue with Google");
  await click(page, '[data-section="acct-signin"]'); await wait(1500);
  await click(page, '[data-section="acct-signout"]'); await wait(200);
  await click(page, '[data-section="acct-out-yes"]'); await wait(600);
  ok((await acct(page)) === null && (await state(page)).transactions.length === 2 && (await srv(page)).row !== null, "sign out: the sign-in is forgotten; phone and account copy both stay");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R81-B8. Azerbaijani and Russian");
for (const [lang, re] of [["az", /Hesab/], ["ru", /Аккаунт/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang }), pre: FAKE() });
  await goSettings(page);
  const c = await card(page);
  ok(re.test(c) && !/acct\./.test(c), lang + ": the card is translated (no raw keys)", c.slice(0, 120));
  await page.close();
}
await browser.close();
finish("e2e_run81_account");
