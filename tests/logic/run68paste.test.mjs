// Run 68: reading pasted bank notifications (notify.js). The texts copy only the LAYOUT of real notifications; every place, number and amount
// here is invented. Expected values worked out by hand.
import { ok, section, finish, eq } from "./lib.mjs";
import { readNotification, readNotifications } from "../../notify.js";
const NOW = new Date(2026, 10, 13, 9, 41);

section("R68-1. One notification in each layout");
const abb = readNotification("💳 Payment: -0.90 ₼\nBAKU METRO 8 NOYABR\nCard: **4321\nBalance: 3.26 ₼", NOW);
ok(abb && abb.type === "expense" && abb.cents === 90 && abb.merchant === "BAKU METRO 8 NOYABR" && abb.date === "2026-11-13" && abb.time === "09:41", "ABB: 0.90 out at BAKU METRO, dated when it arrived", abb);
ok(!JSON.stringify(abb).includes("4321"), "the card digits are not kept");
const wallet = readNotification("BAKU METRO 8 NOYAB\nAZN0.90 with My Card ..4321", NOW);
ok(wallet && wallet.cents === 90 && wallet.merchant === "BAKU METRO 8 NOYAB" && wallet.type === "", "Google Wallet: 0.90 at the place; no direction written (left for the balance or the review)", wallet);
const bir = readNotification("Card to Card\nPAN: 4169 73** **** 1111\nAmount: 7.5 AZN\nTransfer from • 2222\nBalance: 20.00 AZN\nRemaining transfer limit for today: 4 transfers", NOW);
ok(bir && bir.type === "income" && bir.cents === 750 && bir.kind === "transfer" && bir.balance === 2000, "Birbank: 7.50 IN (\"Transfer from\"), one decimal read right, a transfer; the limit line is not an amount", bir);
const leo = readNotification("🛒 12.50 ₼\nBravo Market\nBalans 70.30 ₼", NOW);
ok(leo && leo.cents === 1250 && leo.merchant === "Bravo Market" && leo.balance === 7030 && leo.type === "", "Leobank: 12.50 at Bravo, no sign (direction comes from the balance)", leo);
ok(readNotification("Your code is 4521. Do not share it.", NOW) === null && readNotification("", NOW) === null, "a text without money (a security code) is not an entry");

section("R68-2. Several at once: the same payment told twice is one, and the balance tells in from out");
const two = readNotifications("💳 Payment: -0.90 ₼\nBAKU METRO 8 NOYABR\nCard: **4321\nBalance: 3.26 ₼\n\nBAKU METRO 8 NOYAB\nAZN0.90 with My Card ..4321", NOW);
ok(two.rows.length === 1 && two.rows[0].type === "expense" && two.rows[0].cents === 90 && two.rows[0].merchant === "BAKU METRO 8 NOYABR", "the bank's and the wallet's message about one payment give ONE entry of 0.90 out", two.rows);
const leoChain = readNotifications("🛒 2.29 ₼\nKafe 21\nBalans 73.26 ₼\n\n🛒 2.96 ₼\nBolt\nBalans 70.30 ₼\n\n💸 50.00 ₼\nAysel\nBalans 120.30 ₼", NOW);
ok(eq(leoChain.rows.map((r) => [r.merchant, r.type, r.cents]), [["Kafe 21", "expense", 229], ["Bolt", "expense", 296], ["Aysel", "income", 5000]]), "balances 73.26 → 70.30 → 120.30: Bolt 2.96 out and Aysel 50.00 in are proved by the balance", leoChain.rows.map((r) => [r.merchant, r.type, r.cents]));
ok(leoChain.problems.includes("sign"), "the oldest one (Kafe 21) has no balance before it, so its direction cannot be proved: the review says so instead of pretending");
const unknown = readNotifications("🛒 5.00 ₼\nShop A", NOW);
ok(unknown.rows.length === 1 && unknown.rows[0].type === "expense" && unknown.problems.includes("sign"), "with no sign and no balance: taken as money out and FLAGGED, so the review says it could not tell");
ok(readNotifications("Your code is 4521.\n\n💳 Payment: -3.00 ₼\nPharmacy", NOW).problems.includes("rows:1"), "a message without money among them is left out and counted");
finish("run68paste");
