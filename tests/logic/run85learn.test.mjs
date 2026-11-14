// Run 85: the one-time "Help improve the app?" question and the new action counts. Nothing is counted or sent unless the person said yes.
// Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { readLearn, writeLearn, countScreen, readScreenCounts, learnPreview, LEARN_KEY, SCREENS_KEY } = H;
reset();

section("R85-L1. The question is asked once");
localStorage.removeItem(LEARN_KEY);
ok(readLearn().asked === false && readLearn().on === false, "fresh install: not asked, off");
localStorage.setItem(LEARN_KEY, JSON.stringify({ on: false, asked: "yes" }));
ok(readLearn().asked === false, "anything other than exactly true is not an answer");
writeLearn({ ...readLearn(), on: false, asked: true });
ok(readLearn().asked === true && readLearn().on === false, "'No, thanks' is remembered and sharing stays off");
writeLearn({ ...readLearn(), lastDay: "2026-11-14" });
ok(readLearn().asked === true, "the answer survives later saves (the daily send spreads the old value)");
localStorage.setItem(LEARN_KEY, "{broken");
ok(readLearn().asked === false && readLearn().on === false, "a damaged value: off, and asking again is allowed");

section("R85-L2. Actions are counted only while sharing is on");
localStorage.removeItem(SCREENS_KEY);
writeLearn({ on: false, asked: true, lastDay: "", sent: [], crashSent: "" });
countScreen("do-add"); countScreen("do-add");
ok(Object.keys(readScreenCounts()).length === 0, "off: nothing is counted at all");
writeLearn({ on: true, asked: true, lastDay: "", sent: [], crashSent: "" });
countScreen("do-add"); countScreen("do-add"); countScreen("do-delete"); countScreen("home");
const c = readScreenCounts();
ok(c["do-add"] === 2 && c["do-delete"] === 1 && c.home === 1, "on: add 2, delete 1, home 1", c);
countScreen("do add 5"); countScreen("<b>"); countScreen("");
ok(Object.keys(readScreenCounts()).length === 3, "names that are not plain words are refused");
const pv = learnPreview([], { screens: readScreenCounts(), lang: "az", version: "85", platform: "web" });
ok(pv.screens.some((x) => x.screen === "do-add" && x.opens === 2) && pv.screens.length === 3, "the counts reach the daily lines as names and numbers only", pv.screens);
ok(JSON.stringify(pv).indexOf("amount") === -1, "no amount field anywhere in what would be sent");
localStorage.removeItem(SCREENS_KEY); localStorage.removeItem(LEARN_KEY);
finish("run85learn");
