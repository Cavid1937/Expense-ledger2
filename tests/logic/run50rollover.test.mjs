// Run 50: month-end rollover to a goal. Expected values worked out by hand; synthetic data only.
import { H, ok, section, reset, setNow, finish, T } from "./lib.mjs";
const { rolloverOffer, applyRollover, readRolloverSeen, writeRolloverSeen } = H;
reset(); setNow(2026, 10, 3);
const now = new Date(2026, 10, 3);   // 3 Nov 2026; last month = October
const inc = (d, a) => T({ id: "i" + d + a, type: "income", category: "salary", amount: a, date: d });
const exp = (d, a) => T({ id: "e" + d + a, type: "expense", amount: a, date: d });
const goals = [{ id: "g1", name: "Phone", target: 1000, saved: 900 }, { id: "g2", name: "Trip", target: 500, saved: 100 }, { id: "g3", name: "Done", target: 100, saved: 100 }];

section("R50-1. When the offer appears");
let txns = [inc("2026-10-01", 1000), exp("2026-10-10", 400.25), exp("2026-10-20", 99.75)];
let o = rolloverOffer(txns, goals, "", now);
ok(o && o.month === "2026-10" && o.kept === 500, "1000 in, 500 out in October: 500 kept", o);
ok(o.goals.length === 2 && o.goals[0].id === "g1" && o.goals[1].id === "g2", "finished goal is not offered; two open goals are", o.goals);
ok(o.goals[0].amount === 100 && o.goals[1].amount === 400, "amount is capped at what the goal still needs (100 for Phone, 400 for Trip)", o.goals);
ok(rolloverOffer(txns, goals, "", new Date(2026, 10, 8)) === null, "not after the 7th of the month");
ok(rolloverOffer(txns, goals, "", new Date(2026, 10, 7)) !== null, "still offered on the 7th");
ok(rolloverOffer(txns, goals, "2026-10", now) === null, "not again once October was answered");
ok(rolloverOffer(txns, [], "", now) === null, "no goals, no offer");
ok(rolloverOffer(txns, [goals[2]], "", now) === null, "only finished goals, no offer");
ok(rolloverOffer([inc("2026-10-01", 100), exp("2026-10-02", 150)], goals, "", now) === null, "a month that ended in deficit gives no offer");
ok(rolloverOffer([inc("2026-10-01", 100.5), exp("2026-10-02", 100)], goals, "", now) === null, "under 1 left over is not worth a prompt");
ok(rolloverOffer([inc("2026-11-01", 1000)], goals, "", now) === null, "this month's money does not count as last month's");
ok(rolloverOffer([inc("2026-10-01", 300), exp("2026-10-31", 0.1), exp("2026-10-31", 0.2)], goals, "", now).kept === 299.7, "cents stay exact (300 - 0.1 - 0.2 = 299.70)");
o = rolloverOffer([inc("2026-12-05", 700), exp("2026-12-06", 200)], goals, "", new Date(2027, 0, 2));
ok(o && o.month === "2026-12" && o.kept === 500, "in early January the month looked back at is December of the old year", o);

section("R50-2. Applying it");
let g2 = applyRollover(goals, "g2", 400);
ok(g2.find(g => g.id === "g2").saved === 500 && g2.find(g => g.id === "g1").saved === 900, "only the chosen goal changes: Trip 100 -> 500");
ok(applyRollover(goals, "g1", 250).find(g => g.id === "g1").saved === 1000, "never goes past the target (900 + 250 -> 1000)");
ok(applyRollover(goals, "g2", 0.1).find(g => g.id === "g2").saved === 100.1, "small amounts keep cents (100 + 0.1 = 100.1)");
ok(applyRollover(goals, "g2", -5) === goals && applyRollover(goals, "g2", "x") === goals, "zero, negative or non-numeric changes nothing");
ok(applyRollover(goals, "nope", 50).every((g, i) => g.saved === goals[i].saved), "an unknown goal changes nothing");
ok(goals[1].saved === 100, "the original list is not modified");

section("R50-3. Remembering the answer");
ok(readRolloverSeen() === "", "nothing remembered at first");
writeRolloverSeen("2026-10");
ok(readRolloverSeen() === "2026-10", "answer for October is remembered");
ok(!globalThis.__store.has("expense_ledger_v5"), "the main data key is untouched by this");
finish("run50rollover");
