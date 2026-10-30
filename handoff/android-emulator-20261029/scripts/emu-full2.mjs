import fs from "fs";
import { adb, wait, shot, launch, connect, ok, section, done, clickText, state, dump, clearAnr, focus, PKG, OUT } from "./emu-lib.mjs";
adb("shell", "am", "force-stop", PKG); await wait(1000); await launch(); clearAnr(); let { b, p } = await connect();
const before = fs.readFileSync(OUT + "\\before.json", "utf8"); const sig = (s) => JSON.stringify({ t: s.transactions.map((x) => [x.id, x.type, x.amount]), b: (s.bills || []).map((x) => [x.id, x.name, x.amount]) });
let st = await state(p); ok(sig(st) === before, "data still the same after the earlier steps");
const toIO = async () => { await p.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(500); await p.evaluate(() => document.querySelectorAll(".more-page .list-row")[1].click()); await wait(700); };
const cacheFiles = () => adb("shell", "run-as", PKG, "ls", "-la", "cache");
const chooserUp = () => { const f = focus(); return /intentresolver|ResolverActivity|chooser/i.test(f) ? f : ""; };
section("E6. Backup via the share sheet (6)"); await toIO(); shot("20-io-page");
console.log("buttons:", await p.evaluate(() => [...document.querySelectorAll(".io-page button")].map((x) => (x.innerText || "").trim().replace(/\s+/g, " ")).filter(Boolean)));
const lastBefore = st.lastBackup;
await clickText(p, ".io-page button", /backup|google drive/i); await wait(3500); clearAnr();
const f1 = chooserUp(); ok(!!f1, "the phone's share sheet opened", focus().slice(0, 140)); shot("21-share-sheet");
const x = dump(); console.log("share sheet texts:", [...x.matchAll(/text="([^"]+)"/g)].map((m) => m[1]).filter((t) => t.trim()).slice(0, 14));
ok(/ledger-backup-.*\.json/.test(cacheFiles()), "the backup file was written to the app's cache folder", cacheFiles().split("\n").slice(-3).join(" | "));
const bk = cacheFiles().split("\n").map((l) => /(ledger-backup-[^\s]+\.json)/.exec(l)).filter(Boolean).pop();
if (bk) { const body = adb("exec-out", "run-as", PKG, "cat", "cache/" + bk[1]); let j = null; try { j = JSON.parse(body); } catch {} fs.writeFileSync(OUT + "\\emu-backup.json", body, "utf8");
  ok(!!j && j.version === 10 && j.transactions.length === 3 && (j.bills || []).length === 1, "the file is a valid version-10 backup with 3 entries and 1 bill", { bytes: body.length, v: j && j.version }); }
section("E7. Cancel the share sheet (7)");
adb("shell", "input", "keyevent", "4"); await wait(2500); clearAnr(); ({ b, p } = await connect());
const t7 = await p.evaluate(() => (document.querySelector(".toast") || {}).innerText || ""); st = await state(p);
ok(/^\d+/.test(adb("shell", "pidof", PKG)), "back in the app after closing the share sheet", focus().slice(0, 100));
ok(!/sent|shared|saved/i.test(t7) && st.lastBackup === lastBefore, "the app did NOT claim a backup was sent/saved, and 'last backup' is unchanged", { toast: t7, lb: [lastBefore, st.lastBackup] });
section("E8. CSV export (8)");
const csvBtn = await clickText(p, ".io-page button", /csv/i); await wait(3500); clearAnr(); ok(csvBtn && !!chooserUp(), "CSV export opens the same share sheet", focus().slice(0, 120)); shot("22-csv-share");
adb("shell", "input", "keyevent", "4"); await wait(2000); clearAnr();
const csvName = /(ledger[^\s]*\.csv)/.exec(cacheFiles()); if (csvName) { const body = adb("exec-out", "run-as", PKG, "cat", "cache/" + csvName[1]); ok(body.length > 40 && /Rent|12\.5|500/.test(body), "the CSV file has real content", { name: csvName[1], bytes: body.length }); }
fs.writeFileSync(OUT + "\\after-e8.txt", "ok"); done("emu-full part 2 (E6-E8)");