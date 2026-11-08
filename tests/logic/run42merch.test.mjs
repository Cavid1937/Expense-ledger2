// Run 42: the built-in list of common merchants that suggests a category while typing. Expected values by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { knownMerchants: km, knownMerchantExact: kx, KNOWN_MERCHANTS, CATEGORIES } = H;
reset();
const names = (q, ty) => km(q, ty).map((m) => m.merchant);

section("R42-K1. Matching while typing");
ok(names("net").join() === "Netflix", "net -> Netflix");
ok(names("NETFLIX").join() === "Netflix" && names("  netflix ").join() === "Netflix", "any letter case, spaces around are ignored");
ok(names("bolt").join() === "Bolt,Bolt Food", "bolt -> Bolt and Bolt Food", names("bolt"));
ok(names("jeans").join() === "Gloria Jeans" && names("pizza").join() === "Pizza Hut", "the start of any word in the name matches (jeans, pizza)");
ok(names("mcd").join() === "McDonald's" && names("mc don").length === 0, "mcd -> McDonald's; a space inside the query is matched literally against the name");
ok(names("n").length === 0 && names("").length === 0 && names(null).length === 0 && names("zzzz").length === 0, "one letter, nothing, null or an unknown name give no suggestion");
ok(km("netflix", "income").length === 0, "income never gets suggestions from this list");
ok(km("ba").length === 4 && km("ba", "expense", 2).length === 2, "at most 4 by default; a smaller limit is honoured");
ok(km("net")[0].builtin === true && km("net")[0].count === 0 && km("net")[0].category === "digital" && km("net")[0].subcategory === "Streaming", "each suggestion says it is built-in and carries its category and subcategory");

section("R42-K2. Exact match");
ok(kx("netflix") && kx("netflix").category === "digital" && kx(" Netflix ").subcategory === "Streaming", "Netflix (any case, trimmed) is digital / Streaming");
ok(kx("Net") === null && kx("") === null && kx(null) === null && kx("Netflix Plus") === null, "a partial, empty or longer name is not an exact match");
ok(kx("Bolt").category === "transport" && kx("Bolt Food").category === "food", "Bolt is transport but Bolt Food is food");

section("R42-K3. The list itself is consistent");
const bad = KNOWN_MERCHANTS.filter(([n, c, s]) => { const cat = CATEGORIES.find((x) => x.id === c); return !cat || cat.income || !cat.subs.includes(s); });
ok(bad.length === 0, "every entry points at an existing expense category and one of its own subcategories", bad);
const seen = new Map(); const dup = KNOWN_MERCHANTS.filter(([n]) => { const k = n.toLowerCase(); if (seen.has(k)) return true; seen.set(k, 1); return false; });
ok(dup.length === 0, "no name appears twice", dup);
ok(KNOWN_MERCHANTS.length >= 60, "the list has at least 60 entries", KNOWN_MERCHANTS.length);
finish("run42merch");