// Run 81: accounts (account.js) against a stand-in for the Supabase server. No network; synthetic data only.
// The real server's row-level security was tested separately in SQL (B cannot read, change, delete or create A's row; a stale version
// changes nothing; delete_my_account removes only the caller) - see PHASE_CHECKPOINT Run 81.
import fs from "fs";
import { ok, section, finish } from "./lib.mjs";
import { cleanSession, sessionFromAuth, makeNonce, signInWithGoogleIdToken, freshSession, loadLedger, saveLedger, deleteAccount, accountDue,
  AccountError, ACCOUNT_URL, GOOGLE_WEB_CLIENT_ID } from "../../account.js";

const UID = "11111111-2222-3333-4444-555555555555";
const ID_TOKEN = "aaa.bbb.ccc";
// A tiny fake Supabase: auth (id_token + refresh), one ledger row per user guarded by version, and the delete RPC.
const fakeServer = () => {
  const rows = new Map(), log = []; let access = "A1", refresh = "R1", n = 1;
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body), text: async () => body });
  const issue = () => { n++; access = "A" + n; refresh = "R" + n; return res(200, JSON.stringify({ access_token: access, refresh_token: refresh, expires_in: 3600, user: { id: UID, email: "test@example.invalid", user_metadata: { full_name: "Test Person" } } })); };
  const fn = async (url, init = {}) => {
    const h = init.headers || {}; log.push({ url, method: init.method, h, body: init.body });
    const u = new URL(url);
    if (u.origin !== ACCOUNT_URL) return res(500, "wrong host");
    if (!h.apikey) return res(401, "no apikey");
    if (u.pathname === "/auth/v1/token" && u.searchParams.get("grant_type") === "id_token") { const b = JSON.parse(init.body); return b.provider === "google" && b.id_token === ID_TOKEN ? issue() : res(400, '{"error":"invalid id token"}'); }
    if (u.pathname === "/auth/v1/token" && u.searchParams.get("grant_type") === "refresh_token") { const b = JSON.parse(init.body); return b.refresh_token === refresh ? issue() : res(400, '{"error":"invalid_grant"}'); }
    if (h.Authorization !== "Bearer " + access) return res(401, '{"message":"JWT expired"}');
    if (u.pathname === "/rest/v1/ledgers" && init.method === "GET") { const r = rows.get(UID); return res(200, JSON.stringify(r ? [r] : [])); }
    if (u.pathname === "/rest/v1/ledgers" && init.method === "POST") { if (rows.has(UID)) return res(409, '{"code":"23505"}'); const b = JSON.parse(init.body); const r = { ...b, updated_at: "2026-11-14T10:00:00Z" }; rows.set(UID, r); return res(201, JSON.stringify([r])); }
    if (u.pathname === "/rest/v1/ledgers" && init.method === "PATCH") { const v = Number((u.searchParams.get("version") || "").replace("eq.", "")); const r = rows.get(UID); if (!r || r.version !== v) return res(200, "[]"); const b = JSON.parse(init.body); Object.assign(r, b, { updated_at: "2026-11-14T11:00:00Z" }); return res(200, JSON.stringify([r])); }
    if (u.pathname === "/rest/v1/rpc/delete_my_account") { rows.delete(UID); access = "gone"; refresh = "gone"; return res(204, ""); }
    return res(500, "{}");
  };
  return { fn, rows, log, get access() { return access; } };
};
const now = 1_800_000_000_000;

section("R81-1. Signing in: a Google ID token becomes a session; nothing secret is used");
{
  const srv = fakeServer();
  const s = await signInWithGoogleIdToken(ID_TOKEN, "rawnonce", null, srv.fn, now);
  ok(s && s.userId === UID && s.access === "A2" && s.refresh === "R2" && s.until === now + 3600000, "the server's answer is kept as the session", s);
  ok(s.email === "test@example.invalid" && s.name === "Test Person" && s.version === 0, "name and e-mail shown; no account copy seen yet");
  const sent = JSON.parse(srv.log[0].body);
  ok(sent.provider === "google" && sent.nonce === "rawnonce" && srv.log[0].url.endsWith("/auth/v1/token?grant_type=id_token"), "the raw nonce goes to the server with the token");
  let err = null; try { await signInWithGoogleIdToken("not-a-token", "x", null, srv.fn, now); } catch (e) { err = e; }
  ok(err instanceof AccountError && err.reason === "cancelled" && srv.log.length === 1, "no token = cancelled, and nothing is sent");
  err = null; try { await signInWithGoogleIdToken(ID_TOKEN, "x", null, async () => { throw new Error("net"); }, now); } catch (e) { err = e; }
  ok(err && err.reason === "offline", "no internet = 'offline'");
  const src = fs.readFileSync(new URL("../../account.js", import.meta.url), "utf8");
  ok(!/client_secret|GOCSPX|service_role|sb_secret_/.test(src), "no Google client secret and no server secret key anywhere in account.js");
  ok(GOOGLE_WEB_CLIENT_ID.endsWith(".apps.googleusercontent.com"), "the public web client ID is used");
  const hosts = [...new Set([...src.matchAll(/https?:\/\/[A-Za-z0-9._-]+/g)].map((m) => m[0].replace(/^https?:\/\//, "")))];
  ok(hosts.every((h) => ["qkztocsrxhubsljtsjpd.supabase.co", "accounts.google.com"].includes(h)), "account.js talks only to the app's own server and Google's sign-in", hosts);
}

section("R81-2. The nonce: Google gets the hash, the server gets the raw value");
{
  const { webcrypto, createHash } = await import("crypto");
  const a = await makeNonce(webcrypto), b = await makeNonce(webcrypto);
  ok(/^[0-9a-f]{48}$/.test(a.raw) && a.raw !== b.raw, "a fresh random nonce every time");
  ok(a.hashed === createHash("sha256").update(a.raw).digest("hex"), "the hashed value is SHA-256 of the raw value (hex)");
}

section("R81-3. The stored session is checked when read back (damaged = signed out)");
{
  ok(cleanSession(null) === null && cleanSession({ refresh: "x" }) === null && cleanSession("junk") === null, "missing or damaged -> not signed in");
  const c = cleanSession({ access: "a", refresh: "r", until: 5, userId: UID, version: -3, paused: "evil", extra: "x" });
  ok(c && c.version === 0 && c.paused === "" && !("extra" in c), "bad fields are reset, unknown fields dropped", c);
  const kept = sessionFromAuth({ access_token: "n", refresh_token: "m", expires_in: 60, user: { id: UID } }, { ...c, version: 7, lastHash: "h" }, now);
  ok(kept.version === 7 && kept.lastHash === "h", "renewing the sign-in keeps what this phone knows about the account copy");
  const other = sessionFromAuth({ access_token: "n", refresh_token: "m", user: { id: "99999999-2222-3333-4444-555555555555" } }, { ...c, version: 7 }, now);
  ok(other.version === 0, "a DIFFERENT Google account starts fresh (never inherits another account's version)");
}

section("R81-4. Renewing an expired sign-in");
{
  const srv = fakeServer();
  const s = await signInWithGoogleIdToken(ID_TOKEN, "n", null, srv.fn, now);
  ok((await freshSession(s, srv.fn, now + 1000)) === s, "still valid -> no call");
  const s2 = await freshSession(s, srv.fn, now + 3600000);
  ok(s2.access === "A3" && s2.refresh === "R3", "expired -> renewed with the refresh part");
  let err = null; try { await freshSession({ ...s, until: 0 }, srv.fn, now); } catch (e) { err = e; }
  ok(err && err.reason === "auth", "an old refresh part that the server refuses -> 'auth' (sign in again)");
}

section("R81-5. The account copy: create, read back, save with the version check");
{
  const srv = fakeServer();
  let s = await signInWithGoogleIdToken(ID_TOKEN, "n", null, srv.fn, now);
  ok((await loadLedger(s, srv.fn)) === null, "a new account has no copy");
  const text1 = JSON.stringify({ version: 5, transactions: [{ id: "t1", amount: 5 }] });
  const v1 = await saveLedger(s, text1, 0, "Phone A", srv.fn);
  ok(v1 === 1 && srv.rows.get(UID).user_id === UID, "the first save creates the copy at version 1");
  const got = await loadLedger(s, srv.fn);
  ok(got && JSON.parse(got.text).transactions[0].id === "t1" && got.version === 1 && got.device === "Phone A", "reading it back gives the same data");
  const v2 = await saveLedger(s, JSON.stringify({ version: 5, transactions: [] }), 1, "Phone A", srv.fn);
  ok(v2 === 2, "a save from the version this phone saw -> version 2");
  let err = null; try { await saveLedger(s, text1, 1, "Phone B", srv.fn); } catch (e) { err = e; }
  ok(err && err.reason === "conflict", "a save from an OLD version (another phone saved in between) is refused as a conflict");
  ok(JSON.parse(srv.rows.get(UID).data ? JSON.stringify(srv.rows.get(UID).data) : "{}").transactions.length === 0 && srv.rows.get(UID).version === 2, "...and the newer account copy is untouched");
  err = null; try { await saveLedger(s, text1, 0, "Phone B", srv.fn); } catch (e) { err = e; }
  ok(err && err.reason === "conflict", "creating a copy when one already exists is a conflict too (never overwritten)");
  err = null; try { await saveLedger(s, "{not json", 2, "x", srv.fn); } catch (e) { err = e; }
  ok(err && err.reason === "server" && srv.rows.get(UID).version === 2, "text that is not JSON is never sent");
  err = null; try { await loadLedger({ ...s, access: "stale" }, srv.fn); } catch (e) { err = e; }
  ok(err && err.reason === "auth", "a refused sign-in -> 'auth'");
}

section("R81-6. A damaged answer from the server is refused");
{
  const bad = async () => ({ ok: true, status: 200, json: async () => [{ data: "not an object", version: 1 }], text: async () => "" });
  let err = null; try { await loadLedger({ userId: UID, access: "A" }, bad); } catch (e) { err = e; }
  ok(err && err.reason === "server", "a row whose data is not an object is refused");
  const bad2 = async () => ({ ok: true, status: 200, json: async () => [{ data: {}, version: "7" }], text: async () => "" });
  err = null; try { await loadLedger({ userId: UID, access: "A" }, bad2); } catch (e) { err = e; }
  ok(err && err.reason === "server", "a row whose version is not a whole number is refused");
}

section("R81-7. Deleting the account");
{
  const srv = fakeServer();
  const s = await signInWithGoogleIdToken(ID_TOKEN, "n", null, srv.fn, now);
  await saveLedger(s, JSON.stringify({ a: 1 }), 0, "x", srv.fn);
  ok(await deleteAccount(s, srv.fn) === true && !srv.rows.has(UID), "delete removes the account copy on the server");
  let err = null; try { await loadLedger(s, srv.fn); } catch (e) { err = e; }
  ok(err && err.reason === "auth", "afterwards the old sign-in no longer works");
}

section("R81-8. When the phone saves automatically");
{
  const s = { version: 3, lastHash: "h1", paused: "" };
  ok(accountDue(s, "h2") && !accountDue(s, "h1"), "only when the content changed");
  ok(!accountDue({ ...s, paused: "conflict" }, "h2"), "never while waiting for the person to choose after a conflict");
  ok(!accountDue({ ...s, version: 0 }, "h2"), "never before the first copy was settled (sign-in decides that)");
  ok(!accountDue(null, "h2"), "never when signed out");
}
finish("run81account");
