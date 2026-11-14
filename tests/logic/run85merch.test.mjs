// Run 85: Azerbaijan merchant research seed (14 Nov 2026) applied to the built-in merchant list: aliases, new providers, and the
// false-positive rules from the research README. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { knownMerchants: km, knownMerchantExact: kx, KNOWN_MERCHANTS, KNOWN_MERCHANT_ALIASES, CATEGORIES, parseQuickText } = H;
reset();
const NOW = new Date(2026, 10, 14, 12, 0, 0);
const one = (s, mem = {}) => parseQuickText(s, mem, NOW)[0];

section("R85-M1. Free text: 'bolt 12' and its relatives");
const b = one("bolt 12");
ok(b.ok && b.amount === 12 && b.merchant === "Bolt" && b.category === "transport", "bolt 12 -> Bolt, 12, transport", b);
const bf = one("Bolt Food 12");
ok(bf.amount === 12 && bf.merchant === "Bolt Food" && bf.category === "food" && bf.subcategory === "Delivery", "Bolt Food 12 is food delivery, not a Bolt ride", bf);
const bt = one("bolt taxi 7.5");
ok(bt.amount === 7.5 && bt.merchant === "Bolt taxi" && bt.category === "transport", "an alias keeps what was typed as the name and takes the place's category", bt);
ok(one("boltfood 9").category === "food" && one("bolt yemək 9").category === "food", "BoltFood / Bolt yemək are Bolt Food");
ok(one("yango taxi 6").category === "transport" && one("Yango 6").category === "transport", "Yango and Yango taxi are transport");
ok(one("azerfon 10").subcategory === "Mobile" && one("nar balans 5").subcategory === "Mobile", "Azerfon and 'Nar balans' are the Nar mobile operator");
ok(one("azerigas 30").subcategory === "Gas" && one("Azeristiliktechizat 40").subcategory === "Heating", "gas and heating spellings");

section("R85-M2. Short or common words never pick a category");
for (const w of ["oba", "metro", "favorite", "connect", "rahat", "avis", "hilton", "abb", "kapital bank"]) {
  const r = one(w + " 5");
  ok(r.ok && r.category === "other" && r.subcategory === "", `'${w} 5' stays Other (no guess)`, r);
}
ok(kx("bolt food taxi") === null && kx("bolt 2") === null, "a longer or different phrase is not an exact match");

section("R85-M3. Unknown places and own history");
const u = one("Zəmanət dükanı 14");
ok(u.ok && u.amount === 14 && u.merchant === "Zəmanət dükanı" && u.category === "other", "an unknown place is still a valid entry with no invented category", u);
const mem = { [H.memKey("expense", "Bolt")]: { type: "expense", merchant: "Bolt", category: "work", subcategory: "", count: 3, totalSpent: 30 } };
const own = one("bolt 12", mem);
ok(own.category === "work", "the person's own past category for Bolt beats the built-in list", own);
const ownAlias = one("bolt taxi 4", { [H.memKey("expense", "Bolt taxi")]: { type: "expense", merchant: "Bolt taxi", category: "work", subcategory: "", count: 1, totalSpent: 4 } });
ok(ownAlias.category === "work", "own history also beats an alias", ownAlias);
ok(one("umico 20").category === "shopping" && one("birmarket 20").category === "shopping", "Umico (old name) and Birmarket both still work");

section("R85-M4. Suggestions while typing");
const names = (q) => km(q).map((m) => m.merchant);
ok(names("bolt").join() === "Bolt,Bolt Food", "bolt still suggests Bolt and Bolt Food only", names("bolt"));
ok(names("azerf").join() === "Nar", "typing an alias suggests the place it means (azerf -> Nar)", names("azerf"));
ok(names("starl").join() === "Starlink" && names("unin").join() === "UniNet", "new providers are suggested");
ok(km("ba").length === 4, "still at most 4 suggestions");

section("R85-M5. The lists are consistent");
const names2 = new Set(KNOWN_MERCHANTS.map((x) => x[0]));
ok(KNOWN_MERCHANT_ALIASES.every(([a, n]) => names2.has(n)), "every alias points at a place on the list");
const lower = new Set(KNOWN_MERCHANTS.map((x) => x[0].toLowerCase()));
ok(KNOWN_MERCHANT_ALIASES.every(([a]) => !lower.has(a.toLowerCase())), "no alias repeats a place's own name");
const seen = new Set(); ok(KNOWN_MERCHANT_ALIASES.every(([a]) => { const k = a.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }), "no alias appears twice");
ok(KNOWN_MERCHANT_ALIASES.every(([a]) => a.trim().length >= 5), "every alias is at least 5 letters (no short words)");
const bad = KNOWN_MERCHANTS.filter(([n, c, s]) => { const cat = CATEGORIES.find((x) => x.id === c); return !cat || cat.income || !cat.subs.includes(s); });
ok(bad.length === 0, "every entry still points at an existing expense category and subcategory", bad);
finish("run85merch");
