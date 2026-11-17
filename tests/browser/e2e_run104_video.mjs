// Run 104 (owner's video review order, 17 Nov). What the six videos led to, checked in the real bundle. Synthetic data only.
//   B1 (onboarding video: "every question has to change something"): whoever answered "No income now" is not told to add their next income.
//   B2-B3 (keyboard video): the page asks to shrink above the phone keyboard; while a text box is being typed in, the tab bar and the add
//   button step away; sheets are limited to the space above the keyboard.
//   B4 (motion video): "Entry recorded" rises and settles a little; with motion off it only fades in. (The toast's dot: e2e_run103_loans B6.)
// Headless Chrome has no on-screen keyboard: a keyboard is imitated by making the window shorter while a text box has the focus.
import { launch, openPage, settle, ok, section, finish, baseSeed, wait, openAdd, fs, path } from "./lib.mjs";
const browser = await launch();
const acc = `if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:""},hidden:false}],transfers:[]}));`;
const choices = (income) => `localStorage.setItem("expense_ledger_v5__first_choices",JSON.stringify({stmt:false,debts:false,income:"${income}",at:1}));`;
const why = (page) => page.evaluate(() => { const e = document.querySelector('[data-section="until-why"]'); return e ? e.textContent : null; });

section("R104-B1. 'No income now' is not asked to add its next income");
{
  // baseSeed: this month's income is recorded, nothing is dated ahead: the until-income figure cannot be worked out (reason noDate)
  let page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: new Function(`try{${acc}}}catch(e){}`) }); await settle(page);
  const before = await why(page);
  ok(before !== null && /Add your next income/.test(before), "without that answer, the note says to add the next income", before);
  await page.close();
  for (const [inc, shown] of [["none", false], ["fixed", true], ["variable", true]]) {
    page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: new Function(`try{${acc}${choices(inc)}}}catch(e){}`) }); await settle(page);
    const w = await why(page), safe = await page.evaluate(() => (document.querySelector('[data-section="home-safe"] .safe-amount') || {}).textContent || "");
    ok(shown ? (w !== null && /Add your next income/.test(w)) : w === null, `answered "${inc}": the note is ${shown ? "shown" : "not shown"}`, w);
    if (inc === "none") ok(/1,470\.00/.test(safe) && page.errors.length === 0, "Safe to Spend for the month is still shown (1,470.00), no errors", safe);
    await page.close();
  }
}

section("R104-B2. The keyboard: the page shrinks above it, and the tab bar steps away while typing");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  // the real app is built from index.html (the test page has its own); read the line there
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
  const meta = (/<meta name="viewport" content="([^"]*)"/.exec(fs.readFileSync(path.join(root, "index.html"), "utf8")) || [])[1] || "";
  ok(/interactive-widget=resizes-content/.test(meta) && /viewport-fit=cover/.test(meta), "index.html asks the browser to resize the page above the keyboard", meta);
  const look = () => page.evaluate(() => ({ kb: document.documentElement.getAttribute("data-kb"), tab: getComputedStyle(document.querySelector(".tabbar")).display, fab: (() => { const f = document.querySelector(".fab-add"); return f ? getComputedStyle(f).display : "missing"; })() }));
  // a shorter window with nothing focused (a phone turned sideways, a split screen) is not a keyboard
  await page.setViewport({ width: 390, height: 480 }); await wait(250);
  let r = await look();
  ok(r.kb === null && r.tab !== "none", "shorter window, nothing typed in: the tab bar stays", r);
  await page.setViewport({ width: 390, height: 844 }); await wait(250);
  // the Home search or any real text box of the app: the Goals budget field is always there
  const focused = await page.evaluate(() => { const i = [...document.querySelectorAll('input[type="text"],input[type="search"],input:not([type]),textarea')].find((x) => x.offsetParent !== null && !x.readOnly); if (!i) return null; i.focus({ preventScroll: true }); return i.outerHTML.slice(0, 80); });
  if (focused === null) {
    // Home has no text box: use one of the app's own forms (Goals: a new budget's amount)
    await page.evaluate(() => { const tabs = [...document.querySelectorAll(".tab-btn")]; tabs[3].click(); }); await wait(500);
  }
  const f2 = focused || await page.evaluate(() => { const i = [...document.querySelectorAll('input[type="text"],input:not([type]),textarea')].find((x) => x.offsetParent !== null && !x.readOnly); if (!i) return null; i.focus({ preventScroll: true }); return i.outerHTML.slice(0, 80); });
  ok(f2 !== null, "a text box of the app has the focus", f2);
  r = await look();
  ok(r.kb === null && r.tab !== "none", "focused but no keyboard yet: the tab bar stays", r);
  await page.setViewport({ width: 390, height: 480 }); await wait(250);
  r = await look();
  ok(r.kb === "1" && r.tab === "none" && (r.fab === "none" || r.fab === "missing"), "keyboard up (page 844 -> 480 px): the tab bar and the add button step away", r);
  await page.evaluate(() => document.activeElement && document.activeElement.blur()); await wait(150);
  r = await look();
  ok(r.kb === null && r.tab !== "none", "typing finished: the tab bar is back", r);
  await page.setViewport({ width: 390, height: 844 }); await wait(250);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R104-B3. Sheets are limited to the space above the keyboard");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const css = await page.evaluate(() => [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n"));
  ok(/\.sheet\{max-height:92dvh\}/.test(css), "the sheet's height follows the visible page (92dvh), not the full screen (92vh)");
  await openAdd(page);
  await page.setViewport({ width: 390, height: 480 }); await wait(300);
  const add = await page.evaluate(() => { const o = document.querySelector(".add-overlay"); const b = o.getBoundingClientRect(); return { bottom: Math.round(b.bottom), h: innerHeight, scroll: getComputedStyle(o).overflowY }; });
  ok(add.bottom <= add.h && add.scroll === "auto", "the Add form ends at the bottom of the visible page and scrolls inside", add);
  await page.close();
}

section("R104-B4. A notice lands with a small settle; with motion off it stays still");
{
  for (const off of [false, true]) {
    const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: off ? new Function(`try{localStorage.setItem("expense_ledger_v5__fx","off")}catch(e){}`) : null }); await settle(page);
    if (off) await page.evaluate(() => document.documentElement.setAttribute("data-fx", "off"));
    // a real notice: saving an entry
    await openAdd(page);
    await page.evaluate(() => { const i = document.querySelector(".amount-input"); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; s.call(i, "5"); i.dispatchEvent(new Event("input", { bubbles: true })); });
    await wait(150);
    await page.evaluate(() => document.querySelector(".add-foot .btn-primary").click());
    await page.waitForSelector(".snackbar:not(.snack-ghost)", { timeout: 3000 }).catch(() => {});
    const a = await page.evaluate(() => { const s = document.querySelector(".snackbar:not(.snack-ghost)"); return s ? { text: s.textContent, anim: getComputedStyle(s).animationName } : null; });
    ok(a !== null && /Entry recorded/.test(a.text) && (off ? /^snackPlain/.test(a.anim) : /^snackIn/.test(a.anim)), off ? "motion off: 'Entry recorded' only fades in" : "'Entry recorded' rises and settles (snackIn)", a);
    await page.close();
  }
}
await finish("e2e_run104_video", browser);
