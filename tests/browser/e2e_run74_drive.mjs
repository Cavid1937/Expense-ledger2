// Run 74 in the real bundled app: Google Drive backup on Import / Export. Google is stood in for: window.LedgerNative.google gives a token
// (as the Android app will) and the page's fetch answers Drive calls from an in-memory folder. Synthetic data only.
import { launch, openPage, openData, state, ok, section, finish, baseSeed, tx, wait, toast } from "./lib.mjs";
const browser = await launch();
const FAKE = `{
  window.__drive = { files: {}, calls: [] };
  window.LedgerNative = Object.assign(window.LedgerNative || {}, { google: { getToken: async () => ({ token: "T1" }), revoke: async () => { window.__drive.revoked = true; } } });
  const real = window.fetch;
  window.fetch = async function (u, o = {}) {
    const url = String(u); if (!/googleapis\\.com/.test(url)) return real.apply(this, arguments);
    const d = window.__drive; d.calls.push({ url, method: o.method });
    const J = (s, b) => new Response(typeof b === "string" ? b : JSON.stringify(b), { status: s });
    if (o.headers && o.headers.Authorization !== "Bearer T1") return J(401, "{}");
    const p = new URL(url).pathname;
    if (p === "/drive/v3/files" && o.method === "GET") return J(200, { files: Object.values(d.files).map((f) => ({ id: f.id, modifiedTime: f.t, size: String(f.text.length) })) });
    if (p === "/upload/drive/v3/files" && o.method === "POST") { const parts = String(o.body).split("\\r\\n\\r\\n"); const text = parts[2].replace(/\\r\\n--ledger\\w+--$/, ""); d.files.f1 = { id: "f1", text, t: "2026-11-13T10:00:00Z" }; return J(200, { id: "f1", modifiedTime: "2026-11-13T10:00:00Z" }); }
    if (p === "/upload/drive/v3/files/f1" && o.method === "PATCH") { d.files.f1.text = o.body; d.files.f1.t = "2026-11-13T11:00:00Z"; return J(200, { id: "f1", modifiedTime: d.files.f1.t }); }
    if (p === "/drive/v3/files/f1") return J(200, d.files.f1.text);
    return J(404, "{}");
  };
}`;
const seed = () => baseSeed({ language: "en", transactions: [tx({ merchant: "Bravo Market", amount: 23.45 }), tx({ merchant: "Metro", amount: 0.9 })] });

section("R74-B1. Off by default; nothing goes to Google until the person taps");
{
  const page = await openPage(browser, { seed: seed() }); const seen = []; page.on("request", (r) => { if (/google/.test(r.url())) seen.push(r.url()); });
  await openData(page); await wait(400);
  const card = await page.evaluate(() => (document.querySelector('[data-section="io-drive"]') || {}).innerText || "");
  ok(/Google Drive backup/.test(card) && /cannot see your other files/.test(card) && !!(await page.$('[data-section="drive-connect"]')), "the card explains what Google can and cannot see, with a Connect button", card.slice(0, 200));
  await page.reload(); await wait(1500); await openData(page); await wait(500);
  ok(seen.length === 0, "no request to any Google address before a tap (also after a reload)", seen);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R74-B2. Connect backs up, Restore opens the normal review, Disconnect forgets");
{
  const page = await openPage(browser, { seed: seed(), fresh: true, pre: FAKE }); await openData(page);
  await page.evaluate(() => document.querySelector('[data-section="drive-connect"]').click()); await wait(1200);
  const d = await page.evaluate(() => ({ text: (window.__drive.files.f1 || {}).text || "", last: (document.querySelector('[data-section="drive-last"]') || {}).innerText || "", pref: JSON.parse(localStorage.getItem("expense_ledger_v5__drive") || "null") }));
  ok(d.text.includes("Bravo Market") && JSON.parse(d.text).transactions.length === 2, "the whole backup (both entries) is now in the app's Drive folder", d.text.slice(0, 80));
  ok(/Last backed up to Google Drive/.test(d.last) && d.pref && d.pref.on === true && Object.keys(d.pref).sort().join() === "fails,lastAt,lastDay,lastError,lastHash,on", "the card says when it last backed up; the stored choice holds no sign-in token", d);
  const st = await state(page); ok(st.lastBackup && st.backupConfirmedAt, "it counts as a confirmed backup (the backup reminder is satisfied)");
  // a second entry is added on another phone's copy: restore must show it in the review, not add it silently
  await page.evaluate(() => { const o = JSON.parse(window.__drive.files.f1.text); o.transactions.push({ id: 99901, type: "expense", amount: 7, category: "food", subcategory: "", merchant: "Kafe Restored", note: "", date: "2026-11-01", recurring: false, recurFreq: null, isActive: true }); window.__drive.files.f1.text = JSON.stringify(o); });
  await page.evaluate(() => document.querySelector('[data-section="drive-restore"]').click()); await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 6000 }); await wait(400);
  const sheet = await page.evaluate(() => document.querySelector('[aria-label="Restore backup"]').innerText);
  ok(/Google Drive backup/.test(sheet) && /New, will be added: 1/.test(sheet), "Restore opens the usual review: one new entry to add, the two already here recognised", sheet.slice(0, 300));
  ok((await state(page)).transactions.length === 2, "nothing is added until the person confirms");
  await page.keyboard.press("Escape"); await wait(500);
  await page.evaluate(() => document.querySelector('[data-section="drive-off"]').click()); await wait(200);
  await page.evaluate(() => document.querySelector('[data-section="drive-off-yes"]').click()); await wait(500);
  const off = await page.evaluate(() => ({ connect: !!document.querySelector('[data-section="drive-connect"]'), revoked: !!window.__drive.revoked, pref: JSON.parse(localStorage.getItem("expense_ledger_v5__drive") || "null"), file: !!window.__drive.files.f1 }));
  ok(off.connect && off.revoked && off.pref && off.pref.on === false && off.file, "Disconnect: the sign-in is withdrawn, the card is back to Connect, the copy in Drive is left alone", off);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R74-B3. A failed backup says why and changes nothing");
{
  const page = await openPage(browser, { seed: seed(), fresh: true, pre: FAKE + ";window.LedgerNative.google.getToken=async()=>({token:'EXPIRED'});" }); await openData(page);
  await page.evaluate(() => document.querySelector('[data-section="drive-connect"]').click()); await wait(1000);
  const tt = await toast(page, 50);
  ok(/sign-in is needed again/i.test(tt) && (await page.evaluate(() => !window.__drive.files.f1)), "an expired sign-in: the message says to sign in again; nothing was written", tt);
  ok((await state(page)).transactions.length === 2 && !(await state(page)).backupConfirmedAt, "the ledger and its backup status are untouched");
  await page.close();
}
await browser.close();
finish("e2e_run74_drive");
