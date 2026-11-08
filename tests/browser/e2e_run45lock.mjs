// Run 45 (2026-11-08): lock screen polish from the owner's phone recording. The phone's fingerprint prompt used to open instantly over a blank
// screen; now the PIN screen draws first and the prompt follows about 0.65 s later. Cancelling the prompt is a quiet hint, not red error text.
// A wrong PIN shakes the dots. Synthetic data only; the fingerprint call is a stub that records when it was made and then refuses.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const LK = "expense_ledger_v5__lock";
const seed = (o = {}) => baseSeed({ language: "en", ...o });
const setField = (page, sel, v) => page.$eval(sel, (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);

section("R45-L1. The fingerprint prompt waits for the PIN screen, then a cancel is a quiet hint");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelector('.more-page [data-more="lock"]').click()); await page.waitForSelector('[data-section="lock-sheet"]'); await wait(250);
  await setField(page, "#lock-pin-a", "2468"); await setField(page, "#lock-pin-b", "2468");
  await page.evaluate(() => document.querySelector('[data-section="lock-save"]').click()); await wait(700);
  // pretend a fingerprint was set up (a credential id is all the lock stores)
  await page.evaluate((k) => { const r = JSON.parse(localStorage.getItem(k)); r.bio = "AAAAAAAAAAAAAAAAAAAAAA=="; localStorage.setItem(k, JSON.stringify(r)); }, LK);
  await page.evaluateOnNewDocument(() => {
    window.__bioAt = 0; window.__t0 = performance.now();
    Object.defineProperty(navigator, "credentials", { configurable: true, value: { get: () => { window.__bioAt = performance.now(); window.__padThen = !!document.querySelector(".lock-pad"); return Promise.reject(new Error("cancelled")); } } });
  });
  await page.reload(); await page.waitForSelector(".lock-screen");
  const early = await page.evaluate(() => window.__bioAt);
  ok(early === 0, "the fingerprint prompt has not been asked for the moment the lock screen appears");
  await wait(2000);
  const at = await page.evaluate(() => ({ t: window.__bioAt, pad: window.__padThen, t0: window.__t0 }));
  ok(at.t > 0 && at.t - at.t0 >= 1200, "it is asked for well over a second after the page starts", String(Math.round(at.t - at.t0)));
  ok(at.pad === true, "the PIN keys were already on screen when the prompt was requested");
  const hint = await page.evaluate(() => { const m = document.querySelector('[data-section="lock-msg"]'); return { txt: m.innerText, soft: m.classList.contains("soft") }; });
  ok(/Fingerprint not confirmed/.test(hint.txt) && hint.soft, "cancelling gives a quiet hint (not the red error style)", JSON.stringify(hint));
  await page.keyboard.type("1111"); await wait(700);
  const bad = await page.evaluate(() => { const m = document.querySelector('[data-section="lock-msg"]'); return { txt: m.innerText, soft: m.classList.contains("soft"), shake: document.querySelector('[data-section="lock-dots"]').classList.contains("shake") }; });
  ok(/not right/i.test(bad.txt) && !bad.soft, "a wrong PIN is still shown as an error", JSON.stringify(bad));
  ok(bad.shake, "the dots shake on a wrong PIN");
  await page.keyboard.type("2468"); await wait(700);
  ok(await page.evaluate(() => !document.querySelector(".lock-screen")), "the right PIN still opens the app");
  await page.evaluate((k) => localStorage.removeItem(k), LK); await page.close();
}

section("R45-L2. The lock screen fits a small phone without scrolling");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, salt: "AAAAAAAAAAAAAAAAAAAAAA==", hash: "x", iter: 1000, timeout: 0, bio: null, len: 4, fails: 0, until: 0 })), LK);
  for (const [w, h] of [[360, 640], [400, 860]]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.reload(); await page.waitForSelector(".lock-screen"); await wait(900);
    const fit = await page.evaluate(() => { const s = document.querySelector(".lock-screen"); const k = [...document.querySelectorAll(".lock-pad .numpad-key")].map((e) => e.getBoundingClientRect()); const f = document.querySelector('[data-section="lock-forgot-btn"]').getBoundingClientRect(); return { scroll: s.scrollHeight > s.clientHeight + 1, keyH: Math.round(k[0].height), keyW: Math.round(k[0].width), bottom: Math.round(f.bottom), vh: window.innerHeight }; });
    ok(!fit.scroll && fit.bottom <= fit.vh, `${w}x${h}: everything fits without scrolling`, JSON.stringify(fit));
    ok(fit.keyH >= 54, `${w}x${h}: keys are at least 54 px tall`, JSON.stringify(fit));
  }
  await page.evaluate((k) => localStorage.removeItem(k), LK); await page.close();
}
await browser.close(); finish("e2e_run45lock");
