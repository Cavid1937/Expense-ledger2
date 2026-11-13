// Run 69: "Help improve the app" (opt-in, free Supabase project, insert only). What may leave the phone is decided here, on the phone,
// so these checks pin it down. Every name, place and number below is invented. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { readLearn, writeLearn, cleanPlace, learnPreview, sendLearning, LEARN_KEY } = H;
reset();

section("R69-1. Off unless the person turns it on");
ok(readLearn().on === false, "nothing stored: off");
localStorage.setItem(LEARN_KEY, "{broken"); ok(readLearn().on === false, "damaged value: off, no crash");
localStorage.setItem(LEARN_KEY, JSON.stringify({ on: "yes" })); ok(readLearn().on === false, "anything other than exactly true: off");
ok(writeLearn({ on: true, lastDay: "", sent: [], crashSent: "" }) && readLearn().on === true, "turning it on is remembered");
localStorage.removeItem(LEARN_KEY);

section("R69-2. Place names are cleaned on the phone");
ok(cleanPlace("Bravo Market") === "Bravo Market", "a shop name stays");
ok(cleanPlace("BAKU METRO **4321") === "BAKU METRO", "card digits after the place are cut off");
ok(cleanPlace("Kapital 1234567812345678") === "", "a long number drops the whole name");
ok(cleanPlace("+994 50 123 45 67") === "", "a phone number is dropped");
ok(cleanPlace("someone@mail.az") === "", "an e-mail is dropped");
ok(cleanPlace("Nizami küç. 12") === "" && cleanPlace("ул. Низами 5") === "", "addresses are dropped (az and ru)");
ok(cleanPlace("Transfer to card") === "" && cleanPlace("Köçürmə") === "" && cleanPlace("Перевод") === "", "money transfers are dropped");
ok(cleanPlace("Leyla Mammadova") === "" && cleanPlace("Rauf Aliyev oğlu") === "", "something that looks like a person's name is dropped");
ok(cleanPlace("Araz Market") === "Araz Market", "two capitalised words that name a shop stay");
ok(cleanPlace("x") === "" && cleanPlace("A".repeat(41)) === "", "too short or too long is dropped");

section("R69-3. Only places used at least twice, never amounts, dates or notes");
const E = (o) => ({ id: Math.random(), type: "expense", amount: 12.34, category: "food", subcategory: "groceries", merchant: "Bravo Market", note: "secret note", date: "2026-11-01", ...o });
const tx = [
  E({}), E({ amount: 99.99, date: "2026-11-05" }),
  E({ merchant: "Once Only Cafe", category: "restaurants" }),
  E({ merchant: "Flower Shop", category: "gifts" }), E({ merchant: "Flower Shop", category: "gifts" }),
  E({ merchant: "Uncle Rauf", category: "family" }), E({ merchant: "Uncle Rauf", category: "family" }),
  E({ merchant: "Bank Loan", debtLink: "d1" }), E({ merchant: "Bank Loan", debtLink: "d1" }),
  E({ type: "income", merchant: "Employer LLC", category: "salary" }), E({ type: "income", merchant: "Employer LLC", category: "salary" }),
];
const pv = learnPreview(tx, { lang: "az", version: "2026.11.13", platform: "web" });
ok(pv.places.length === 1 && pv.places[0].place === "Bravo Market" && pv.places[0].category === "food" && pv.places[0].subcategory === "groceries", "only the place used twice, with its category", pv.places);
const blob = JSON.stringify(pv);
ok(!/12\.34|99\.99|2026-11-0|secret note|Flower|Rauf|Bank Loan|Employer|Once Only/.test(blob), "no amount, date, note, gift, family, debt, income or one-off place in what would be sent", blob);
ok(pv.ping.lang === "az" && pv.ping.app_version === "2026.11.13" && pv.ping.platform === "web" && Object.keys(pv.ping).length === 3, "the daily line holds only language, version and web/Android");
ok(learnPreview(tx, { sent: [pv.places[0].key] }).places.length === 0, "a place already shared is not sent again");

section("R69-4. Crash messages lose quoted text and numbers");
const crashLog = [{ at: "2026-11-10T10:00:00Z", message: 'Cannot read "Bravo Market" of 1234567' }, { at: "2026-11-01T10:00:00Z", message: "old" }];
const c = learnPreview([], { crashLog, crashSent: "2026-11-05T00:00:00Z" }).crashes;
ok(c.length === 1 && !/Bravo|1234567/.test(c[0].message) && /Cannot read/.test(c[0].message), "only new crashes, with quotes and long numbers removed", c);

section("R69-5. Sending: three insert-only requests, and true only when all were accepted");
const calls = [];
const fakeOk = (url, init) => { calls.push({ url, init }); return Promise.resolve({ ok: true }); };
ok((await sendLearning(pv, fakeOk)) === true, "all accepted → true");
ok(calls.length === 2 && calls.every((x) => x.init.method === "POST" && /^https:\/\/qkztocsrxhubsljtsjpd\.supabase\.co\/rest\/v1\/(usage_pings|place_reports)$/.test(x.url)), "two POSTs (no crashes to send, so no third request), to the project's own tables", calls.map((x) => x.url));
ok(calls.every((x) => !/12\.34|99\.99|secret|2026-11-0/.test(x.init.body)), "no amount, note or spending date in any request body");
ok((await sendLearning(pv, () => Promise.resolve({ ok: false }))) === false, "a refused request → false (nothing is marked as sent)");
ok((await sendLearning(pv, () => Promise.reject(new Error("offline")))) === false, "no connection → false, no crash");
ok((await sendLearning(pv, null)) === false, "no fetch available → false");
finish("run69learn");
