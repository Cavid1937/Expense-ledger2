// Run 74: optional Google Drive backup (owner-approved 10 Nov; Google Cloud set up 13 Nov, handoff/GOOGLE_CLOUD_SETUP_2026-11-13.md).
// The backup file lives in the app's own hidden folder in the person's Drive (scope drive.appdata): the app cannot see any other file,
// and nothing goes to us. Off unless the person connects. Nothing here touches the ledger: it moves one backup text in or out; restoring
// goes through the app's normal import preview, so nothing changes without the person confirming.
// Network use (also listed in tests/logic/run50net): accounts.google.com (Google's sign-in script, loaded only when the person taps Connect)
// and www.googleapis.com (the Drive file calls). No other address.

export const DRIVE_WEB_CLIENT_ID = "33586491529-9qo7b5sordf4ct8mblvi4c17vnqns3oi.apps.googleusercontent.com";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const DRIVE_FILE_NAME = "expense-ledger-backup.json";
const API = "https://www.googleapis.com/drive/v3/files", UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const GIS_SRC = "https://accounts.google.com/gsi/client";

// A Drive call that failed, with a reason the screen can explain: "auth" (sign in again), "offline", "space" (Drive is full),
// "notfound", "server".
export class DriveError extends Error { constructor(reason, status) { super(reason); this.reason = reason; this.status = status || 0; } }
const reasonOf = (status, body) => status === 401 || status === 403 && /auth|credential|token/i.test(body || "") ? "auth"
  : status === 403 && /storageQuota|quota/i.test(body || "") ? "space" : status === 404 ? "notfound" : "server";

async function call(fetchFn, url, init, token) {
  let r;
  try { r = await fetchFn(url, { ...init, headers: { ...(init && init.headers), Authorization: "Bearer " + token } }); }
  catch { throw new DriveError("offline"); }
  if (!r || !r.ok) { let body = ""; try { body = await r.text(); } catch { /* no body */ } throw new DriveError(reasonOf(r ? r.status : 0, body), r ? r.status : 0); }
  return r;
}

// The newest backup file in the app folder, or null. {id, modifiedTime, size}
export async function driveFind(token, fetchFn = fetch) {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const r = await call(fetchFn, `${API}?spaces=appDataFolder&q=${q}&orderBy=modifiedTime%20desc&pageSize=5&fields=files(id,modifiedTime,size)`, { method: "GET" }, token);
  const j = await r.json().catch(() => ({}));
  const f = Array.isArray(j.files) && j.files[0];
  return f && typeof f.id === "string" ? { id: f.id, modifiedTime: String(f.modifiedTime || ""), size: Number(f.size) || 0 } : null;
}

// Writes the backup text: replaces the existing file (one file, overwritten) or creates it in the app folder. Returns {id, modifiedTime}.
export async function driveSave(token, text, fetchFn = fetch) {
  const found = await driveFind(token, fetchFn);
  if (found) {
    const r = await call(fetchFn, `${UPLOAD}/${encodeURIComponent(found.id)}?uploadType=media&fields=id,modifiedTime`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: text }, token);
    const j = await r.json().catch(() => ({})); return { id: j.id || found.id, modifiedTime: String(j.modifiedTime || "") };
  }
  const boundary = "ledger" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: DRIVE_FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${boundary}--`;
  const r = await call(fetchFn, `${UPLOAD}?uploadType=multipart&fields=id,modifiedTime`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }, token);
  const j = await r.json().catch(() => ({})); return { id: String(j.id || ""), modifiedTime: String(j.modifiedTime || "") };
}

// The backup text from Drive, or null when there is none yet.
export async function driveLoad(token, fetchFn = fetch) {
  const found = await driveFind(token, fetchFn); if (!found) return null;
  const r = await call(fetchFn, `${API}/${encodeURIComponent(found.id)}?alt=media`, { method: "GET" }, token);
  return { text: await r.text(), modifiedTime: found.modifiedTime };
}

// A short fingerprint of the backup's content (timestamps left out), so an unchanged ledger is not uploaded again.
export function backupFingerprint(text) {
  let s = String(text || "");
  try { const o = JSON.parse(s); delete o.exportedAt; delete o.lastBackup; s = JSON.stringify(o); } catch { /* not JSON: fingerprint the text */ }
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16) + ":" + s.length;
}

// Daily automatic backup: only when connected, not yet done today, the content changed, and a sign-in is at hand.
export function driveDue(pref, fingerprint, today) {
  return !!(pref && pref.on && pref.lastDay !== today && pref.lastHash !== fingerprint);
}

// The person's choice and the last result, kept in its own preference key (never in the ledger or in backups).
export function cleanDrivePref(v) {
  const o = v && typeof v === "object" ? v : {};
  return { on: o.on === true, lastAt: typeof o.lastAt === "string" ? o.lastAt.slice(0, 40) : "", lastDay: typeof o.lastDay === "string" ? o.lastDay.slice(0, 10) : "",
    lastHash: typeof o.lastHash === "string" ? o.lastHash.slice(0, 40) : "", fails: Number.isInteger(o.fails) && o.fails > 0 ? Math.min(o.fails, 99) : 0,
    lastError: typeof o.lastError === "string" ? o.lastError.slice(0, 20) : "" };
}

// ─── Sign-in on the website (Google Identity Services, token flow; no client secret is used or needed) ───────────────────────────────
// The Android app cannot use this (Google blocks its sign-in window inside apps that show web pages); it supplies window.LedgerNative.google
// instead, with the same getToken / revoke shape.
let gisLoading = null, token = null, tokenUntil = 0;
function loadGis(doc = document) {
  if (typeof window !== "undefined" && window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((res, rej) => { const s = doc.createElement("script"); s.src = GIS_SRC; s.async = true; s.onload = () => res(); s.onerror = () => { gisLoading = null; rej(new DriveError("offline")); }; doc.head.appendChild(s); });
  return gisLoading;
}
// interactive: true only from a tap (the browser allows Google's window only then). Resolves to a token, or rejects with a DriveError.
export async function driveToken({ interactive = false } = {}) {
  const native = typeof window !== "undefined" && window.LedgerNative && window.LedgerNative.google;
  if (native) { try { const t = await native.getToken({ scope: DRIVE_SCOPE, interactive }); if (t && t.token) return t.token; } catch { /* fall through */ } throw new DriveError(interactive ? "cancelled" : "auth"); }
  if (token && Date.now() < tokenUntil - 60000) return token;
  if (!interactive) throw new DriveError("auth");
  await loadGis();
  return new Promise((res, rej) => {
    const client = window.google.accounts.oauth2.initTokenClient({ client_id: DRIVE_WEB_CLIENT_ID, scope: DRIVE_SCOPE,
      callback: (r) => { if (r && r.access_token) { token = r.access_token; tokenUntil = Date.now() + (Number(r.expires_in) || 3600) * 1000; res(token); } else rej(new DriveError("cancelled")); },
      error_callback: () => rej(new DriveError("cancelled")) });
    client.requestAccessToken({ prompt: "" });
  });
}
export async function driveSignOut() {
  const native = typeof window !== "undefined" && window.LedgerNative && window.LedgerNative.google;
  const t = token; token = null; tokenUntil = 0;
  try { if (native && native.revoke) await native.revoke(); else if (t && window.google && window.google.accounts) window.google.accounts.oauth2.revoke(t, () => {}); } catch { /* best effort: the app forgets it either way */ }
}
export function driveHasToken() { return !!(token && Date.now() < tokenUntil - 60000); }
