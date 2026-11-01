// Run 24: splitting one entry into several. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { splitTransaction } = H;
reset();
let n = 0; const mk = () => "id" + ++n;
const rcpt = { id: 7, type: "expense", amount: 45.5, category: "shopping", subcategory: "Home", merchant: "Bravo", note: "weekly", date: "2026-10-05", wallet: "cash", trip: "Family", createdAt: "2026-10-05T10:00:00Z" };

section("R24-SP1. A valid split");
const r = splitTransaction(rcpt, [{ category: "food", amount: 30.1 }, { category: "shopping", amount: 15.4 }], mk);
ok(r.ok && r.entries.length === 2 && r.entries[0].amount === 30.1 && r.entries[1].amount === 15.4, "45.50 = 30.10 + 15.40 gives two entries", r);
ok(r.entries.every((e) => e.date === rcpt.date && e.merchant === "Bravo" && e.note === "weekly" && e.wallet === "cash" && e.trip === "Family" && e.type === "expense"), "date, merchant, note, wallet and tag are kept");
ok(r.entries[0].id !== r.entries[1].id && r.entries.every((e) => e.id !== 7), "every part has a new id; the original id is gone");
ok(r.entries[0].subcategory === "" && r.entries[1].subcategory === "Home", "a subcategory stays only on the part that keeps the original category");
const three = splitTransaction({ ...rcpt, amount: 0.3 }, [{ category: "food", amount: 0.1 }, { category: "food", amount: 0.1 }, { category: "other", amount: 0.1 }], mk);
ok(three.ok, "0.1 + 0.1 + 0.1 equals 0.30 to the cent (no float error)");

section("R24-SP2. Refusals");
ok(splitTransaction(rcpt, [{ category: "food", amount: 30 }, { category: "shopping", amount: 15 }], mk).reason === "sum" && splitTransaction(rcpt, [{ category: "food", amount: 30 }, { category: "shopping", amount: 15 }], mk).diff === 0.5, "parts 0.50 short: refused, difference 0.50 reported");
ok(splitTransaction(rcpt, [{ category: "food", amount: 45.5 }], mk).reason === "count" && splitTransaction(rcpt, Array(7).fill({ category: "food", amount: 6.5 }), mk).reason === "count", "1 part and 7 parts are refused");
ok(splitTransaction(rcpt, [{ category: "salary", amount: 40 }, { category: "food", amount: 5.5 }], mk).reason === "category", "an income category for an expense is refused");
ok(splitTransaction(rcpt, [{ category: "food", amount: 0 }, { category: "shopping", amount: 45.5 }], mk).reason === "amount", "a zero part is refused");
ok(splitTransaction({ ...rcpt, recurring: true }, [{ category: "food", amount: 40 }, { category: "shopping", amount: 5.5 }], mk).reason === "linked" && splitTransaction({ ...rcpt, billId: "b1" }, [{ category: "food", amount: 40 }, { category: "shopping", amount: 5.5 }], mk).reason === "linked", "recurring and bill-linked entries are not split");
ok(splitTransaction(null, [], mk).ok === false && splitTransaction({ ...rcpt, amount: "x" }, [{}, {}], mk).ok === false, "junk input is refused");
finish("run24split");
