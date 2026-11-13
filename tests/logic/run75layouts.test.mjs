// Run 75: bank notices the reader could not understand, masked so they can teach the app new formats (opt-in sharing only).
// Every text below is invented.
import { H, ok, section, finish, reset } from "./lib.mjs";
import { maskNotice } from "../../notify.js";
const { addLayouts, readLayouts, LAYOUTS_KEY, writeLearn, learnPreview, sendLearning } = H;
reset();

section("R75-L1. Masking keeps the layout, never the person");
const m1 = maskNotice("💳 Payment: -4.20 ₼\nKAFE ARAZ\nCard: **4321\nBalance: 95.80 ₼");
ok(m1 === "💳 Payment: -#.## ₼\n[W] [W]\nCard: **####\nBalance: ##.## ₼", "amounts, card digits and the place are replaced; the banking words and layout stay", m1);
const m2 = maskNotice("Elvin Məmmədov sizə 50 AZN köçürdü"), m3 = maskNotice("Оплата 12,50 AZN в магазине Ivanov Ivan, карта *1234");
ok(!/Elvin|Məmmədov|50/.test(m2) && !/Ivanov|Ivan\b|12|1234/.test(m3) && /Оплата/.test(m3) && /карта/.test(m3), "people's names and numbers are gone in az and ru; banking words stay", [m2, m3]);
ok([m1, m2, m3].every((x) => !/\d/.test(x)), "no digit ever survives");

section("R75-L2. Kept only while sharing is on, shown in the preview, sent to its own table");
addLayouts([m1]);
ok(localStorage.getItem(LAYOUTS_KEY) === null, "sharing off: nothing is kept");
writeLearn({ on: true, lastDay: "", sent: [], crashSent: "" });
addLayouts([m1, m1, "Card 4321", m2]);
ok(JSON.stringify(readLayouts()) === JSON.stringify([m1, m2]), "sharing on: masked layouts are kept once each; anything with a digit is refused", readLayouts());
const pv = learnPreview([], { layouts: readLayouts(), lang: "az", version: "75", platform: "android" });
const calls = []; await sendLearning(pv, async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true }; });
const nl = calls.find((x) => /notice_layouts$/.test(x.url));
ok(nl && nl.body.length === 2 && nl.body.every((r) => !/\d/.test(r.layout) && Object.keys(r).sort().join() === "app_version,lang,layout,platform"), "each layout goes as one row: the masked text, language, version and platform only", nl && nl.body);
finish("run75layouts");
