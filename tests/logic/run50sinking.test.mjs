// Run 50: set money aside for yearly bills. Expected values worked out by hand (today = 20 Oct 2026); synthetic data only.
import { H, ok, section, reset, setNow, finish } from "./lib.mjs";
const { sinkingCandidates } = H;
reset(); setNow(2026, 9, 20);
const now = new Date(2026, 9, 20);
const bill = (o) => ({ id: "b" + o.name.replace(/\W/g, ""), type: "expense", category: "other", subcategory: "", freq: "yearly", active: true, createdAt: "", ...o });
const bills = [
  bill({ name: "Car insurance", amount: 600, anchorDate: "2025-03-15" }),
  bill({ name: "Tax", amount: 100, anchorDate: "2026-12-31" }),
  bill({ name: "Holiday", amount: 1000.01, anchorDate: "2027-01-10" }),
  bill({ name: "Rent", amount: 500, freq: "monthly", anchorDate: "2026-01-01" }),
  bill({ name: "Old licence", amount: 90, anchorDate: "2026-11-30", active: false }),
  bill({ name: "Refund day", amount: 80, anchorDate: "2026-11-30", type: "income" }),
];
section("R50-S1. Which bills are offered and the monthly amount");
let c = sinkingCandidates([], bills, [], now);
ok(c.length === 3, "three yearly expense bills are candidates", c.map((x) => x.name));
ok(c.map((x) => x.name).join(",") === "Tax,Holiday,Car insurance", "ordered by due date: Tax 31 Dec, Holiday 10 Jan, Car insurance 15 Mar", c.map((x) => x.due + " " + x.name));
const by = Object.fromEntries(c.map((x) => [x.name, x]));
ok(by["Tax"].due === "2026-12-31" && by["Tax"].months === 2 && by["Tax"].perMonth === 50, "Tax 100 due 31 Dec = 2 payments of 50", by["Tax"]);
ok(by["Car insurance"].due === "2027-03-15" && by["Car insurance"].months === 5 && by["Car insurance"].perMonth === 120, "Car insurance 600 due 15 Mar 2027 = 5 payments of 120 (this year's date has passed)", by["Car insurance"]);
ok(by["Holiday"].months === 3 && by["Holiday"].perMonth === 333.34, "1000.01 over 3 months is 333.34, rounded UP so three payments are never short", by["Holiday"]);
ok(!by["Rent"] && !by["Old licence"] && !by["Refund day"], "monthly, paused and income bills are not offered");
section("R50-S2. Leaving out what is already a goal");
c = sinkingCandidates([], bills, [{ id: "g1", name: "  car INSURANCE ", target: 600, saved: 0 }], now);
ok(c.length === 2 && !c.some((x) => x.name === "Car insurance"), "a goal with the same name (any case, spaces ignored) hides that bill's offer", c.map((x) => x.name));
ok(sinkingCandidates([], [], [], now).length === 0 && sinkingCandidates(null, null, null, now).length === 0, "no bills, no offers; missing inputs do not crash");
section("R50-S3. Nothing in the inputs is changed");
const snap = JSON.stringify(bills);
sinkingCandidates([], bills, [], now);
ok(JSON.stringify(bills) === snap, "the bills list is not modified");
finish("run50sinking");
