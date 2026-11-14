// Run 81: optional account (owner decision 14 Nov, "Build real accounts"). Signing in with Google keeps ONE copy of the ledger on the app's
// own server (Supabase project qkztocsrxhubsljtsjpd, table public.ledgers), visible only to that account (row level security, tested).
// The app stays local-first: the ledger in this phone (localStorage expense_ledger_v5) is always the working copy, and the account copy is
// a mirror. Nothing from the server ever replaces the phone's data without the person confirming in the normal import preview.
// Network use (also listed in tests/logic/run81account): qkztocsrxhubsljtsjpd.supabase.co (sign-in + the ledger row) and accounts.google.com
// (Google's sign-in script on the website, loaded only after a tap). No client secret is used or stored anywhere in the app.
// The sign-in itself is kept in its own key (KEY + "__account"), never in the ledger, never in backups or exports.

export const ACCOUNT_URL = "https://qkztocsrxhubsljtsjpd.supabase.co";
export const ACCOUNT_ANON_KEY = "sb_publishable_L1ADxl6MJw9fmRjroFsoMA_EUYqwIuD";
export const GOOGLE_WEB_CLIENT_ID = "33586491529-9qo7b5sordf4ct8mblvi4c17vnqns3oi.apps.googleusercontent.com";
const GIS_SRC = "https://accounts.google.com/gsi/client";

// A failed account call, with a reason the screen can explain: "auth" (sign in again), "offline", "conflict" (another device saved a newer
// copy), "toolarge", "cancelled", "notset" (Google sign-in is not switched on for the server yet), "server".
export class AccountError extends Error { constructor(reason, status) { super(reason); this.reason = reason; this.status = status || 0; } }

// ─── the stored sign-in (pure) ────────────────────────────────────────────────────────────────────────────────────────────────────────
// { access, refresh, until (ms), userId, email, name, version (last version this phone saw or wrote), syncedAt, lastHash, paused, lastError }
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
export function cleanSession(v) {
  const o = v && typeof v === "object" ? v : {};
  const s = { access: str(o.access, 4000), refresh: str(o.refresh, 400), until: Number.isFinite(o.until) ? o.until : 0,
    userId: /^[0-9a-f-]{36}$/i.test(o.userId || "") ? o.userId : "", email: str(o.email, 200), name: str(o.name, 120),
    version: Number.isInteger(o.version) && o.version > 0 ? o.version : 0, syncedAt: str(o.syncedAt, 40), lastHash: str(o.lastHash, 40),
    paused: o.paused === "conflict" || o.paused === "restore" ? o.paused : "", lastError: str(o.lastError, 20) };
  return s.refresh && s.userId ? s : null;
}

// Supabase's answer to a sign-in or refresh -> the stored shape (keeps the sync fields of the previous session).
export function sessionFromAuth(j, prev, now = Date.now()) {
  if (!j || typeof j.access_token !== "string" || typeof j.refresh_token !== "string" || !j.user || typeof j.user.id !== "string") throw new AccountError("server");
  const meta = j.user.user_metadata || {};
  const p = prev && prev.userId === j.user.id ? prev : {};
  return cleanSession({ ...p, access: j.access_token, refresh: j.refresh_token, until: now + (Number(j.expires_in) || 3600) * 1000,
    userId: j.user.id, email: j.user.email || meta.email || "", name: meta.full_name || meta.name || "" });
}

// ─── nonce: Google gets the SHA-256 of it, Supabase gets the raw value (stops a stolen Google token being replayed) ───────────────────
export async function makeNonce(cryptoObj = globalThis.crypto) {
  const raw = Array.from(cryptoObj.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  const dig = await cryptoObj.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return { raw, hashed: Array.from(new Uint8Array(dig), (b) => b.toString(16).padStart(2, "0")).join("") };
}

// ─── server calls (fetch is passed in so the tests never touch the network) ───────────────────────────────────────────────────────────
const reasonOf = (status, body) => status === 401 || status === 403 ? "auth" : status === 409 ? "conflict" : status === 413 ? "toolarge"
  : status === 400 && /provider.*(not enabled|disabled)|unsupported_provider|validation_failed.*provider/i.test(body || "") ? "notset"
  : status === 400 && /invalid_grant|refresh/i.test(body || "") ? "auth" : "server";
async function call(fetchFn, path, init, access) {
  let r;
  const headers = { apikey: ACCOUNT_ANON_KEY, "Content-Type": "application/json", ...(access ? { Authorization: "Bearer " + access } : {}), ...(init && init.headers) };
  try { r = await fetchFn(ACCOUNT_URL + path, { ...init, headers }); } catch { throw new AccountError("offline"); }
  if (!r || !r.ok) { let body = ""; try { body = await r.text(); } catch { /* no body */ } throw new AccountError(reasonOf(r ? r.status : 0, body), r ? r.status : 0); }
  return r;
}
const json = async (r) => { try { return await r.json(); } catch { return null; } };

// Google ID token (+ the raw nonce whose hash Google signed) -> a Supabase session.
export async function signInWithGoogleIdToken(idToken, rawNonce, prev, fetchFn = fetch, now = Date.now()) {
  if (typeof idToken !== "string" || idToken.split(".").length !== 3) throw new AccountError("cancelled");
  const r = await call(fetchFn, "/auth/v1/token?grant_type=id_token", { method: "POST", body: JSON.stringify({ provider: "google", id_token: idToken, ...(rawNonce ? { nonce: rawNonce } : {}) }) });
  return sessionFromAuth(await json(r), prev, now);
}

// A session whose access part is about to run out is renewed with its refresh part. Returns the (possibly new) session.
export async function freshSession(s, fetchFn = fetch, now = Date.now()) {
  if (!s) throw new AccountError("auth");
  if (s.access && now < s.until - 60000) return s;
  const r = await call(fetchFn, "/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: s.refresh }) });
  return sessionFromAuth(await json(r), s, now);
}

// The account copy: { text, version, updatedAt, device } or null when the account has none yet.
export async function loadLedger(s, fetchFn = fetch) {
  const r = await call(fetchFn, `/rest/v1/ledgers?select=data,version,updated_at,device&user_id=eq.${encodeURIComponent(s.userId)}`, { method: "GET" }, s.access);
  const rows = await json(r);
  const row = Array.isArray(rows) && rows[0];
  if (!row) return null;
  if (!row.data || typeof row.data !== "object" || !Number.isInteger(row.version)) throw new AccountError("server");
  return { text: JSON.stringify(row.data), version: row.version, updatedAt: String(row.updated_at || ""), device: str(row.device, 80) };
}

// Saves the phone's copy. version 0 = the account has no copy yet (create). Otherwise the save only happens when the account copy is still
// the one this phone last saw (version); if another device saved in between, nothing is changed and AccountError("conflict") is thrown.
// Returns the new version.
export async function saveLedger(s, text, version, device, fetchFn = fetch) {
  let data; try { data = JSON.parse(text); } catch { throw new AccountError("server"); }
  if (text.length > 6000000) throw new AccountError("toolarge");
  const dev = str(device, 80) || null;
  if (!version) {
    const r = await call(fetchFn, "/rest/v1/ledgers", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: s.userId, data, version: 1, device: dev }) }, s.access);
    const rows = await json(r); return Array.isArray(rows) && rows[0] && Number.isInteger(rows[0].version) ? rows[0].version : 1;
  }
  const r = await call(fetchFn, `/rest/v1/ledgers?user_id=eq.${encodeURIComponent(s.userId)}&version=eq.${version}`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ data, version: version + 1, device: dev }) }, s.access);
  const rows = await json(r);
  if (!Array.isArray(rows) || !rows.length) throw new AccountError("conflict");
  return rows[0].version;
}

// Deletes the account copy AND the sign-in on the server (Google Play requires that people can delete their account from inside the app).
export async function deleteAccount(s, fetchFn = fetch) {
  await call(fetchFn, "/rest/v1/rpc/delete_my_account", { method: "POST", body: "{}" }, s.access);
  return true;
}
// Ends the sign-in on the server (best effort: the phone forgets it either way).
export async function signOutServer(s, fetchFn = fetch) {
  try { await call(fetchFn, "/auth/v1/logout", { method: "POST", body: "{}" }, s.access); } catch { /* best effort */ }
}

// Should the phone save its copy now? Only when signed in, not paused for the person's choice, and the content changed.
export function accountDue(s, fingerprint) { return !!(s && !s.paused && s.version > 0 && s.lastHash !== fingerprint); }

// ─── Google sign-in that returns an ID token ──────────────────────────────────────────────────────────────────────────────────────────
// Android app: window.LedgerNative.google.getIdToken({ nonce: hashed, clientId }) -> { idToken } (Credential Manager, added in APK 81).
// Website: Google Identity Services draws Google's own button into `el`; tapping it calls back with the ID token.
let gisLoading = null;
function loadGis(doc = document) {
  if (typeof window !== "undefined" && window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((res, rej) => { const sc = doc.createElement("script"); sc.src = GIS_SRC; sc.async = true; sc.onload = () => res(); sc.onerror = () => { gisLoading = null; rej(new AccountError("offline")); }; doc.head.appendChild(sc); });
  return gisLoading;
}
export function nativeGoogleIdAvailable() {
  const n = typeof window !== "undefined" && window.LedgerNative && window.LedgerNative.google;
  return !!(n && typeof n.getIdToken === "function");
}
export async function nativeGoogleIdToken(hashedNonce) {
  const n = window.LedgerNative.google;
  let r; try { r = await n.getIdToken({ nonce: hashedNonce, clientId: GOOGLE_WEB_CLIENT_ID }); } catch { throw new AccountError("cancelled"); }
  if (!r || typeof r.idToken !== "string") throw new AccountError("cancelled");
  return r.idToken;
}
// Draws Google's button into `el` (only after the person opened the account sheet). onToken(idToken) is called when they pick an account.
export async function renderGoogleButton(el, hashedNonce, onToken, opts = {}) {
  await loadGis();
  window.google.accounts.id.initialize({ client_id: GOOGLE_WEB_CLIENT_ID, nonce: hashedNonce, use_fedcm_for_button: true, itp_support: true,
    callback: (resp) => { if (resp && typeof resp.credential === "string") onToken(resp.credential); } });
  el.innerHTML = "";
  window.google.accounts.id.renderButton(el, { type: "standard", theme: opts.dark ? "filled_black" : "outline", size: "large", shape: "pill",
    text: "continue_with", logo_alignment: "left", locale: opts.locale || "en", width: Math.min(360, Math.max(200, el.clientWidth || 300)) });
}
