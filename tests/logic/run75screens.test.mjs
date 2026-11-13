// Run 75: anonymous screen-open counts inside the opt-in "Help improve the app". Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { countScreen, readScreenCounts, SCREENS_KEY, writeLearn, learnPreview, sendLearning } = H;
reset();

section("R75-SC1. Counted only while sharing is on");
countScreen("home"); countScreen("ledger");
ok(localStorage.getItem(SCREENS_KEY) === null, "sharing off: nothing is counted or stored");
writeLearn({ on: true, lastDay: "", sent: [], crashSent: "" });
countScreen("home"); countScreen("home"); countScreen("ledger"); countScreen("<script>"); countScreen("x".repeat(40));
const c = readScreenCounts();
ok(c.home === 2 && c.ledger === 1 && Object.keys(c).length === 2, "sharing on: each screen name is counted; odd names are ignored", c);

section("R75-SC2. What would be shared, and the request");
const pv = learnPreview([], { screens: { home: 2, ledger: 1, "bad name": 4, neg: -1 }, lang: "ru", version: "75", platform: "web" });
ok(JSON.stringify(pv.screens) === JSON.stringify([{ screen: "home", opens: 2 }, { screen: "ledger", opens: 1 }]), "the preview lists only screen names and counts", pv.screens);
const calls = []; const fakeOk = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true }; };
ok((await sendLearning(pv, fakeOk)) === true, "sent");
const so = calls.find((x) => /screen_opens$/.test(x.url));
ok(so && so.body.length === 2 && so.body.every((r) => Object.keys(r).sort().join() === "app_version,lang,opens,platform,screen"), "one row per screen with only name, count, language, version and platform", so && so.body);
finish("run75screens");
