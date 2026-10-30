import fs from "fs";
import { adb, wait, shot, launch, connect, ok, section, done, clickText, state, clearAnr, PKG, OUT } from "./emu-lib.mjs";
adb("shell", "am", "force-stop", PKG); await wait(800); await launch(); clearAnr(); let { b, p } = await connect();
const before = fs.readFileSync(OUT + "\\before.json", "utf8"); const sig = (s) => JSON.stringify({ t: s.transactions.map((x) => [x.id, x.type, x.amount]), b: (s.bills || []).map((x) => [x.id, x.name, x.amount]) });
section("E6b. The exported files themselves (6, 8)");
const ls = adb("shell", "run-as", PKG, "ls", "-la", "cache/exports"); console.log(ls);
const names = [...ls.matchAll(/(ledger[^\s]+\.(json|csv))/g)].map((m) => m[1]); const jn = names.find((n) => /\.json$/.test(n)), cn = names.find((n) => /\.csv$/.test(n));
ok(!!jn && /^ledger-backup-\d{4}-\d{2}-\d{2}\.json$/.test(jn), "backup file is named ledger-backup-<date>.json", jn);
const body = adb("exec-out", "run-as", PKG, "cat", "cache/exports/" + jn); let j = null; try { j = JSON.parse(body); } catch {} fs.writeFileSync(OUT + "\\emu-backup.json", body, "utf8");
ok(!!j && j.version === 10 && j.transactions.length === 3 && (j.bills || []).length === 1 && body.length > 500, "valid version-10 backup: 3 entries, 1 bill, more than a few hundred bytes", { bytes: body.length, v: j && j.version });
ok(!!cn, "a CSV file was written too", cn); if (cn) { const c = adb("exec-out", "run-as", PKG, "cat", "cache/exports/" + cn); ok(c.length > 60 && /12\.5/.test(c) && /500/.test(c), "the CSV contains the entries", { bytes: c.length }); }
section("E9. Restore from the backup file (9)");
adb("push", OUT + "\\emu-backup.json", "/sdcard/Download/restore-test.json");
// wipe the ledger like a fresh phone, reload, then import the file
await p.evaluate(() => { localStorage.removeItem("expense_ledger_v5"); Object.keys(localStorage).filter((k) => /^expense_ledger_v5__/.test(k)).forEach((k) => localStorage.removeItem(k)); }); await p.reload(); await wait(2000);
await p.evaluate(() => { const c = document.querySelector('.lang-opt input[value="en"]'); if (c) { c.click(); document.querySelector(".lang-continue").click(); } }); await wait(1500);
let st = await state(p); ok(!st || st.transactions.length === 0, "the app is empty after the wipe", st && st.transactions.length);
await p.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(500); await p.evaluate(() => document.querySelectorAll(".more-page .list-row")[1].click()); await wait(800);
const cdp = await p.createCDPSession(); const { result } = await cdp.send("Runtime.evaluate", { expression: 'document.querySelector(".io-page input[type=file]")' });
await cdp.send("DOM.enable"); await cdp.send("DOM.setFileInputFiles", { files: ["/sdcard/Download/restore-test.json"], objectId: result.objectId }); await wait(1500); shot("23-restore-sheet");
console.log("sheet:", (await p.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "NO SHEET")).replace(/\s+/g, " ").slice(0, 260));
await clickText(p, '[aria-label="Restore backup"] button', /replace/i); await wait(1500); clearAnr();
st = await state(p); ok(st && sig(st) === before, "Replace brings back all entries and the bill exactly as before", st && [st.transactions.length, (st.bills || []).length]);
shot("24-restored"); done("emu-full part 3 (E6b, E9)"); b.disconnect();