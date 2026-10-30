import { adb, wait, shot, launch, connect, ok, section, done, clearAnr, focus, dump, PKG } from "./emu-lib.mjs";
const tap = (re) => { const x = dump(); const m = [...x.matchAll(/<node [^>]*>/g)].map((n) => n[0]).find((n) => re.test(n)); if (!m) return false; const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(m); adb("shell", "input", "tap", String((+b[1] + +b[3]) / 2 | 0), String((+b[2] + +b[4]) / 2 | 0)); return true; };
const info = async (p) => p.evaluate(() => ({ overlay: !!document.querySelector(".add-overlay"), toast: (document.querySelector(".toast") || {}).innerText || "", len: history.length, st: JSON.stringify(history.state) }));
adb("shell", "am", "force-stop", PKG); await wait(800); await launch(); clearAnr(); let { b, p } = await connect();
section("E5c. Back button with real touches on the updated app (5)");
await wait(2500); clearAnr(); let tapped = false; for (let k = 0; k < 5 && !tapped; k++) { tapped = tap(/text="Add transaction"|content-desc="Add transaction"/i); if (!tapped) await wait(1500); } ok(tapped, "tapped the + button with a real touch"); await wait(1500);
console.log("state after tap:", JSON.stringify(await info(p)));
adb("shell", "input", "keyevent", "4"); await wait(1800); clearAnr(); ({ b, p } = await connect());
let i = await info(p); ok(/expenseledger/.test(focus()) && !i.overlay, "Back with the add form open closes the form and keeps the app open", i);
adb("shell", "input", "keyevent", "4"); await wait(1200); clearAnr(); try { ({ b, p } = await connect()); i = await info(p); } catch { i = { toast: "(page gone)" }; }
ok(/again/i.test(i.toast) && /expenseledger/.test(focus()), "Back on Home with nothing open: 'press Back again', app stays", i);
adb("shell", "input", "keyevent", "4"); await wait(1800); clearAnr(); const f = focus(); ok(!/expenseledger/.test(f), "Back again within 2 seconds leaves the app", f.slice(0, 110));
done("emu E5c"); 