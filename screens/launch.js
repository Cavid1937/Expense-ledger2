// Run 40 (8 Nov 2026), owner: "The APK app opens instantly which is bad for users, look at the video" (another app's launch, recorded on his phone).
// What the recording shows (design-refs/claude-app-feel/video3-open*): a plain screen with the logo centred for about half a second, then the logo
// glides up (~0.35 s, fast start, soft landing) while the page fades in beneath it (~0.2 s, starting just after the logo moves).
//
// Ours, as one motion with Android's own launch screen:
//   1. Android shows our icon centred on the app's dark colour (Android project: launcher icon + windowSplashScreenBackground #07151A).
//   2. The page shows the SAME mark in the same place before any script has run (a static copy of LAUNCH_HTML / LAUNCH_CSS is in index.html),
//      so there is no blink when Android hands over. The app's name fades in under the mark.
//   3. When the first screen is drawn (and at least HOLD_MS after start), the mark and name glide up and dissolve while the app rises in.
// Never blocks: a tap skips it, it removes itself after MAX_MS even if the app never reports ready, and reduced motion / "Reduce effects" get a short fade.
// Automated test browsers (navigator.webdriver) skip it unless a test sets window.__forceLaunch, so other tests are not slowed or blocked.
export const LAUNCH_ID = "launch";
export const HOLD_MS = 520, OUT_MS = 560, MAX_MS = 2600;

// The mark is the app icon's glyph (public/icon.svg without its rounded background), 102 px tall: the size Android draws the launcher icon's
// glyph on its launch screen (46 of 108 units of a 240 dp adaptive icon), so the hand-over lines up.
export const LAUNCH_HTML = '<div id="launch" aria-hidden="true"><div class="launch-in"><svg class="launch-mark" viewBox="127 95 258 322" width="82" height="102"><rect x="136" y="104" width="240" height="304" rx="36" fill="#0E2229" stroke="#4CC9C4" stroke-width="18"/><path d="M180 190H332M180 246H332M180 302H262" stroke="#4CC9C4" stroke-opacity=".55" stroke-width="16" stroke-linecap="round"/><circle cx="338" cy="334" r="36" fill="#4CC9C4"/><path d="M322 335l11 11 21-24" stroke="#07151A" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="launch-name">Expense Ledger</div></div></div>';

export const LAUNCH_CSS = "#launch{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:var(--bg,#07151A);transition:opacity 380ms cubic-bezier(.4,0,.2,1) 140ms;-webkit-tap-highlight-color:transparent}"
  + "#launch .launch-in{position:relative;display:flex;flex-direction:column;align-items:center;transition:transform 420ms cubic-bezier(.2,.8,.2,1),opacity 300ms ease-out 60ms}"
  + "#launch .launch-mark{display:block}"
  + "#launch .launch-name{position:absolute;top:100%;margin-top:18px;white-space:nowrap;font:600 19px/1.2 Onest,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;letter-spacing:.2px;color:var(--ink,#F3F7F6);opacity:0;transform:translateY(6px);animation:launchName 360ms cubic-bezier(.2,.8,.2,1) 160ms forwards}"
  + "#launch.out{opacity:0;pointer-events:none}"
  + "#launch.out .launch-in{transform:translateY(-44px) scale(.9);opacity:0}"
  + "@keyframes launchName{to{opacity:1;transform:none}}"
  + "@keyframes launchGone{to{opacity:0;visibility:hidden}}"
  + "#launch{animation:launchGone 300ms ease-out " + MAX_MS + "ms forwards}"   // safety net when no script runs at all
  // The root only fades (moving it would carry the fixed tab bar along); the page content rises.
  + "html.launch-rise #root{animation:launchFade 380ms ease-out 100ms both}"
  + "html.launch-rise .page{animation:launchRise 460ms cubic-bezier(.2,.8,.2,1) 120ms both}"
  + "@keyframes launchFade{from{opacity:0}to{opacity:1}}"
  + "@keyframes launchRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}"
  + "@media (prefers-reduced-motion: reduce){#launch,#launch .launch-in{transition:opacity 200ms linear}#launch .launch-name{animation:none;opacity:1;transform:none}#launch.out .launch-in{transform:none}html.launch-rise #root,html.launch-rise .page{animation:none}}"
  + "html[data-fx=off] #launch,html[data-fx=off] #launch .launch-in{transition:opacity 200ms linear}html[data-fx=off] #launch .launch-name{animation:none;opacity:1;transform:none}html[data-fx=off] #launch.out .launch-in{transform:none}html[data-fx=off].launch-rise #root,html[data-fx=off].launch-rise .page{animation:none}";

const quiet = () => {
  try { return document.documentElement.getAttribute("data-fx") === "off" || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { return false; }
};
let started = 0, finishing = false;
function remove(el) { try { el.remove(); } catch { /* already gone */ } try { document.documentElement.classList.remove("launch-rise"); } catch { /* ignore */ } }

// Called once when the app module loads. Adopts the static copy from index.html, or draws it (the test page and any page without it).
export function startLaunch() {
  if (typeof document === "undefined") return;
  started = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  let el = document.getElementById(LAUNCH_ID);
  const skip = (typeof navigator !== "undefined" && navigator.webdriver && !window.__forceLaunch);
  if (skip) { if (el) remove(el); return; }
  if (!document.getElementById("launch-css")) { const s = document.createElement("style"); s.id = "launch-css"; s.textContent = LAUNCH_CSS; (document.head || document.documentElement).appendChild(s); }
  if (!el) { const box = document.createElement("div"); box.innerHTML = LAUNCH_HTML; el = box.firstChild; (document.body || document.documentElement).appendChild(el); }
  el.addEventListener("click", () => finishLaunch(true), { once: true });
  setTimeout(() => finishLaunch(true), MAX_MS);
}

// Called when the first screen has been drawn. Waits out the rest of the hold, then plays the hand-over and removes the layer.
export function finishLaunch(now = false) {
  if (typeof document === "undefined" || finishing) return;
  const el = document.getElementById(LAUNCH_ID); if (!el) return;
  finishing = true;
  const t = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  const wait = now || quiet() ? 0 : Math.max(0, HOLD_MS - (t - started));
  setTimeout(() => {
    try { document.documentElement.classList.add("launch-rise"); } catch { /* ignore */ }
    el.classList.add("out");
    setTimeout(() => remove(el), quiet() ? 260 : OUT_MS + 120);
  }, wait);
}
