import fs from "fs";
import { adb, wait, shot, launch, connect, ok, section, done, clickText, state, clearAnr, PKG, OUT } from "./emu-lib.mjs";
adb("shell", "am", "force-stop", PKG); await wait(800); await launch(); clearAnr(); let { b, p } = await connect();
const sig = (s) => JSON.stringify({ t: s.transactions.map((x) => [x.id, x.type, x.amount]), b: (s.bills || []).map((x) => [x.id, x.name, x.amount]) });
let st = await state(p);
if (st.transactions.length === 0) { console.log("app is empty (previous wipe); restoring with the real backup after export is not possible, re-seeding from before.json is not done"); }
section("E6c. Capture the backup file while the share sheet is open (6)");
await p.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(500); await p.evaluate(() => document.querySelectorAll(".more-page .list-row")[1].click()); await wait(800);
await clickText(p, ".io-page button", /backup|google drive/i); await wait(3000); clearAnr();
const ls = adb("shell", "run-as", PKG, "ls", "-la", "cache/exports"); console.log(ls);
const jn = (/(ledger-backup-[^\s]+\.json)/.exec(ls) || [])[1]; ok(!!jn && /^ledger-backup-\d{4}-\d{2}-\d{2}\.json$/.test(jn), "the file is named ledger-backup-<date>.json", jn);
const body = jn ? adb("exec-out", "run-as", PKG, "cat", "cache/exports/" + jn) : ""; let j = null; try { j = JSON.parse(body); } catch {}
ok(!!j && j.version === 10 && body.length > 500, "a valid version-10 backup, more than a few hundred bytes", { bytes: body.length, v: j && j.version, tx: j && j.transactions && j.transactions.length, bills: j && j.bills && j.bills.length });
if (j) fs.writeFileSync(OUT + "\\emu-backup.json", body, "utf8"); fs.writeFileSync(OUT + "\\backup-counts.json", JSON.stringify({ tx: j && j.transactions.length, bills: j && (j.bills || []).length }));
adb("shell", "input", "keyevent", "4"); await wait(1500); clearAnr(); done("emu E6c"); b.disconnect();