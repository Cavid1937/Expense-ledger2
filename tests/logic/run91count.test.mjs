// Run 91: the anonymous daily user count (owner chose "Anonymous daily count"). These checks pin down what may leave the phone, how often,
// how the random id changes each month, and that test pages never send. Synthetic data only; no request reaches a real server.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { readCountPref, writeCountPref, activeDayPlan, countablePlace, sendActiveDay, randomMonthId, COUNT_KEY } = H;
reset();
const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
let n = 0;
const makeId = () => ids[n++ % ids.length];
const at = (s) => new Date(s + "T12:00:00");

section("R91C-1. On unless switched off; damaged values are safe");
ok(readCountPref().off === false, "nothing stored: counting is on");
localStorage.setItem(COUNT_KEY, "{broken"); ok(readCountPref().off === false && readCountPref().id === "", "damaged value: on, no id, no crash");
localStorage.setItem(COUNT_KEY, JSON.stringify({ off: true, id: "not-an-id" })); ok(readCountPref().off === true && readCountPref().id === "", "switched off is kept; a malformed id is ignored");
localStorage.removeItem(COUNT_KEY);

section("R91C-2. One line a day, with only these fields");
const p1 = activeDayPlan(readCountPref(), { now: at("2026-11-15"), makeId, platform: "android", version: "91 (2026-11-15)", lang: "az" });
ok(p1 && JSON.stringify(Object.keys(p1.row).sort()) === JSON.stringify(["app_version", "day", "lang", "month_id", "platform"]), "the line has exactly: id, day, platform, version, language", p1 && p1.row);
ok(p1.row.day === "2026-11-15" && p1.row.platform === "android" && p1.row.lang === "az" && p1.row.month_id === ids[0], "values as given", p1.row);
ok(writeCountPref(p1.next) && activeDayPlan(readCountPref(), { now: at("2026-11-15"), makeId }) === null, "after sending, nothing more that day");
const p2 = activeDayPlan(readCountPref(), { now: at("2026-11-16"), makeId });
ok(p2 && p2.row.month_id === ids[0], "the next day in the same month: the same id (so the month counts one person once)");
writeCountPref(p2.next);

section("R91C-3. A new month gets a new random id");
const p3 = activeDayPlan(readCountPref(), { now: at("2026-12-01"), makeId });
ok(p3 && p3.row.month_id === ids[1] && p3.next.month === "2026-12", "December: a different id, so months cannot be linked", p3 && p3.row);
ok(activeDayPlan(readCountPref(), { now: at("2026-11-16"), makeId, platform: "ios?" }) === null, "the same day again: nothing");
const p4 = activeDayPlan({ off: false, month: "", id: "", lastDay: "" }, { now: at("2026-11-20"), makeId, platform: "something" });
ok(p4.row.platform === "web" && p4.row.lang === "en", "unknown platform reads as web; no language reads as en");
ok(activeDayPlan({ off: false, month: "", id: "", lastDay: "" }, { now: at("2026-11-20"), makeId, version: "x".repeat(80), lang: "abcdefgh" }).row.app_version.length === 40, "version is cut to 40 characters");

section("R91C-4. Switched off: never sent");
ok(activeDayPlan({ off: true, month: "2026-11", id: ids[0], lastDay: "" }, { now: at("2026-11-21"), makeId }) === null, "off: no line");
ok(activeDayPlan(null, { now: at("2026-11-21"), makeId }) === null, "no record object: no line");

section("R91C-5. Random ids look like UUID v4 and differ");
const a = randomMonthId(), b = randomMonthId(), c = randomMonthId({ getRandomValues: (x) => { for (let i = 0; i < x.length; i++) x[i] = i * 7; return x; } });
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
ok(V4.test(a) && V4.test(b) && a !== b, "two ids from the phone's random source are valid and different", { a, b });
ok(V4.test(c), "without randomUUID the fallback still makes a valid id", c);

section("R91C-6. Only the live site or the Android app sends");
const win = (href, extra = {}) => { const u = new URL(href); return { location: { protocol: u.protocol, hostname: u.hostname }, navigator: {}, ...extra }; };
ok(countablePlace(win("https://expense-ledger2.vercel.app/")) === true, "the live site counts");
ok(countablePlace(win("file:///C:/x/index.html")) === false, "a test page (file:) never counts");
ok(countablePlace(win("http://localhost:5173/")) === false && countablePlace(win("http://127.0.0.1:5174/")) === false, "a local copy never counts");
ok(countablePlace(win("https://expense-ledger2-abc123-team.vercel.app/")) === false, "a preview deployment never counts");
ok(countablePlace(win("https://expense-ledger2.vercel.app/", { navigator: { webdriver: true } })) === false, "an automated browser never counts, even on the live site");
ok(countablePlace(win("https://localhost/", { LedgerNative: {} })) === true, "the Android app (https://localhost inside the phone) counts");
ok(countablePlace(null) === false, "no window: no");

section("R91C-7. Sending: add-only table, public key, failures are quiet");
let seen = null;
const okFetch = async (url, init) => { seen = { url, init }; return { ok: true }; };
ok(await sendActiveDay(p1.row, okFetch) === true, "accepted -> true");
ok(seen.url.endsWith("/rest/v1/active_days") && seen.init.method === "POST" && seen.init.headers.Prefer === "return=minimal", "POST to active_days, asking nothing back", seen.url);
ok(JSON.stringify(JSON.parse(seen.init.body)) === JSON.stringify(p1.row), "the body is exactly the planned line");
ok(!/transactions|amount|merchant|balance/i.test(seen.init.body), "no ledger fields in the body");
ok(await sendActiveDay(p1.row, async () => ({ ok: false })) === false, "refused -> false");
ok(await sendActiveDay(p1.row, async () => { throw new Error("offline"); }) === false, "offline -> false, no crash");
ok(await sendActiveDay(null, okFetch) === false && await sendActiveDay(p1.row, null) === false, "nothing to send or no fetch -> false");

finish("run91count");
