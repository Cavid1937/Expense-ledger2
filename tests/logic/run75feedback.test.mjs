// Run 75: "Report a problem / write to us" (sendFeedback). A stand-in replaces the network. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { sendFeedback, cleanFeedbackText, FEEDBACK_KEY } = H;
reset();
const calls = []; const okFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 201 }; };
const now = new Date(2026, 10, 13, 12, 0, 0);

section("R75-F1. What leaves the phone");
ok(cleanFeedbackText("my card 4169 7388 1234 5678 broke and phone +994 50 123 45 67") === "my card … broke and phone +…", "card and phone numbers are hidden before sending", cleanFeedbackText("my card 4169 7388 1234 5678 broke and phone +994 50 123 45 67"));
ok(cleanFeedbackText("x".repeat(3000)).length === 2000, "a very long text is cut to 2,000 characters");
ok((await sendFeedback({ message: "   " }, okFetch, now)) === "empty" && calls.length === 0, "an empty message is not sent");
ok((await sendFeedback({ message: "The app closed", contact: "me@example.com", details: "version 75", lang: "az", version: "75 (2026-11-13)", platform: "android" }, okFetch, now)) === "sent", "a message is sent");
const row = JSON.parse(calls[0].init.body);
ok(/\/rest\/v1\/feedback_reports$/.test(calls[0].url) && calls[0].init.method === "POST" && row.message === "The app closed" && row.contact === "me@example.com" && row.platform === "android" && row.lang === "az", "one row to the add-only table, with only the message, the optional contact and the app's language, version and platform", row);
ok(Object.keys(row).sort().join() === "app_version,contact,details,lang,message,platform", "nothing else is in the row (no entries, no amounts, no device id)");

section("R75-F2. At most 3 a day; failures are named");
await sendFeedback({ message: "two" }, okFetch, now); await sendFeedback({ message: "three" }, okFetch, now);
ok((await sendFeedback({ message: "four" }, okFetch, now)) === "limit" && calls.length === 3, "the 4th message the same day is refused on the phone (nothing sent)");
ok((await sendFeedback({ message: "next day" }, okFetch, new Date(2026, 10, 14, 9, 0, 0))) === "sent", "the next day it works again");
reset();
ok((await sendFeedback({ message: "x" }, async () => { throw new TypeError("Failed to fetch"); }, now)) === "offline" && localStorage.getItem(FEEDBACK_KEY) === null, "no connection: 'offline', and it does not count towards the limit");
ok((await sendFeedback({ message: "x" }, async () => ({ ok: false, status: 400 }), now)) === "failed", "a refused row: 'failed'");
finish("run75feedback");
