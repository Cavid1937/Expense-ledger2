// Run 10 (2026-10-27): data safety helpers — storage protection and sending the backup through the share menu.
// Browser behaviour is simulated with small fake objects, so every answer a browser can give is covered.
import { H, ok, section, finish } from "./lib.mjs";
const { storageProtection, shareBackupFile } = H;

section("1. Storage protection");
const st = (persisted, grant, opts = {}) => { const calls = { persist: 0 }; return { calls, nav: { storage: {
  persisted: async () => { if (opts.throws) throw new Error("x"); return persisted; },
  persist: async () => { calls.persist++; return grant; } } } }; };
let s = st(true, true);
ok(await storageProtection(true, s.nav) === "on" && s.calls.persist === 0, "already protected → 'on', without asking again");
s = st(false, true);
ok(await storageProtection(true, s.nav) === "on" && s.calls.persist === 1, "not yet protected, browser agrees → 'on' (asked once)");
s = st(false, false);
ok(await storageProtection(true, s.nav) === "off", "browser refuses → 'off'");
s = st(false, true);
ok(await storageProtection(false, s.nav) === "off" && s.calls.persist === 0, "checking only (ask = false) never asks");
ok(await storageProtection(true, {}) === "unsupported" && await storageProtection(true, null) === "unsupported", "no storage manager → 'unsupported'");
s = st(false, true, { throws: true });
ok(await storageProtection(true, s.nav) === "unknown", "the browser throws → 'unknown' (never crashes the app)");

section("2. Backup through the share menu");
const sh = (canShare, shareResult) => { const got = []; return { got, nav: { canShare: () => canShare, share: async (d) => { got.push(d); if (shareResult) throw Object.assign(new Error("x"), { name: shareResult }); } } }; };
let n = sh(true, null);
const text = JSON.stringify({ version: 9, transactions: [{ id: 1, amount: 12.5 }] });
const r1 = await shareBackupFile(text, "ledger-backup-2026-10-27.json", n.nav);
const f = n.got[0]?.files?.[0];
ok(r1 === "shared" && f && f.name === "ledger-backup-2026-10-27.json" && f.type === "application/json" && (await f.text()) === text, "shared: one file, the backup's exact text, name and type");
n = sh(true, "AbortError");
ok(await shareBackupFile(text, "b.json", n.nav) === "cancelled", "the user closes the share menu → 'cancelled' (the app records nothing)");
n = sh(true, "NotAllowedError");
ok(await shareBackupFile(text, "b.json", n.nav) === "unsupported", "sharing refused by the browser → 'unsupported' (the app downloads the file instead)");
n = sh(false, null);
ok(await shareBackupFile(text, "b.json", n.nav) === "unsupported" && n.got.length === 0, "cannot share files here → 'unsupported', share is not attempted");
ok(await shareBackupFile(text, "b.json", {}) === "unsupported", "no share function at all → 'unsupported'");
finish("run10");
