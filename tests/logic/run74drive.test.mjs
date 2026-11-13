// Run 74: Google Drive backup (drive.js) against a stand-in for Google's servers. No network; synthetic data only.
import { ok, section, finish, eq } from "./lib.mjs";
import { driveFind, driveSave, driveLoad, backupFingerprint, driveDue, cleanDrivePref, DriveError, DRIVE_SCOPE, DRIVE_FILE_NAME, DRIVE_WEB_CLIENT_ID } from "../../drive.js";

// A tiny fake Drive: one app folder holding files by id.
const fakeDrive = () => {
  const files = new Map(), log = []; let n = 0;
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body), text: async () => body });
  const fn = async (url, init = {}) => {
    log.push({ url, method: init.method, auth: (init.headers || {}).Authorization, body: init.body });
    if ((init.headers || {}).Authorization !== "Bearer T1") return res(401, '{"error":{"message":"Invalid Credentials"}}');
    const u = new URL(url);
    if (u.pathname === "/drive/v3/files" && init.method === "GET") return res(200, JSON.stringify({ files: [...files.values()].map((f) => ({ id: f.id, modifiedTime: f.t, size: String(f.text.length) })) }));
    if (u.pathname === "/upload/drive/v3/files" && init.method === "POST") { const id = "f" + (++n); const text = String(init.body).split("\r\n\r\n")[2].replace(/\r\n--ledger\w+--$/, ""); files.set(id, { id, text, t: "2026-11-13T10:00:0" + n + "Z", meta: String(init.body).split("\r\n\r\n")[1].split("\r\n--")[0] }); return res(200, JSON.stringify({ id, modifiedTime: files.get(id).t })); }
    const m = u.pathname.match(/^\/upload\/drive\/v3\/files\/(.+)$/);
    if (m && init.method === "PATCH") { const f = files.get(m[1]); if (!f) return res(404, "{}"); f.text = init.body; f.t = "2026-11-13T11:00:00Z"; return res(200, JSON.stringify({ id: f.id, modifiedTime: f.t })); }
    const g = u.pathname.match(/^\/drive\/v3\/files\/(.+)$/);
    if (g && u.searchParams.get("alt") === "media") { const f = files.get(g[1]); return f ? res(200, f.text) : res(404, "{}"); }
    return res(500, "{}");
  };
  return { fn, files, log };
};

section("R74-1. Only the app's own hidden folder, one file");
ok(DRIVE_SCOPE === "https://www.googleapis.com/auth/drive.appdata", "the only permission asked for is the app's hidden folder (drive.appdata)");
ok(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(DRIVE_WEB_CLIENT_ID), "the web client id is a public id (no secret anywhere in the file)");
const D = fakeDrive();
ok((await driveFind("T1", D.fn)) === null && /spaces=appDataFolder/.test(D.log[0].url) && D.log[0].url.includes(encodeURIComponent(`name='${DRIVE_FILE_NAME}'`)), "nothing there yet: the search looks only in the app folder, by the file's name");
const B1 = JSON.stringify({ version: 9, exportedAt: "2026-11-13T09:00:00Z", transactions: [{ id: 1, amount: 12.5 }], lastBackup: "2026-11-13T09:00:00Z" });
const s1 = await driveSave("T1", B1, D.fn);
ok(s1.id === "f1" && D.files.size === 1 && JSON.parse(D.files.get("f1").meta).parents[0] === "appDataFolder" && D.files.get("f1").text === B1, "the first backup creates one file inside the app folder, holding exactly the backup text");
const B2 = B1.replace("12.5", "13.5");
const s2 = await driveSave("T1", B2, D.fn);
ok(s2.id === "f1" && D.files.size === 1 && D.files.get("f1").text === B2, "the next backup replaces that file (still one file, never a pile of copies)");
const got = await driveLoad("T1", D.fn);
ok(got && got.text === B2 && got.modifiedTime === "2026-11-13T11:00:00Z", "restoring reads back exactly what was saved");

section("R74-2. Failures are named, nothing is half-done");
const E = async (p) => { try { await p; return "no error"; } catch (e) { return e instanceof DriveError ? e.reason : "other:" + e; } };
ok((await E(driveSave("OLD", B1, D.fn))) === "auth" && D.files.get("f1").text === B2, "an expired sign-in says 'sign in again' and leaves the Drive copy as it was");
ok((await E(driveSave("T1", B1, async () => { throw new TypeError("Failed to fetch"); }))) === "offline", "no connection is reported as offline");
const full = async () => ({ ok: false, status: 403, text: async () => '{"error":{"errors":[{"reason":"storageQuotaExceeded"}]}}' });
ok((await E(driveSave("T1", B1, full))) === "space", "a full Drive is reported as 'Drive is full'");
ok((await E(driveLoad("T1", async () => ({ ok: false, status: 500, text: async () => "" })))) === "server", "a Google server error is reported as such");
ok((await driveLoad("T1", fakeDrive().fn)) === null, "an account with no backup yet gives 'none', not an error");

section("R74-3. Daily backup only when something changed");
const fpA = backupFingerprint(B1), fpB = backupFingerprint(B1.replace(/2026-11-13T09:00:00Z/g, "2026-11-14T08:00:00Z"));
ok(fpA === fpB, "the same data saved at another time has the same fingerprint (times are left out)");
ok(fpA !== backupFingerprint(B2), "changed data has a different fingerprint");
ok(driveDue({ on: true, lastDay: "2026-11-12", lastHash: "x" }, fpA, "2026-11-13") && !driveDue({ on: true, lastDay: "2026-11-13", lastHash: "x" }, fpA, "2026-11-13") && !driveDue({ on: true, lastDay: "2026-11-12", lastHash: fpA }, fpA, "2026-11-13") && !driveDue({ on: false }, fpA, "2026-11-13"), "due only when connected, not yet today, and changed");

section("R74-4. The stored choice is cleaned");
ok(eq(cleanDrivePref(null), { on: false, lastAt: "", lastDay: "", lastHash: "", fails: 0, lastError: "" }), "nothing stored: off");
ok(cleanDrivePref({ on: "yes", fails: -3 }).on === false && cleanDrivePref({ on: true, fails: 2.5 }).fails === 0 && cleanDrivePref({ on: true, fails: 500 }).fails === 99, "only exactly true counts as on; odd failure counts are made safe");
ok(!JSON.stringify(cleanDrivePref({ on: true, token: "SECRET", lastAt: "2026-11-13" })).includes("SECRET"), "a sign-in token is never stored with the choice");
finish("run74drive");
