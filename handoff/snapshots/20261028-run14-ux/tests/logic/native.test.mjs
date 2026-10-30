// Run 13 (2026-10-28): the hand-over from the web app to a native shell (the Capacitor Android app). Written BEFORE the code.
// Why: inside the Android web view the ordinary "download a file" link does nothing, so a backup would be silently not saved.
// The shell defines window.__ledgerNativeShare(filename, text, mime) -> "shared" | "cancelled" (or rejects). The web app must
//   - use it when it exists, and never claim success unless it says exactly "shared";
//   - treat cancel as "nothing happened" and any other outcome as a failure the user is told about (no silent fallback to a
//     download that would not work there);
//   - behave exactly as before when there is no such hook (the PWA).
// This tests the web app's side only. What the Android share chooser really does needs a device (NOT ASSESSED by these tests).
import { H, ok, section, finish } from "./lib.mjs";
const { shareBackupFile, shareViaNative, nativeShareHook } = H;

section("N-1. With a native hook");
const calls = [];
const mk = (impl) => async (...a) => { calls.push(a); return impl(...a); };
let navShared = 0;
const nav = { canShare: () => true, share: async () => { navShared++; } };
const TEXT = '{"version":10}';
calls.length = 0;
ok(await shareBackupFile(TEXT, "ledger-backup-2026-10-28.json", nav, mk(() => "shared")) === "shared" && calls.length === 1 && calls[0][0] === "ledger-backup-2026-10-28.json" && calls[0][1] === TEXT && calls[0][2] === "application/json", "the hook is called once with the file name, the exact text and the JSON type; its \"shared\" is reported as shared");
ok(navShared === 0, "the browser share menu is not used as well");
ok(await shareBackupFile(TEXT, "b.json", nav, mk(() => "cancelled")) === "cancelled", "\"cancelled\" is reported as cancelled (nothing changes in the app)");
ok(await shareBackupFile(TEXT, "b.json", nav, mk(() => { throw new Error("disk full"); })) === "failed" && navShared === 0, "a hook that fails is reported as failed, and the app does not fall back to anything else");
ok(await shareBackupFile(TEXT, "b.json", nav, () => { throw new Error("sync"); }) === "failed", "a hook that throws at once is also failed");
ok(await shareBackupFile(TEXT, "b.json", nav, async () => undefined) === "failed" && await shareBackupFile(TEXT, "b.json", nav, async () => "ok") === "failed" && await shareBackupFile(TEXT, "b.json", nav, async () => true) === "failed", "anything other than exactly \"shared\" or \"cancelled\" (nothing, \"ok\", true) is NOT success");
ok(await shareViaNative(mk(() => "shared"), "ledger-2026-10-28.csv", "Date,Amount\n", "text/csv;charset=utf-8;") === "shared" && calls[calls.length - 1][2] === "text/csv;charset=utf-8;", "the same hand-over carries other files (CSV) with their own type");

section("N-2. Without a native hook the PWA behaves exactly as before");
ok(await shareBackupFile(TEXT, "b.json", null, null) === "unsupported", "no share support and no hook → unsupported (the caller downloads the file)");
ok(await shareBackupFile(TEXT, "b.json", nav, null) === "shared" && navShared === 1, "the browser share menu is used when there is one");
ok(await shareBackupFile(TEXT, "b.json", { canShare: () => true, share: async () => { const e = new Error("x"); e.name = "AbortError"; throw e; } }, null) === "cancelled", "closing the browser share menu is cancelled");
const prev = globalThis.window;
globalThis.window = undefined; ok(nativeShareHook() === null, "no window → no hook");
globalThis.window = {}; ok(nativeShareHook() === null, "a window without the hook → none");
globalThis.window = { __ledgerNativeShare: "not a function" }; ok(nativeShareHook() === null, "something that is not a function is ignored, not called");
const fn = async () => "shared"; globalThis.window = { __ledgerNativeShare: fn }; ok(nativeShareHook() === fn, "a function is found");
globalThis.window = prev;

finish("native");
