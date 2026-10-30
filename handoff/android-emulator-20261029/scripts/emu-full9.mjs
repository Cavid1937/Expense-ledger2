import { adb, wait, shot, launch, connect, ok, section, done, clearAnr, focus, dump, PKG } from "./emu-lib.mjs";
const tap = (re) => { const x = dump(); const m = [...x.matchAll(/<node [^>]*>/g)].map((n) => n[0]).find((n) => re.test(n)); if (!m) return false; const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(m); adb("shell", "input", "tap", String((+b[1] + +b[3]) / 2 | 0), String((+b[2] + +b[4]) / 2 | 0)); return true; };
const info = async (p) => p.evaluate(() => ({ overlay: !!document.querySelector(".add-overlay"), toast: (document.querySelector(".toast") || {}).innerText || "" }));
const back = async (label) => { adb("shell", "input", "keyevent", "4"); await wait(700); clearAnr(); let r = { alive: /expenseledger/.test(focus()) }; if (r.alive) { try { const c = await connect(); Object.assign(r, await info(c.p)); } catch { r.page = "gone"; } } console.log("  ", label, JSON.stringify(r)); return r; };
adb("shell", "am", "force-stop", PKG); await wait(800); await launch(); clearAnr(); let { b, p } = await connect();
section("E5d. Back button, real touches, updated app: full sequence (5)");
await wait(2500); clearAnr(); let tapped = false; for (let k = 0; k < 5 && !tapped; k++) { tapped = tap(/text="Add transaction"/i); if (!tapped) await wait(1500); } ok(tapped, "opened the add form with a real touch"); await wait(1500);
const ime = /mInputShown=true|isInputViewShown=true|mIsInputViewShown=true/.test(adb("shell", "dumpsys input_method")); console.log("   soft keyboard visible:", ime);
let r = await back("Back 1"); if (r.overlay) { console.log("   (first Back only hid the soft keyboard: normal Android)"); r = await back("Back 2"); }
ok(r.alive && !r.overlay, "Back closes the add form and the app stays open", r);
r = await back("Back (Home, nothing open)"); ok(r.alive && /again/i.test(r.toast), "then Back on Home says 'press Back again' and the app stays", r);
adb("shell", "input", "keyevent", "4"); await wait(1800); clearAnr(); ok(!/expenseledger/.test(focus()), "a second Back within 2 seconds leaves the app", focus().slice(0, 100));
done("emu E5d");