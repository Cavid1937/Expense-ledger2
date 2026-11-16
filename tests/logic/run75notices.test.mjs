// Run 75: bank notifications kept by the Android listener and read into entries (notify.js readNoticeItems). The texts copy only the
// LAYOUT of real notices; every place, number and amount is invented.
import { ok, section, finish } from "./lib.mjs";
import { readNoticeItems } from "../../notify.js";
const at = (h, m) => new Date(2026, 10, 13, h, m, 0).getTime();

section("R75-N1. Each notice is dated by the time it arrived");
const r1 = readNoticeItems([
  { text: "💳 Payment: -0.90 ₼\nBAKU METRO 8 NOYABR\nCard: **4321\nBalance: 3.26 ₼", time: at(8, 40) },
  { text: "BAKU METRO 8 NOYAB\nAZN0.90 with My Card ..4321", time: at(8, 41) },
  { text: "💳 Payment: -0.90 ₼\nBAKU METRO 8 NOYABR\nCard: **4321\nBalance: 2.36 ₼", time: at(18, 5) },
]);
ok(r1.rows.length === 2, "the bank's and the wallet's notice a minute apart are one payment; the evening ride is a second one", r1.rows.map((r) => [r.time, r.cents]));
ok(r1.rows[0].time === "08:40" && r1.rows[1].time === "18:05" && r1.rows.every((r) => r.date === "2026-11-13" && r.cents === 90 && r.type === "expense"), "both 0.90 out, each at its own time");
ok(!JSON.stringify(r1.rows).includes("4321") && !r1.rows.some((r) => "_t" in r), "no card digits and no internal fields are kept");

section("R75-N2. What is not a payment is dropped");
const r2 = readNoticeItems([{ text: "Your parcel arrives tomorrow", time: at(9, 0) }, { text: "Meeting at 12:00", time: at(9, 1) }, { text: 42, time: at(9, 2) }, { text: "x", time: "soon" }]);
ok(r2.rows.length === 0, "texts that are not payments give nothing (and damaged items are skipped)", r2);
ok(readNoticeItems(null).rows.length === 0 && readNoticeItems([]).rows.length === 0, "nothing kept: nothing to offer");

section("R94-N2. ABB one-line notice: merchant, card and balance on one line, plus the wallet's notice of the same payment");
const r9 = readNoticeItems([
  { text: "Tram 77\nAZN 1.20 with XY10 ••5555", time: at(14, 48) },
  { text: "💸 Payment: -1.20₼\nTram 77 Card: **5555 Balance: 12.34₼", time: at(14, 48) + 2000 },
]);
ok(r9.rows.length === 1, "the two notices of one payment become one entry, not two", r9.rows);
ok(r9.rows[0] && r9.rows[0].merchant === "Tram 77" && r9.rows[0].cents === 120 && r9.rows[0].type === "expense", "Tram 77, 1.20, money out", r9.rows[0]);
ok(r9.rows[0] && !/5555/.test(JSON.stringify(r9.rows[0])), "the card digits are not kept");
ok(r9.problems.length === 0, "nothing left unsure", r9.problems);
const r10 = readNoticeItems([{ text: "Payment: -3.00₼\nCard: **5555 Balance: 9.00₼", time: at(15, 0) }]);
ok(r10.rows.length === 1 && r10.rows[0].merchant === "" && r10.rows[0].cents === 300, "no merchant before the card: still read, the card is not taken as a name", r10.rows);
finish("run75notices");
