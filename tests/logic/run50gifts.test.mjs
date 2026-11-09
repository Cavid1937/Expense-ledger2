// Run 50: gift ledger (a read-only view over existing entries). Expected values worked out by hand; synthetic data only.
import { H, ok, section, reset, finish, T } from "./lib.mjs";
const { giftLedger } = H;
reset();
const g = (id, o) => T({ id, category: "gifts", type: "expense", ...o });
const rcv = (id, o) => T({ id, category: "giftin", type: "income", ...o });
const txns = [
  g(1, { merchant: "Aysel", note: "Wedding", amount: 100, date: "2026-06-10" }),
  g(2, { merchant: "Aysel", note: "Birthday", amount: 30.1, date: "2026-09-01" }),
  g(3, { merchant: "Elnur", subcategory: "Gifts", note: "", amount: 50, date: "2026-08-15" }),
  rcv(4, { merchant: "Aysel", note: "Wedding", amount: 200.2, date: "2026-06-12" }),
  rcv(5, { merchant: "Uncle", note: "Birthday", amount: 20, date: "2026-09-02" }),
  T({ id: 6, category: "food", type: "expense", merchant: "Aysel", amount: 999, date: "2026-09-03" }),
  g(7, { type: "income", merchant: "Wrong", amount: 5, date: "2026-09-04" }),
  g(8, { merchant: "Bad date", amount: 5, date: "nope" }),
];
section("R50-G1. What counts as a gift");
let L = giftLedger(txns);
ok(L.rows.length === 5, "gift expenses (3) and gifts received (2) only; other categories, wrong-direction entries and bad dates are left out", L.rows.map((r) => r.txn.id));
ok(L.given === 180.1 && L.received === 220.2, "given 100 + 30.10 + 50 = 180.10; received 200.20 + 20 = 220.20 (exact cents)", [L.given, L.received]);
ok(L.rows.map((r) => r.txn.id).join() === "5,2,3,4,1", "newest first", L.rows.map((r) => r.txn.id));
ok(L.rows[0].kind === "received" && L.rows[1].kind === "given", "each row says given or received");
section("R50-G2. People");
const a = L.people.find((p) => p.name === "Aysel");
ok(a && a.given === 130.1 && a.received === 200.2 && a.count === 3, "Aysel: gave 130.10, received 200.20, 3 entries", a);
ok(L.people[0].name === "Aysel", "the person with the most money moving is listed first", L.people.map((p) => p.name));
ok(giftLedger([g(1, { merchant: "AYSEL", amount: 1, date: "2026-01-01" }), g(2, { merchant: "aysel ", amount: 2, date: "2026-01-02" })]).people.length === 1, "the same name in different letter case/spacing is one person");
section("R50-G3. Search");
ok(giftLedger(txns, "wedding").rows.length === 2, "'wedding' finds the two wedding entries (given and received)");
ok(giftLedger(txns, "  AYSEL ").rows.length === 3, "search ignores letter case and outer spaces");
ok(giftLedger(txns, "50").rows.length === 1 && giftLedger(txns, "50").rows[0].txn.id === 3, "an amount can be searched");
ok(giftLedger(txns, "zzz").rows.length === 0 && giftLedger(txns, "zzz").given === 0, "no match = empty, totals zero");
ok(giftLedger(null).rows.length === 0 && giftLedger([], "x").people.length === 0, "missing input does not crash");
const snap = JSON.stringify(txns); giftLedger(txns, "a");
ok(JSON.stringify(txns) === snap, "the entries are not modified");
finish("run50gifts");
