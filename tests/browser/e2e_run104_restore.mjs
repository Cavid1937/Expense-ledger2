// Run 104 (owner decision, 17 Nov: "data restoration takes priority over initializing a new ledger"). The first launch keeps the order
// language -> account or Drive restore -> (only when not restoring) the quick questions -> the app, and a restore is finished only when the
// person confirms the import preview. Cancelled, failed, damaged and interrupted restores never leave an empty app behind and never write to
// the account. Google, Drive and the account server are simulated in the page (no network). Synthetic data only.
import { launch, openPage, state, ok, section, finish, baseSeed, tx, wait, KEY } from "./lib.mjs";
const browser = await launch();
const OB = KEY + "__onboard";
const obKey = (page) => page.evaluate((k) => localStorage.getItem(k), OB);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const has = async (page, sel) => !!(await page.$(sel));
const fresh = (extra = {}) => openPage(browser, { fresh: true, seed: null, chooseLang: false, ...extra });
const pickLang = async (page, l) => { await click(page, `.lang-opt input[value="${l}"]`); await click(page, ".lang-continue"); await page.waitForSelector('[data-ob="guest"]', { timeout: 4000 }); await wait(450); };
const acctKey = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__account") || "null"));
const srv = (page) => page.evaluate(() => window.__acct);
// the account server (`row`) and the hidden Drive folder (`file`); `failGet` makes reading the account fail like a server error
const fake = ({ row = null, file = null, failGet = false } = {}) => eval(`() => { window.__acct = { row: ${JSON.stringify(row)}, posts: 0, patches: 0, failGet: ${JSON.stringify(failGet)} };
  window.__drive = { file: ${JSON.stringify(file)} };
  window.LedgerNative = Object.assign(window.LedgerNative || {}, { google: { getToken: async () => ({ token: "t" }), revoke: async () => {}, getIdToken: async () => ({ idToken: "aaa.bbb.ccc" }) } });
  const real = window.fetch;
  window.fetch = async (url, init) => { const u = String(url); const m = (init && init.method) || "GET"; const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { "Content-Type": "application/json" } });
    if (/googleapis/.test(u)) { const d = window.__drive; if (m === "GET" && /alt=media/.test(u)) return new Response(d.file, { status: 200 }); if (m === "GET") return json({ files: d.file ? [{ id: "f1", modifiedTime: "2026-11-01T10:00:00Z", size: d.file.length }] : [] }); return json({ id: "f1", modifiedTime: "2026-11-17T10:00:00Z" }); }
    if (!/supabase\\.co/.test(u)) return real(url, init); const a = window.__acct;
    if (/auth\\/v1\\/token/.test(u)) return json({ access_token: "A", refresh_token: "R", expires_in: 3600, user: { id: "11111111-2222-3333-4444-555555555555", email: "t@example.invalid" } });
    if (m === "GET") return a.failGet ? json({ message: "boom" }, 500) : json(a.row ? [a.row] : []);
    if (m === "POST") { a.posts++; const b = JSON.parse(init.body); a.row = { ...b, updated_at: "2026-11-17T10:00:00Z" }; return json([a.row], 201); }
    if (m === "PATCH") { a.patches++; return json([]); }
    return json({}, 500); }; }`);
const old = baseSeed({ language: "en", transactions: [tx({ id: 88001, amount: 12.5, merchant: "Old phone" }), tx({ id: 88002, amount: 3, merchant: "Old phone 2" })] });
const ROW = { data: old, version: 4, device: "Android app", updated_at: "2026-11-10T10:00:00Z" };
const confirmImport = (page) => page.evaluate(() => { const b = [...document.querySelectorAll(".sheet-overlay button")].find((x) => /^(Add|Merge|Import)/i.test(x.innerText.trim())); if (b) { b.click(); return b.innerText.trim(); } return null; });
const cancelImport = (page) => page.evaluate(() => { const b = document.querySelector('.sheet-overlay [data-closer="1"]'); if (b) b.click(); return !!b; });

section("R104-R1. A new person with an empty account: this phone's copy is saved, then the quick questions");
{
  const page = await fresh({ pre: fake() }); await pickLang(page, "en");
  ok(await has(page, '[data-ob="google"]') && await has(page, '[data-ob="drive"]') && await has(page, '[data-ob="guest"]'), "after the language: account, Google Drive restore, or guest (account is optional)");
  await click(page, '[data-ob="google"]'); await page.waitForSelector(".setup-page", { timeout: 5000 }); await wait(300);
  const a = await srv(page);
  ok(a.posts === 1 && (await obKey(page)) === "setup" && (await acctKey(page)).paused === "", "one empty copy saved to the new account; questions follow", { posts: a.posts });
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-R2. Returning person: the account's records wait for confirmation; cancel comes back to a choice, not to an empty app");
{
  const page = await fresh({ pre: fake({ row: ROW }) }); await pickLang(page, "en");
  await click(page, '[data-ob="google"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(400);
  ok((await obKey(page)) === "restore" && (await state(page)).transactions.length === 0, "preview open, nothing restored yet, the scene remembers it is restoring");
  ok(await cancelImport(page), "the preview has a Cancel button"); await wait(500);
  ok(await has(page, '[data-section="ob-restore"]') && await has(page, '[data-ob="restore-review"]') && await has(page, '[data-ob="restore-fresh"]'), "after Cancel: 'Check my records' or 'Start fresh', not an empty app");
  const a = await srv(page);
  ok(a.posts === 0 && a.patches === 0 && a.row.version === 4 && (await state(page)).transactions.length === 0, "the account and this phone are both untouched", a);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-R3. Interrupted restore: a reload comes back to the restore page; confirming restores exactly the saved records once");
{
  const page = await fresh({ pre: fake({ row: ROW }) }); await pickLang(page, "en");
  await click(page, '[data-ob="google"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(300);
  // the app is closed while the preview is open
  await page.reload(); await page.waitForSelector('[data-section="ob-restore"]', { timeout: 5000 }); await wait(300);
  ok((await obKey(page)) === "restore" && (await state(page)).transactions.length === 0 && (await acctKey(page)).paused === "restore", "after the reload: the restore page again, nothing applied, account saving still waits");
  await click(page, '[data-ob="restore-review"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(400);
  const btn = await confirmImport(page); await wait(800);
  const s = await state(page), k = await acctKey(page), ids = s.transactions.map((x) => String(x.id)).sort();
  ok(btn && s.transactions.length === 2 && ids.join() === "88001,88002", "confirmed: exactly the two saved entries, no duplicates", { btn, ids });
  ok((await obKey(page)) === "done" && !(await has(page, '[data-section="onboarding"]')) && !(await has(page, ".setup-page")), "the scene ends; no quick questions (the restored records are this person's set-up)");
  ok(k && k.version === 4 && k.paused === "", "account saving resumes from the account's version (4)", k);
  await page.reload(); await wait(800);
  ok((await state(page)).transactions.length === 2 && !(await has(page, '[data-section="onboarding"]')), "after another reload the restored records are still there, once");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-R4. 'Start fresh on this phone': the questions follow; the saved records in the account are never overwritten");
{
  const page = await fresh({ pre: fake({ row: ROW }) }); await pickLang(page, "en");
  await click(page, '[data-ob="google"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(300);
  await cancelImport(page); await page.waitForSelector('[data-ob="restore-fresh"]', { timeout: 3000 }); await wait(300);
  const sub = await page.evaluate(() => document.querySelector('[data-ob="restore-fresh"]').innerText);
  ok(/untouched/.test(sub), "the choice says the account's records stay untouched", sub);
  await click(page, '[data-ob="restore-fresh"]'); await page.waitForSelector(".setup-page", { timeout: 4000 }); await wait(300);
  ok((await obKey(page)) === "setup" && (await acctKey(page)).paused === "restore", "questions now; account saving still paused");
  // skip the questions and stay in the app: the fresh ledger must not reach the account on its own
  await page.evaluate(() => { const b = [...document.querySelectorAll(".setup-page button")].find((x) => /skip/i.test(x.innerText)); if (b) b.click(); }); await wait(6900);
  const a = await srv(page);
  ok(a.posts === 0 && a.patches === 0 && a.row.version === 4 && a.row.data.transactions.length === 2, "after 6 s in the app: nothing was saved to the account (version 4, 2 entries)", a);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-R5. Failed restore: the message stays on the page; guest and 'Start fresh' still work");
{
  let page = await fresh({ pre: fake({ row: ROW, failGet: true }) }); await pickLang(page, "en");
  await click(page, '[data-ob="google"]'); await page.waitForSelector('[data-section="ob-error"]', { timeout: 5000 });
  ok((await obKey(page)) === "account" && (await state(page)).transactions.length === 0 && (await srv(page)).posts === 0, "the account could not be read: still on the account page, nothing written anywhere");
  ok(!(await page.$eval('[data-ob="guest"]', (b) => b.disabled)), "'Continue as guest' is still there");
  await page.close();
  // the account was read once, then the server failed when the person came back to check
  page = await fresh({ pre: fake({ row: ROW }) }); await pickLang(page, "en");
  await click(page, '[data-ob="google"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(300);
  await cancelImport(page); await page.waitForSelector('[data-ob="restore-review"]', { timeout: 3000 });
  await page.evaluate(() => { window.__acct.failGet = true; });
  await click(page, '[data-ob="restore-review"]'); await page.waitForSelector('[data-section="ob-error"]', { timeout: 5000 });
  ok((await obKey(page)) === "restore" && await has(page, '[data-ob="restore-fresh"]') && (await state(page)).transactions.length === 0, "the error is on the restore page; the choice is still there; nothing applied");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-R6. A damaged account copy is refused; closing the message comes back to the restore page");
{
  const page = await fresh({ pre: fake({ row: { data: { transactions: "not a list" }, version: 2, device: "x", updated_at: "2026-11-14T08:00:00Z" } }) }); await pickLang(page, "en");
  await click(page, '[data-ob="google"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(300);
  await cancelImport(page); await wait(500);
  ok(await has(page, '[data-section="ob-restore"]') && (await state(page)).transactions.length === 0 && (await srv(page)).patches === 0, "nothing applied, nothing written; the restore choice is shown again");
  await page.close();
}

section("R104-R7. Google Drive backup on the first launch: checked in the preview, then restored once; Drive backup switches on");
{
  const file = JSON.stringify(baseSeed({ language: "en", transactions: [tx({ id: 88101, amount: 7, merchant: "Drive Kafe" }), tx({ id: 88102, amount: 9, merchant: "Drive Taxi" })] }));
  const page = await fresh({ pre: fake({ file }) }); await pickLang(page, "en");
  await click(page, '[data-ob="drive"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(400);
  ok((await state(page)).transactions.length === 0 && (await obKey(page)) === "account", "preview open; nothing restored yet");
  const btn = await confirmImport(page); await wait(800);
  const s = await state(page), d = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5__drive") || "null"));
  ok(btn && s.transactions.map((x) => String(x.id)).sort().join() === "88101,88102", "confirmed: exactly the two Drive entries", btn);
  ok((await obKey(page)) === "done" && d && d.on === true && (await acctKey(page)) === null, "the scene ends, Drive backup is on, and no account was created");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-R8. No Drive backup, or a cancelled Drive preview: back on the same page with the other choices");
{
  let page = await fresh({ pre: fake() }); await pickLang(page, "en");
  await click(page, '[data-ob="drive"]'); await page.waitForSelector('[data-section="ob-error"]', { timeout: 5000 });
  ok(/no backup/i.test(await page.evaluate(() => document.querySelector('[data-section="ob-error"]').innerText)) && (await obKey(page)) === "account", "no backup in Drive: said on the page; still choosing");
  await page.close();
  const file = JSON.stringify(baseSeed({ language: "en", transactions: [tx({ id: 88201, amount: 7 })] }));
  page = await fresh({ pre: fake({ file }) }); await pickLang(page, "en");
  await click(page, '[data-ob="drive"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(300);
  await cancelImport(page); await wait(500);
  ok(await has(page, '[data-section="ob-account"]') && (await state(page)).transactions.length === 0, "cancelled: back to account / Drive / guest, nothing added");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-R9. A phone that already has records never sees the scene");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }), pre: () => { try { if (!sessionStorage.getItem("__o9")) { sessionStorage.setItem("__o9", "1"); localStorage.removeItem("expense_ledger_v5__onboard"); } } catch (e) {} } });
  ok(!(await has(page, '[data-section="onboarding"]')) && (await state(page)).transactions.length === 1, "no scene; the record is kept");
  await page.close();
}

section("R104-R10. The new pages in Azerbaijani and Russian");
for (const [l, re] of [["az", /Hesabınızda artıq qeydlər var/], ["ru", /В вашем аккаунте уже есть записи/]]) {
  const page = await fresh({ pre: fake({ row: ROW }) }); await pickLang(page, l);
  const drive = await page.evaluate(() => document.querySelector('[data-ob="drive"]').innerText);
  await click(page, '[data-ob="google"]'); await page.waitForSelector(".sheet-overlay", { timeout: 5000 }); await wait(300);
  await cancelImport(page); await page.waitForSelector('[data-section="ob-restore"]', { timeout: 3000 });
  const txt = await page.evaluate(() => document.querySelector('[data-section="ob-restore"]').innerText);
  ok(re.test(txt) && !/ob\./.test(txt + drive) && /Google Drive/.test(drive), l + ": restore page and Drive choice translated, no raw keys", txt.slice(0, 80));
  await page.close();
}
await browser.close();
finish("e2e_run104_restore");
