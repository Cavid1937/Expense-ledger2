// Run 50: writing entries as a sentence. Expected values worked out by hand (today = Tue 20 Oct 2026); synthetic data only.
import { H, ok, section, reset, setNow, finish, T } from "./lib.mjs";
const { parseQuickText, buildMerchantMemory } = H;
reset(); setNow(2026, 9, 20);
const now = new Date(2026, 9, 20);
const p = (s, mem = {}) => parseQuickText(s, mem, now);

section("R50-T1. One entry");
let r = p("netflix 9.99");
ok(r.length === 1 && r[0].ok && r[0].amount === 9.99 && r[0].merchant === "Netflix" && r[0].type === "expense" && r[0].date === "2026-10-20", "'netflix 9.99' = expense 9.99, Netflix, today", r[0]);
ok(r[0].category === "digital" && r[0].subcategory === "Streaming", "the built-in merchant list gives the category (digital / Streaming)", r[0]);
r = p("market 25");
ok(r[0].category === "other" && r[0].merchant === "Market" && r[0].amount === 25, "an unknown place falls back to Other, never a guess");
r = p("coffee 3,50");
ok(r.length === 1 && r[0].amount === 3.5, "a comma between digits is a decimal mark: 3,50 is 3.50 (one entry, not two)", r);
r = p("taksi 8 manat");
ok(r[0].amount === 8 && r[0].merchant === "Taksi", "the word manat is dropped from the merchant", r[0]);
r = p("taksi 8 ₼");
ok(r[0].amount === 8 && r[0].merchant === "Taksi", "the ₼ sign is dropped from the merchant", r[0]);

section("R50-T2. Several entries in one line");
r = p("bolt 12, market 25 yesterday");
ok(r.length === 2 && r[0].merchant === "Bolt" && r[0].date === "2026-10-20" && r[1].merchant === "Market" && r[1].date === "2026-10-19", "two entries; 'yesterday' applies to its own entry only", r.map((x) => x.merchant + " " + x.date));
r = p("coffee 3,50, tea 2");
ok(r.length === 2 && r[0].amount === 3.5 && r[1].amount === 2, "comma decimal and comma separator together: 3.50 and 2", r.map((x) => x.amount));
r = p("a 1\nb 2; c 3");
ok(r.length === 3 && r.map((x) => x.amount).join() === "1,2,3", "new lines and semicolons separate entries");
r = p(Array.from({ length: 30 }, (_, i) => "x " + (i + 1)).join("\n"));
ok(r.length === 20, "at most 20 entries are read at once", r.length);

section("R50-T3. Dates and languages");
ok(p("dünən taksi 8")[0].date === "2026-10-19" && p("вчера такси 8")[0].date === "2026-10-19", "dünən (az) and вчера (ru) mean yesterday", [p("dünən taksi 8")[0].date, p("вчера такси 8")[0].date]);
ok(p("такси 8 вчера")[0].merchant === "Такси", "Russian merchant keeps its letters and a capital first letter");
ok(p("srağagün taksi 8")[0].date === "2026-10-18" && p("позавчера такси 8")[0].date === "2026-10-18", "day before yesterday (az, ru)");
ok(p("bu gün çörək 1")[0].date === "2026-10-20" && p("çörək 1")[0].merchant === "Çörək", "'bu gün' = today and is removed from the name; ə/ö/ç survive");
ok(p("lunch 12 15.10.2026")[0].date === "2026-10-15" && p("lunch 12 15.10.2026")[0].amount === 12, "a full date dd.mm.yyyy sets the date and is not read as an amount");
ok(p("rent 500 2026-10-01")[0].date === "2026-10-01" && p("rent 500 2026-10-01")[0].amount === 500, "ISO date sets the date");
ok(p("lunch 12 15/10")[0].date === "2026-10-15", "dd/mm = this year");
ok(p("lunch 12 25/12")[0].date === "2025-12-25", "dd/mm that would be in the future = last year");
r = p("lunch 12 31.02.2026");
ok(r[0].ok && r[0].date === "2026-10-20" && r[0].amount === 12 && r[0].warn === true, "an impossible date is not saved and not read as an amount: today is kept, 12 stays the amount, the row is flagged", r[0]);

section("R50-T4. Income");
r = p("maaş 1500");
ok(r[0].type === "income" && r[0].category === "salary" && r[0].amount === 1500 && r[0].merchant === "", "'maaş 1500' = income, Salary", r[0]);
r = p("+200 gift");
ok(r[0].type === "income" && r[0].amount === 200 && r[0].merchant === "Gift" && r[0].category === "income", "'+200 gift' = income, Other income, merchant Gift", r[0]);
ok(p("зарплата 900")[0].category === "salary", "зарплата = salary");

section("R50-T5. Things it must not guess");
r = p("nothing here");
ok(r.length === 1 && !r[0].ok && r[0].reason === "noAmount" && r[0].amount === null, "no number: flagged, no amount invented", r[0]);
r = p("abc 0");
ok(!r[0].ok && r[0].reason === "badAmount", "zero is not an amount", r[0]);
r = p("tea 2 coffee 3");
ok(r[0].ok && r[0].amount === 3 && r[0].warn === true, "two numbers: the last is taken and the row is flagged for the review", r[0]);
ok(p("").length === 0 && p(null).length === 0 && p("  ,  ; \n").length === 0, "empty text gives nothing");
ok(p("coffee 99999999999")[0].ok === false, "an amount above the app's limit is refused", p("coffee 99999999999")[0]);

section("R50-T6. The person's own history comes first");
const mem = buildMerchantMemory([T({ id: 1, merchant: "Bolt", category: "transport", subcategory: "Taxi" })]);
const before = JSON.stringify(mem);
r = p("bolt 12", mem);
ok(r[0].category === "transport" && r[0].subcategory === "Taxi", "Bolt is a Transport / Taxi because that is what the person recorded before", r[0]);
ok(JSON.stringify(mem) === before, "the memory object is not modified");
r = p("netflix 9.99", buildMerchantMemory([T({ id: 2, merchant: "Netflix", category: "entertain", subcategory: "Cinema" })]));
ok(r[0].category === "entertain", "own history beats the built-in list", r[0]);
finish("run50text");
