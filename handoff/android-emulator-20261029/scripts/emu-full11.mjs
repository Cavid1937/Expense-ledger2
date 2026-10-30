import { adb, wait, launch, connect, ok, section, done, clearAnr, focus, dump, PKG } from "./emu-lib.mjs";
const tap = (re) => { const x = dump(); const m = [...x.matchAll(/<node [^>]*>/g)].map((n) => n[0]).find((n) => re.test(n)); if (!m) return false; const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(m); adb("shell", "input", "tap", String((+b[1] + +b[3]) / 2 | 0), String((+b[2] + +b[4]) / 2 | 0)); return true; };
const info = async () => { try { const c = await connect(); return await c.p.evaluate(() => ({ overlay: !!document.querySelector(".add-overlay"), toast: (document.querySelector(".toast") || {}).innerText || "" })); } catch { return { page: "gone" }; } };
adb("shell", "am", "force-stop", PKG); await wait(800); await launch(); clearAnr(); await connect();
section("E5f. Back button on the final Android build, real touches (5)");
await wait(2500); clearAnr(); let tapped = false; for (let k = 0; k < 5 && !tapped; k++) { tapped = tap(/text="Add transaction"/i); if (!tapped) await wait(1500); } ok(tapped, "opened the add form with a real touch"); await wait(1500);
let presses = 0, i = await info(); while (i.overlay && presses < 3) { adb("shell", "input", "keyevent", "4"); presses++; await wait(900); i = await info(); }
ok(!i.overlay && /expenseledger/.test(focus()), `Back closed the add form and the app stayed open (after ${presses} press${presses > 1 ? "es" : ""}; an earlier press can be used by Android itself to hide the keyboard or autofill)`, i);
let warned = false; for (let k = 0; k < 2 && !warned; k++) { adb("shell", "input", "keyevent", "4"); await wait(600); i = await info(); warned = /again/i.test(i.toast); }
ok(warned && /expenseledger/.test(focus()), "Back on Home with nothing open shows 'Press Back again to exit' and the app stays open", i);
adb("shell", "input", "keyevent", "4"); await wait(1800); clearAnr(); ok(!/expenseledger/.test(focus()), "a second Back within 2 seconds leaves the app", focus().slice(0, 100));
done("emu E5f");