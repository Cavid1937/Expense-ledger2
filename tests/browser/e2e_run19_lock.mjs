// Run 19: app lock (PIN + optional fingerprint). Synthetic data only. Covers: setting a PIN, locking on reopen, wrong/right PIN, wait after
// repeated mistakes (kept across a reload), lock after time away / idle, forgot-PIN (removes the lock, records untouched), a damaged lock
// record, changing and turning off the PIN, the "not encryption" wording, and (when this browser offers it) a fingerprint through a
// virtual authenticator. Reaching screens is by position/data-section, never by English labels, so the same steps run in az.
import http from "http"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { launch, openPage, state, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const LK = "expense_ledger_v5__lock";
const lockRaw = (page) => page.evaluate((k) => localStorage.getItem(k), LK);
const ledgerRaw = (page) => page.evaluate(() => localStorage.getItem("expense_ledger_v5"));
const isLocked = (page) => page.evaluate(() => { const s = document.querySelector(".lock-screen"); const t = document.querySelector(".tabbar"); return !!s && (!t || t.getClientRects().length === 0); });
const isOpen = (page) => page.evaluate(() => !document.querySelector(".lock-screen") && !!document.querySelector(".tabbar") && document.querySelector(".tabbar").getClientRects().length > 0);
const openLockSheet = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => { const r = document.querySelectorAll(".more-page .list-row"); r[r.length - 1].click(); }); await page.waitForSelector('[data-section="lock-sheet"]'); await wait(250); };
const setField = (page, sel, v) => page.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const end = async (page) => { await page.evaluate((k) => localStorage.removeItem(k), LK); await page.close(); };
const typePin = async (page, pin) => { await page.keyboard.type(pin); await wait(120); };
const submit = async (page) => { await page.keyboard.press("Enter"); await wait(450); };
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(300); };
const setPin = async (page, pin) => { await openLockSheet(page); await setField(page, "#lock-pin-a", pin); await setField(page, "#lock-pin-b", pin); await click(page, '[data-section="lock-save"]'); await wait(500); };
const seed = (o = {}) => baseSeed({ language: "en", ...o });

section("R19-E1. Set a PIN; the PIN is never stored; the ledger is untouched");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  ok((await lockRaw(page)) === null, "no lock to begin with");
  const before = await ledgerRaw(page);
  await openLockSheet(page);
  const note = await page.evaluate(() => document.querySelector('[data-section="lock-notenc"]').innerText);
  ok(/does not encrypt/i.test(note), "the sheet says plainly that the lock does not encrypt the data", note);
  await setField(page, "#lock-pin-a", "2468"); await setField(page, "#lock-pin-b", "2469"); await click(page, '[data-section="lock-save"]');
  ok(/different/i.test(await page.evaluate(() => (document.querySelector('[data-section="lock-setup"] .field-error') || {}).innerText || "")) && (await lockRaw(page)) === null, "two different PINs: refused, nothing saved");
  await setField(page, "#lock-pin-a", "12"); await setField(page, "#lock-pin-b", "12"); await click(page, '[data-section="lock-save"]');
  ok((await lockRaw(page)) === null, "a 2-digit PIN is refused");
  await setField(page, "#lock-pin-a", "2468"); await setField(page, "#lock-pin-b", "2468"); await click(page, '[data-section="lock-save"]'); await wait(600);
  const raw = await lockRaw(page);
  ok(!!raw && !raw.includes("2468"), "a lock record is saved and the PIN is not in it", raw && raw.slice(0, 60));
  ok((await ledgerRaw(page)) === before, "the ledger key is byte-for-byte unchanged");
  ok(await isOpen(page), "after setting the PIN the app stays open (no lock-out surprise)");
  await end(page);
}

section("R19-E2. Reopen: locked; wrong PIN refused; right PIN opens with all data");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await setPin(page, "2468"); const before = await ledgerRaw(page);
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  ok(await isLocked(page), "after a reload the lock screen is shown and the app behind it is hidden");
  ok(await page.evaluate(() => document.querySelector(".lock-screen").getAttribute("aria-modal") === "true"), "it is a modal dialog for screen readers");
  await typePin(page, "1111"); await submit(page);
  ok(await isLocked(page) && /not right/i.test(await page.evaluate(() => document.querySelector('[data-section="lock-msg"]').innerText)), "a wrong PIN keeps it locked and says so");
  await typePin(page, "2468"); await submit(page); await wait(300);
  ok(await isOpen(page), "the right PIN opens the app");
  ok((await ledgerRaw(page)) === before, "all records are exactly as they were");
  ok(JSON.parse(await lockRaw(page)).fails === 0, "the wrong-try counter is back to zero");
  await end(page);
}

section("R19-E3. Five wrong PINs: a wait that survives a reload");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await setPin(page, "2468");
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  for (let i = 0; i < 5; i++) { await typePin(page, "0000"); await submit(page); }
  const msg = await page.evaluate(() => document.querySelector('[data-section="lock-msg"]').innerText);
  ok(/wait/i.test(msg), "after the fifth mistake it asks to wait", msg);
  ok(await page.evaluate(() => [...document.querySelectorAll(".lock-pad .numpad-key")].filter((b) => /^[0-9]$/.test(b.innerText)).every((b) => b.disabled)), "the keypad is disabled during the wait");
  await typePin(page, "2468"); await submit(page);
  ok(await isLocked(page), "even the right PIN is not accepted during the wait");
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(400);
  ok(/wait/i.test(await page.evaluate(() => document.querySelector('[data-section="lock-msg"]').innerText)), "closing and reopening does not clear the wait");
  await end(page);
}

section("R19-E4. Lock after time away and when idle (clock moved in the page)");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await setPin(page, "2468");
  const away = (ms) => page.evaluate(async (ms) => { const real = Date.now; const vs = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange"));
    Date.now = () => real() + ms; Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange"));
    Date.now = real; delete document.visibilityState; }, ms);
  await away(500); await wait(300);
  ok(await isLocked(page), "default 'every time I leave it': even a short absence locks");
  await typePin(page, "2468"); await submit(page); await wait(300);
  await openLockSheet(page);
  await page.evaluate(() => document.querySelector('input[name="lock-after"][value="5"]').click()); await wait(300);
  ok(JSON.parse(await lockRaw(page)).timeout === 5, "the 5-minute choice is saved");
  await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(300);
  await away(4 * 60000); await wait(300);
  ok(await isOpen(page), "5 minutes chosen: 4 minutes away does not lock");
  await away(5 * 60000 + 1000); await wait(300);
  ok(await isLocked(page), "5 minutes chosen: 5 minutes away locks");
  await typePin(page, "2468"); await submit(page); await wait(300);
  await openLockSheet(page);
  await page.evaluate(() => document.querySelector('input[name="lock-after"][value="1"]').click()); await wait(300);
  await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(300);
  await page.evaluate(() => { const real = Date.now; window.__realNow = real; Date.now = () => real() + 61000; });
  await wait(5600);
  ok(await isLocked(page), "1 minute chosen: no touch for a minute while open locks the app");
  await end(page);
}

section("R19-E5. Forgot the PIN: the lock goes, the records stay");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await setPin(page, "2468"); const before = await ledgerRaw(page);
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  await click(page, '[data-section="lock-forgot-btn"]');
  ok(await page.evaluate(() => document.querySelector('[data-section="lock-remove"]').disabled), "'Remove the lock' is disabled: it is not a quick bypass");
  const expl = await page.evaluate(() => document.querySelector('[data-section="lock-forgot"]').innerText);
  ok(/24 hours/i.test(expl) && /records stay/i.test(expl) && /cancels/i.test(expl), "it explains the 24 hours, that records stay, and that the right PIN cancels it", expl.slice(0, 160));
  const r1 = JSON.parse(await lockRaw(page));
  ok(r1.resetAt > 0, "the time of the request is stored with the lock");
  ok(/\d+ h/.test(await page.evaluate(() => document.querySelector('[data-section="lock-remove"]').innerText)), "the button shows the hours left");
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  await click(page, '[data-section="lock-forgot-btn"]');
  ok(JSON.parse(await lockRaw(page)).resetAt === r1.resetAt, "closing and reopening does not restart the 24 hours");
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  await typePin(page, "2468"); await wait(500);
  ok(await isOpen(page), "the right PIN still opens the app");
  ok(JSON.parse(await lockRaw(page)).resetAt === 0, "and it cancels the removal request");
  await page.evaluate((k) => { const r = JSON.parse(localStorage.getItem(k)); r.resetAt = Date.now() - 25 * 3600 * 1000; localStorage.setItem(k, JSON.stringify(r)); }, LK);
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  await click(page, '[data-section="lock-forgot-btn"]');
  ok(await page.evaluate(() => !document.querySelector('[data-section="lock-remove"]').disabled), "25 hours after the request it becomes available");
  await click(page, '[data-section="lock-remove"]'); await wait(400);
  ok(await isOpen(page), "the app opens");
  ok((await lockRaw(page)) === null, "the lock record is gone");
  ok((await ledgerRaw(page)) === before, "the ledger is exactly as it was");
  await page.reload(); await wait(800);
  ok(await isOpen(page), "it opens straight away next time (no lock)");
  await end(page);
}

section("R19-E6. A damaged lock record offers only the reset; records stay");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  const before = await ledgerRaw(page);
  await page.evaluate((k) => localStorage.setItem(k, "{not json"), LK);
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  ok(await page.evaluate(() => !document.querySelector(".lock-pad") && !!document.querySelector('[data-section="lock-forgot"]')), "no keypad, just the reset panel");
  await wait(10800); await click(page, '[data-section="lock-remove"]'); await wait(400);
  ok(await isOpen(page) && (await lockRaw(page)) === null && (await ledgerRaw(page)) === before, "reset opens the app, clears the bad record, records unchanged");
  await end(page);
}

section("R19-E7. Change the PIN, then turn the lock off");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await setPin(page, "2468");
  await openLockSheet(page); await click(page, '[data-section="lock-change-go"]');
  await setField(page, "#lock-pin-c", "9999"); await setField(page, "#lock-pin-a", "1357"); await setField(page, "#lock-pin-b", "1357"); await click(page, '[data-section="lock-change-save"]');
  ok(/not right/i.test(await page.evaluate(() => (document.querySelector('[data-section="lock-change"] .field-error') || {}).innerText || "")), "changing with a wrong current PIN is refused");
  const old = await lockRaw(page);
  await setField(page, "#lock-pin-c", "2468"); await click(page, '[data-section="lock-change-save"]'); await wait(600);
  ok((await lockRaw(page)) !== old, "with the right current PIN the new PIN is saved");
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  await typePin(page, "2468"); await submit(page); ok(await isLocked(page), "the old PIN no longer works");
  await typePin(page, "1357"); await submit(page); await wait(300); ok(await isOpen(page), "the new PIN works");
  const before = await ledgerRaw(page);
  await openLockSheet(page); await click(page, '[data-section="lock-off-go"]');
  await setField(page, "#lock-pin-c", "0000"); await click(page, '[data-section="lock-off-save"]');
  ok((await lockRaw(page)) !== null, "turning off with a wrong PIN does nothing");
  await setField(page, "#lock-pin-c", "1357"); await click(page, '[data-section="lock-off-save"]'); await wait(500);
  ok((await lockRaw(page)) === null && (await ledgerRaw(page)) === before, "with the right PIN the lock is removed and the ledger is unchanged");
  await end(page);
}

section("R19-E8. The lock screen speaks the saved language (az) and stays usable at 200% text");
{
  const page = await openPage(browser, { seed: seed({ language: "az" }) }); await settle(page);
  await setPin(page, "2468");
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  ok(/PIN/.test(await page.evaluate(() => document.querySelector(".lock-title").innerText)) && /daxil/i.test(await page.evaluate(() => document.querySelector(".lock-title").innerText)), "az title", await page.evaluate(() => document.querySelector(".lock-title").innerText));
  const fits = await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; const r = document.querySelector(".lock-screen").getBoundingClientRect(); const bad = [...document.querySelectorAll(".lock-screen button")].filter((b) => { const x = b.getBoundingClientRect(); return x.width > 1 && (x.right > innerWidth + 1 || x.left < -1); }); document.documentElement.style.fontSize = ""; return bad.length; });
  ok(fits === 0, "no button runs off the screen at 200% text");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await end(page);
}

section("R19-E9. Fingerprint (virtual authenticator) — only if this browser offers it");
{
  // WebAuthn needs a real origin, not file://: the built page is served from a tiny local server for this section only.
  const root = path.dirname(fileURLToPath(process.env.PAGE_URL)), types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
  const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split("?")[0])); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, "index.html"); r.setHeader("content-type", types[path.extname(p)] || "application/octet-stream"); r.end(fs.readFileSync(p)); });
  await new Promise((res) => srv.listen(0, res));
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844 }); page.errors = []; page.on("pageerror", (e) => page.errors.push(String(e)));
  await page.evaluateOnNewDocument((k, d) => { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); localStorage.setItem(k, JSON.stringify(d)); } }, "expense_ledger_v5", seed());
  await page.goto(`http://localhost:${srv.address().port}/`); await page.waitForSelector(".tabbar"); await wait(600);
  const cdp = await page.createCDPSession();
  let virtual = true;
  try { await cdp.send("WebAuthn.enable"); await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } }); } catch { virtual = false; }
  await setPin(page, "2468");
  await openLockSheet(page);
  const avail = await page.evaluate(() => !!document.querySelector('[data-section="lock-bio-toggle"]'));
  if (!virtual || !avail) {
    console.log("  · NOT TESTED HERE: this browser/origin gives no platform authenticator" + (virtual ? "" : " (no virtual authenticator)") + "; the fallback text is checked instead");
    ok(await page.evaluate(() => !!document.querySelector('[data-section="lock-bio-no"]')), "without a fingerprint option the sheet says it is unavailable (the PIN works alone)");
  } else {
    await click(page, '[data-section="lock-bio-toggle"]'); await wait(800);
    ok(!!JSON.parse(await lockRaw(page)).bio, "fingerprint set up: a credential id is stored (not the fingerprint)");
    await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(250);
    await page.reload(); await page.waitForSelector(".tabbar"); await wait(1500);
    ok(await isOpen(page), "with the fingerprint on, the app opens by itself on start: the phone's prompt is offered without a tap");
    await cdp.send("WebAuthn.disable"); await page.reload(); await page.waitForSelector(".tabbar"); await wait(1500);
    ok(await page.evaluate(() => !!document.querySelector('[data-section="lock-bio"]')), "the lock screen still has the fingerprint button for another try");
    ok(await isLocked(page), "if the fingerprint check fails the app stays locked and the PIN still works");
    await typePin(page, "2468"); await submit(page); await wait(300);
    ok(await isOpen(page), "PIN opens it");
  }
  await page.evaluate((k) => localStorage.removeItem(k), LK); srv.closeAllConnections?.(); srv.close();   // the page is left to browser.close(): an unanswered phone prompt can hold page.close() up
}
section("R22-L. Opens by itself on the last digit; the buttons are styled, not the browser's grey default");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await setPin(page, "2468");
  ok(JSON.parse(await lockRaw(page)).len === 4, "the PIN length (4) is saved so the app knows when the PIN is complete");
  await page.reload(); await page.waitForSelector(".lock-screen"); await wait(300);
  ok(await page.evaluate(() => !document.querySelector('[data-section="lock-go"]')), "no separate unlock button is needed");
  ok(await page.evaluate(() => { const b = document.querySelector('[data-section="lock-forgot-btn"]'); const s = getComputedStyle(b); return s.appearance === "none" && parseFloat(s.minHeight) >= 48; }), "Forgot PIN is a plain, large tap target, not the native grey button");
  await typePin(page, "2468"); await wait(500);
  ok(await isOpen(page), "typing the correct 4th digit opens the app with no Enter or button");
  await openLockSheet(page);
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-section="lock-sheet"] .btn:not(.btn-primary)')].every((b) => { const s = getComputedStyle(b); return s.appearance === "none" && s.borderRadius === "14px" && parseFloat(s.minHeight) >= 48; })), "every secondary button in the lock sheet is styled (14px corners, 48px tall)");
  await page.evaluate((k) => localStorage.removeItem(k), LK); await page.close();
}
// An unanswered phone prompt (the deliberately failed fingerprint check) can keep a headless Chrome from closing politely, so it is ended directly.
try { browser.process()?.kill("SIGKILL"); } catch { /* already gone */ }
await finish("e2e_run19_lock");
