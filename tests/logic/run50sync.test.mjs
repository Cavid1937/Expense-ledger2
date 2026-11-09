// Run 50: sync merge rules (pure module, not wired into the app). Expected results worked out by hand; synthetic data only.
import { ok, section, finish } from "./lib.mjs";
import { pickRecord, mergeRecords, pruneTombstones, liveRecords, mergeCollections } from "../../syncMerge.js";

section("Per-record choice");
const a = { id: "t1", updatedAt: 100, amount: 10 }, b = { id: "t1", updatedAt: 200, amount: 12 };
ok(pickRecord(a, b) === b && pickRecord(b, a) === b, "newer edit wins in either order");
const del = { id: "t1", updatedAt: 200, deleted: true };
ok(pickRecord(b, del) === del && pickRecord(del, b) === del, "same stamp: the deletion wins in either order");
ok(pickRecord(a, null) === a && pickRecord(undefined, b) === b, "a record present on one side only is kept");
const c1 = { id: "t1", updatedAt: 5, amount: 1 }, c2 = { id: "t1", updatedAt: 5, amount: 2 };
ok(pickRecord(c1, c2) === pickRecord(c2, c1), "equal stamps and content differ: same answer in either order");

section("List merge");
const L = [{ id: "a", updatedAt: 1, v: "L" }, { id: "b", updatedAt: 9, v: "L" }, { id: "d", updatedAt: 3, v: "L" }];
const R = [{ id: "a", updatedAt: 5, v: "R" }, { id: "b", updatedAt: 2, v: "R" }, { id: "c", updatedAt: 4, v: "R" }, { id: "d", updatedAt: 7, deleted: true }];
const m = mergeRecords(L, R);
ok(JSON.stringify(m.map((r) => r.id + r.v)) === JSON.stringify(["aR", "bL", "cR", "dundefined"]), "a=R(newer), b=L(newer), c added from remote, d deleted by remote", m);
ok(liveRecords(m).length === 3, "tombstone is hidden from screens but kept in the data");
ok(JSON.stringify(mergeRecords(L, R)) === JSON.stringify(mergeRecords(R, L)), "merge(L,R) equals merge(R,L)");
ok(JSON.stringify(mergeRecords(m, m)) === JSON.stringify(m), "merging a set with itself changes nothing");
const X = [{ id: "z", updatedAt: 3, v: "X" }];
ok(JSON.stringify(mergeRecords(mergeRecords(L, R), X)) === JSON.stringify(mergeRecords(L, mergeRecords(R, X))), "grouping does not matter (associative)");
ok(mergeRecords(null, undefined).length === 0, "missing lists are treated as empty");

section("Untrusted shapes");
const odd = mergeRecords([{ updatedAt: 1, note: "no id" }, null, 5], [{ id: null, note: "null id" }, { id: 1, updatedAt: 1 }, { id: "1", updatedAt: 2, v: "s" }]);
ok(odd.filter((r) => r.note).length === 2, "records without an id are kept, not dropped");
ok(odd.filter((r) => String(r.id) === "1").length === 1 && odd.find((r) => String(r.id) === "1").v === "s", "numeric and text ids 1 are the same record; newer wins");
ok(mergeRecords([{ id: "q" }], [{ id: "q", updatedAt: 1 }])[0].updatedAt === 1, "a missing stamp counts as oldest (0)");

section("Tombstone pruning and collections");
const now = 200 * 86400000;
const list = [{ id: "old", deleted: true, updatedAt: now - 91 * 86400000 }, { id: "new", deleted: true, updatedAt: now - 10 * 86400000 }, { id: "live", updatedAt: 0 }];
ok(JSON.stringify(pruneTombstones(list, now).map((r) => r.id)) === JSON.stringify(["new", "live"]), "tombstones older than 90 days go; recent ones and live records stay");
const mc = mergeCollections({ goals: [{ id: "g", updatedAt: 1 }] }, { goals: [{ id: "g", updatedAt: 2 }], bills: [{ id: "b", updatedAt: 1 }] }, ["goals", "bills", "debts"]);
ok(mc.goals[0].updatedAt === 2 && mc.bills.length === 1 && mc.debts.length === 0, "named collections merge independently, absent ones are empty");
finish("run50sync");
