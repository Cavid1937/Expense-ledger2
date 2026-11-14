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
ok(await has(page, '[data-ob="google"]') && await has(page, '[data-ob="guest"]'), "after the language: Continue with Google, or as a guest");
ok((await page.evaluate(() => document.querySelector('[data-ob="google"]').innerText)).includes("Google ilə davam et") && (await page.evaluate(() => document.querySelector(".ob-tag").innerText)) === "Pulunuzun hara getdiyini bilin.", "everything is now in the chosen language");
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

section("R79-O6. Google with no backup there yet: the first backup is saved, the questions follow");
page = await fresh({ pre: eval(fakeGoogle(null, false)) }); await pickLang(page, "en");
await click(page, '[data-ob="google"]'); await page.waitForSelector(".setup-page", { timeout: 5000 }); await wait(300);
const d6 = await page.evaluate(() => window.__drive);
const drv6 = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__drive") || "null"));
ok(d6.saves === 1 && drv6 && drv6.on === true, "one backup saved and Drive backup is on", { d6, drv6 });
await page.close();

section("R79-O7. Google with a backup already there: it is offered for restore, never overwritten");
const backup = JSON.stringify(baseSeed({ language: "en", transactions: [tx({ amount: 12.5, merchant: "Old phone" }), tx({ amount: 3, merchant: "Old phone 2" })] }));
page = await fresh({ pre: eval(fakeGoogle(backup, false)) }); await pickLang(page, "en");
await click(page, '[data-ob="google"]'); await wait(1200);
const d7 = await page.evaluate(() => window.__drive);
ok(d7.saves === 0 && d7.file === backup, "nothing was written to Drive", d7.saves);
ok(!(await has(page, '[data-section="onboarding"]')) && (await page.evaluate(() => document.body.innerText)).includes("Old phone") === false && await has(page, ".sheet-overlay"), "the scene closed and the import preview is open (nothing restored yet)");
const drv7a = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__drive") || "null"));
ok(!drv7a || drv7a.on !== true, "Drive backup is not switched on before the restore is confirmed", drv7a);
const btn = await page.evaluate(() => { const b = [...document.querySelectorAll(".sheet-overlay button")].find((x) => /^(Add|Merge|Import|Replace)/i.test(x.innerText.trim())); if (b) { const t = b.innerText.trim(); b.click(); return t; } return null; });
await wait(600);
const s7 = await state(page);
const drv7 = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__drive") || "null"));
ok(btn && s7.transactions.length === 2, "confirming restores the old phone's entries", { btn, n: s7.transactions.length });
ok(drv7 && drv7.on === true, "and only then is Drive backup switched on", drv7);
await page.close();

section("R79-O8. Google fails: the message stays on the page, guest still works");
page = await fresh({ pre: eval(fakeGoogle(null, true)) }); await pickLang(page, "en");
await click(page, '[data-ob="google"]'); await page.waitForSelector('[data-section="ob-error"]', { timeout: 4000 });
ok(await has(page, '[data-section="ob-account"]') && !(await page.$eval('[data-ob="guest"]', (b) => b.disabled)), "the error is shown on the same page and 'Continue as guest' is still there");
await click(page, '[data-ob="guest"]'); await page.waitForSelector(".setup-page", { timeout: 4000 });
ok(true, "guest goes on to the questions");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
await browser.close();
finish("e2e_run79_onboard");
