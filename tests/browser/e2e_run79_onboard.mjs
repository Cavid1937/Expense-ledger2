// Run 79 in the real bundled app: the first launch as one scene (owner, 14 Nov). Language, then Google or guest, then the quick questions one
// per page; a reload resumes where the person was; a phone that already had the app never sees it; "Continue with Google" never overwrites a
// backup that is already in that Google account. Google is simulated in the page (no network). Synthetic data only.
import { launch, openPage, state, ok, section, finish, baseSeed, tx, wait, KEY } from "./lib.mjs";
const browser = await launch();
const OB = KEY + "__onboard";
const obKey = (page) => page.evaluate((k) => localStorage.getItem(k), OB);
const accounts = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("expense_ledger_v5__accounts") || "null"); } catch { return null; } });
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const has = async (page, sel) => !!(await page.$(sel));
const fresh = (extra = {}) => openPage(browser, { fresh: true, seed: null, chooseLang: false, ...extra });
const pickLang = async (page, l) => { await click(page, `.lang-opt input[value="${l}"]`); await click(page, ".lang-continue"); await page.waitForSelector('[data-ob="guest"]', { timeout: 4000 }); await wait(450); };
// Google in the page: a token from the "phone app", and a Drive that holds `file` (or nothing). Every Drive request is counted.
const fakeGoogle = (file, fail) => `() => { window.__drive = { file: ${JSON.stringify(file)}, saves: 0, calls: 0 };
  window.LedgerNative = Object.assign(window.LedgerNative || {}, { google: { getToken: async () => { if (${JSON.stringify(fail)}) throw new Error("no"); return { token: "test-token" }; }, revoke: async () => {} } });
  const real = window.fetch;
  window.fetch = async (url, init) => { const u = String(url); if (!/googleapis/.test(u)) return real(url, init); const d = window.__drive; d.calls++;
    const m = (init && init.method) || "GET"; const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } });
    if (m === "GET" && /alt=media/.test(u)) return new Response(d.file, { status: 200 });
    if (m === "GET") return json({ files: d.file ? [{ id: "f1", modifiedTime: "2026-11-01T10:00:00Z", size: d.file.length }] : [] });
    d.saves++; d.file = "saved"; return json({ id: "f1", modifiedTime: "2026-11-14T10:00:00Z" }); }; }`;

section("R79-O1. A new install: language, then Google or guest, in one scene");
let page = await fresh();
ok(await has(page, '[data-section="onboarding"] .ob-brand [data-launch-target]') && await has(page, ".ob-panel .lang-opt"), "the brand band (with the mark the opening lands on) and the language panel are shown");
ok(!(await has(page, ".tabbar")), "the app itself is not shown yet");
const tags = new Set(); for (let i = 0; i < 4; i++) { tags.add(await page.evaluate(() => document.querySelector(".ob-tag").innerText)); await wait(800); }
ok(tags.size >= 2, "before a language is chosen, the line under the name changes language", [...tags]);
await pickLang(page, "az");
ok(await has(page, '[data-ob="google"]') && await has(page, '[data-ob="guest"]'), "after the language: create an account with Google, or as a guest");
ok((await page.evaluate(() => document.querySelector('[data-ob="google"]').innerText)).includes("Google ilə hesab yarat") && (await page.evaluate(() => document.querySelector(".ob-tag").innerText)) === "Pulunuzun hara getdiyini bilin.", "everything is now in the chosen language");
ok((await obKey(page)) === "account" && (await state(page)).language === "az", "language saved; the scene remembers it is at 'Google or guest'");

section("R79-O2. A reload resumes the scene where it was");
await page.reload(); await page.waitForSelector('[data-ob="guest"]', { timeout: 4000 }); await wait(300);
ok(await has(page, '[data-section="ob-account"]'), "reloaded at 'Google or guest', not thrown into the app");
await click(page, '[data-ob="guest"]'); await page.waitForSelector(".setup-page"); await wait(400);
ok((await obKey(page)) === "setup" && await has(page, ".ob-setup .setup-dots"), "guest: the questions follow, with progress dots");
await page.reload(); await page.waitForSelector(".setup-page", { timeout: 4000 }); await wait(300);
ok(await has(page, ".ob-setup"), "a reload in the questions resumes the questions");

section("R79-O3. Answering the questions creates the accounts, then Home");
await page.type("#setupq-cash", "80");
for (let i = 0; i < 3; i++) { await click(page, '[data-section="setupq-next"]'); await wait(400); }
await click(page, '[data-section="setupq-save"]');
await page.waitForFunction(() => !document.querySelector('[data-section="onboarding"]'), { timeout: 4000 }); await wait(300);
const acc = await accounts(page);
ok(acc && acc.accounts.length === 1 && acc.accounts[0].opening.amount === 80 && acc.accounts[0].name === "Nağd", "one account, 'Nağd', 80", acc);
ok((await obKey(page)) === "done" && await has(page, ".tabbar"), "the scene is finished and Home is shown");
await page.reload(); await page.waitForSelector(".tabbar"); await wait(300);
ok(!(await has(page, '[data-section="onboarding"]')), "it never comes back after a reload");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R79-O4. Skipping the questions creates nothing");
page = await fresh(); await pickLang(page, "en");
await click(page, '[data-ob="guest"]'); await page.waitForSelector(".setup-page"); await wait(300);
await click(page, '[data-section="setupq-skip"]');
await page.waitForFunction(() => !document.querySelector('[data-section="onboarding"]'), { timeout: 4000 });
const s4 = await state(page);
ok((await accounts(page)) === null && s4.goals.length === 0 && (s4.bills || []).length === 0 && s4.transactions.length === 0, "nothing created");
await page.close();

section("R79-O5. A phone that already had the app goes straight to Home");
// the earlier pages share this browser's storage, so the scene's own key is cleared first (as on a phone that had the app before Run 79)
page = await openPage(browser, { seed: baseSeed({ language: "ru", transactions: [tx({ amount: 5 })] }), pre: () => { try { if (!sessionStorage.getItem("__o5")) { sessionStorage.setItem("__o5", "1"); localStorage.removeItem("expense_ledger_v5__onboard"); } } catch (e) {} } });
ok(!(await has(page, '[data-section="onboarding"]')) && await has(page, ".tabbar") && (await obKey(page)) === null, "no scene, no new key written");
await page.close();

// Run 82: the first-launch Google choice creates or opens an ACCOUNT. The phone's Google sheet and the app's server are simulated in the page.
const fakeAccount = (row, fail) => `() => { window.__acct = { row: ${JSON.stringify(row)}, posts: 0, patches: 0 };
  window.LedgerNative = Object.assign(window.LedgerNative || {}, { google: { getToken: async () => ({ token: "t" }), revoke: async () => {},
    getIdToken: async (o) => { if (${JSON.stringify(fail)}) throw new Error(${JSON.stringify(fail)}); if (!/^[0-9a-f]{64}$/.test(o.nonce)) throw new Error("auth"); return { idToken: "aaa.bbb.ccc" }; } } });
  const real = window.fetch;
  window.fetch = async (url, init) => { const u = String(url); if (!/supabase\\.co/.test(u)) return real(url, init); const a = window.__acct;
    const m = (init && init.method) || "GET"; const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { "Content-Type": "application/json" } });
    if (/auth\\/v1\\/token/.test(u)) return json({ access_token: "A", refresh_token: "R", expires_in: 3600, user: { id: "11111111-2222-3333-4444-555555555555", email: "t@example.invalid" } });
    if (m === "GET") return json(a.row ? [a.row] : []);
    if (m === "POST") { a.posts++; const b = JSON.parse(init.body); a.row = { ...b, updated_at: "2026-11-14T10:00:00Z" }; return json([a.row], 201); }
    if (m === "PATCH") { a.patches++; return json([]); }
    return json({}, 500); }; }`;
const acctKey = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__account") || "null"));

section("R79-O6. Create an account with Google (none yet): this phone's copy is saved, the questions follow");
page = await fresh({ pre: eval(fakeAccount(null, "")) }); await pickLang(page, "en");
ok((await page.evaluate(() => document.querySelector('[data-ob="google"]').innerText)).includes("Create an account with Google"), "the button now says 'Create an account with Google'");
await click(page, '[data-ob="google"]'); await page.waitForSelector(".setup-page", { timeout: 5000 }); await wait(300);
const a6 = await page.evaluate(() => window.__acct), k6 = await acctKey(page);
ok(a6.posts === 1 && k6 && k6.version === 1 && k6.paused === "", "one account copy created (version 1); saving is on", { a6: a6.posts, k6 });
const d6 = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__drive") || "null"));
ok(!d6 || d6.on !== true, "Drive backup is NOT switched on by this button any more (it stays in Settings)", d6);
await page.close();

section("R79-O7. Signing in to an account that already holds data: it is offered for review, never overwritten");
const old = baseSeed({ language: "en", transactions: [tx({ amount: 12.5, merchant: "Old phone" }), tx({ amount: 3, merchant: "Old phone 2" })] });
page = await fresh({ pre: eval(fakeAccount({ data: old, version: 4, device: "Android app", updated_at: "2026-11-10T10:00:00Z" }, "")) }); await pickLang(page, "en");
await click(page, '[data-ob="google"]'); await wait(1200);
const a7 = await page.evaluate(() => window.__acct);
ok(a7.posts === 0 && a7.patches === 0 && a7.row.version === 4, "nothing was written to the account", { posts: a7.posts, patches: a7.patches });
ok(!(await has(page, '[data-section="onboarding"]')) && await has(page, ".sheet-overlay"), "the scene closed and the import preview is open (nothing restored yet)");
ok((await acctKey(page)).paused === "restore", "saving to the account waits until the person decides");
const btn = await page.evaluate(() => { const b = [...document.querySelectorAll(".sheet-overlay button")].find((x) => /^(Add|Merge|Import|Replace)/i.test(x.innerText.trim())); if (b) { const t = b.innerText.trim(); b.click(); return t; } return null; });
await wait(600);
const s7 = await state(page), k7 = await acctKey(page);
ok(btn && s7.transactions.length === 2, "confirming restores the account's entries", { btn, n: s7.transactions.length });
ok(k7 && k7.version === 4 && k7.paused === "", "and only then does saving to the account start, from the account's version", k7);
await page.close();

section("R79-O8. Google fails: the message stays on the page, guest still works");
page = await fresh({ pre: eval(fakeAccount(null, "noaccount")) }); await pickLang(page, "en");
await click(page, '[data-ob="google"]'); await page.waitForSelector('[data-section="ob-error"]', { timeout: 4000 });
ok((await page.evaluate(() => document.querySelector('[data-section="ob-error"]').innerText)).includes("no Google account"), "a phone without a Google account is told so in plain words");
ok(await has(page, '[data-section="ob-account"]') && !(await page.$eval('[data-ob="guest"]', (b) => b.disabled)), "the error is shown on the same page and 'Continue as guest' is still there");
await click(page, '[data-ob="guest"]'); await page.waitForSelector(".setup-page", { timeout: 4000 });
ok((await acctKey(page)) === null, "guest goes on to the questions, with no account");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R79-O9. Closing Google's sheet just leaves the page as it was (no error)");
page = await fresh({ pre: eval(fakeAccount(null, "cancelled")) }); await pickLang(page, "en");
await click(page, '[data-ob="google"]'); await wait(800);
ok(!(await has(page, '[data-section="ob-error"]')) && await has(page, '[data-ob="google"]') && !(await page.$eval('[data-ob="google"]', (b) => b.disabled)), "no message, and the button can be tapped again");
await page.close();
await browser.close();
finish("e2e_run79_onboard");
