// Run 53 (owner): rates refresh by themselves once a day; conversion works for a ledger in any currency a rate exists for ("both ways");
// with no internet the last saved rate is offered, never used silently; spreading a cost takes any number of months from 2 to 24.
// Expected values worked out by hand. No real network: every answer below is made up.
import { H, ok, section, finish, reset, eq, setNow } from "./lib.mjs";
const { ledgerCode, fxBaseOk, fetchCbarRate, fetchLedgerRate, lastSavedRate, warmRates, fxToBase, cleanFx, spreadMonths } = H;
reset();   // the test clock is 13 Oct 2026

// A pretend rate service: 1 USD = 1.7 AZN (published 5 Oct), 1 EUR = 1.9037 (6 Oct), 1 GBP = 2.2, 1 TRY = 0.0398.
const TABLE = { USD: [1.7, "2026-10-05"], EUR: [1.9037, "2026-10-06"], GBP: [2.2, "2026-10-06"], TRY: [0.0398, "2026-10-06"] };
let calls = [];
const service = (up = true) => async (url) => { const cur = (url.match(/base=([A-Z]{3})/) || [])[1]; calls.push(cur + "@" + (url.match(/date=([\d-]+)/) || [])[1]); if (!up) throw new Error("offline"); const r = TABLE[cur]; return r ? { ok: true, json: async () => ({ date: r[1], base: cur, quote: "AZN", rate: r[0] }) } : { ok: false, json: async () => ({}) }; };

section("R53-C1. Which ledgers can convert");
ok(eq(["₼", "AZN", "$", "usd", "€", "£", "₽", "₺", "₾", " EUR "].map(ledgerCode), ["AZN", "AZN", "USD", "USD", "EUR", "GBP", "RUB", "TRY", "GEL", "EUR"]), "the signs and codes the app knows map to a currency code");
ok(eq(["pts", "", null, undefined, "¥", "kr"].map(ledgerCode), ["", "", "", "", "", ""]) && !fxBaseOk("pts") && fxBaseOk("€"), "a made-up or unknown sign maps to nothing: no conversion is offered there");

section("R53-C2. A ledger that is not in manat: the rate is worked out through the manat");
let r = await fetchLedgerRate("EUR", "2026-10-06", "USD", service());
ok(r.rate === 1.11982 && r.on === "2026-10-05", "dollar ledger, paid in euro: 1.9037 / 1.7 = 1.11982 USD; the day shown is the older of the two published days (5 Oct)", r);
ok(fxToBase(100, r.rate) === 111.98, "100.00 EUR is 111.98 USD (100 x 1.11982 = 111.982, rounded to the cent)");
r = await fetchLedgerRate("AZN", "2026-10-06", "USD", service());
ok(r.rate === 0.588235 && r.on === "2026-10-05" && fxToBase(100, r.rate) === 58.82, "dollar ledger, paid in manat: 1 / 1.7 = 0.588235; 100.00 AZN is 58.82 USD", r);
r = await fetchLedgerRate("USD", "2026-10-06", "EUR", service());
ok(r.rate === 0.892998 && fxToBase(50, r.rate) === 44.65, "euro ledger, paid in dollars (the other way round): 1.7 / 1.9037 = 0.892998; 50.00 USD is 44.65 EUR", r);
r = await fetchLedgerRate("EUR", "2026-10-06", "AZN", service());
ok(r.rate === 1.9037 && r.on === "2026-10-06", "manat ledger: unchanged, the Central Bank's own figure");
let threw = 0; for (const [c, b] of [["USD", "USD"], ["usd", "AZN"], ["EUR", "pts"], ["", "USD"]]) { try { await fetchLedgerRate(c, "2026-10-06", b, service()); } catch { threw++; } }
ok(threw === 4, "same currency on both sides, a lower-case code, an unknown ledger or an empty code are refused");
threw = 0; try { await fetchLedgerRate("CHF", "2026-10-06", "USD", service()); } catch { threw++; }
ok(threw === 1, "a currency the service has no rate for is a failure, not a guess");
ok(cleanFx({ cur: "AZN", amt: 100, rate: 0.588235, on: "2026-10-05", src: "cbar" }).rate === 0.588235, "an entry 'paid 100 AZN at 0.588235' is a valid record for a dollar ledger");

section("R53-C3. No internet: the last saved rate, with its day");
reset(); calls = [];
ok(lastSavedRate("EUR") === null && lastSavedRate("EUR", "USD") === null, "nothing saved yet: nothing is offered");
await fetchCbarRate("EUR", "2026-10-06", service());
TABLE.EUR = [1.91, "2026-10-10"]; await fetchCbarRate("EUR", "2026-10-10", service()); TABLE.EUR = [1.9037, "2026-10-06"];
ok(eq(lastSavedRate("EUR"), { rate: 1.91, on: "2026-10-10" }), "two saved euro rates: the newer one (10 Oct) is offered", lastSavedRate("EUR"));
ok(lastSavedRate("GBP") === null && lastSavedRate("EUR", "EUR") === null && lastSavedRate("eur") === null, "a currency never fetched, the ledger's own currency and a bad code give nothing");
ok(lastSavedRate("EUR", "USD") === null, "dollar ledger, but no dollar rate saved: nothing can be worked out");
await fetchCbarRate("USD", "2026-10-06", service());
ok(eq(lastSavedRate("EUR", "USD"), { rate: 1.12353, on: "2026-10-05" }) && eq(lastSavedRate("AZN", "USD"), { rate: 0.588235, on: "2026-10-05" }), "with a saved dollar rate: 1.91 / 1.7 = 1.12353 and 1 / 1.7 = 0.588235, dated by the older day", [lastSavedRate("EUR", "USD"), lastSavedRate("AZN", "USD")]);
threw = 0; calls = []; try { await fetchLedgerRate("GBP", "2026-10-13", "AZN", service(false)); } catch { threw++; }
ok(threw === 1 && lastSavedRate("GBP") === null, "offline and nothing saved for the pound: the fetch fails and nothing is offered (the person types the rate)");

section("R53-C4. Rates refresh by themselves: once per currency per day");
reset(); calls = [];
const used = [{ fx: { cur: "TRY", amt: 5, rate: 0.04 } }, { fx: { cur: "TRY", amt: 1, rate: 0.04 } }, { amount: 3 }, null, { fx: { cur: "bad" } }];
let w = await warmRates(used, "₼", service());
ok(eq(w.asked.slice().sort(), ["EUR", "GBP", "TRY", "USD"]) && calls.length === 4 && calls.every((c) => c.endsWith("@2026-10-13")), "first opening of the day: dollar, euro, pound and the lira the person has used, for today", calls);
ok(!calls.join().includes("amount") && calls.every((c) => /^[A-Z]{3}@\d{4}-\d{2}-\d{2}$/.test(c)), "each request carries a currency code and a date, nothing else");
calls = []; w = await warmRates(used, "₼", service());
ok(w.asked.length === 0 && calls.length === 0, "opening the app again the same day asks for nothing");
ok(eq(lastSavedRate("TRY"), { rate: 0.0398, on: "2026-10-06" }), "the fetched rate is in the phone's store, ready for the add form (published 6 Oct, the latest before today)");
setNow(2026, 9, 14); calls = []; w = await warmRates(used, "₼", service());
ok(w.asked.length === 4 && calls.every((c) => c.endsWith("@2026-10-14")), "the next day: asked again, for the new day");
reset(); calls = []; w = await warmRates(used, "₼", service(false));
ok(w.asked.length === 4 && calls.length === 4, "no internet: each currency is tried once");
calls = []; w = await warmRates(used, "₼", service(false));
ok(w.asked.length === 0 && calls.length === 0, "and not again that day (no retry storm on a bad connection)");
reset(); calls = []; await fetchCbarRate("EUR", "2026-10-13", service()); calls = []; w = await warmRates([], "₼", service());
ok(eq(w.asked.slice().sort(), ["GBP", "USD"]) && calls.length === 2, "a rate already fetched today (the person used the add form) is not asked for again");
reset(); calls = []; w = await warmRates([{ fx: { cur: "AZN", amt: 1, rate: 0.59 } }], "$", service());
ok(eq(w.asked.slice().sort(), ["EUR", "GBP", "USD"]) && !calls.join().includes("AZN"), "dollar ledger: the dollar itself is needed (to work through the manat); the manat is never asked for");
reset(); calls = []; w = await warmRates(used, "pts", service()); const w2 = await warmRates(used, "₼", null);
ok(w.asked.length === 0 && w2.asked.length === 0 && calls.length === 0, "a ledger with a made-up sign, or no network function: nothing is asked");

section("R53-S1. Spread the cost: any whole number of months from 2 to 24");
ok(eq([2, 4, 7, 24, "4", " 12 "].map(spreadMonths), [2, 4, 7, 24, 4, 12]), "2, 4, 7 and 24 are kept, also when typed as text (spaces around the number do not matter)");
ok(eq([0, 1, 25, 100, -3, 2.5, "x", "", null, undefined, "1", "25", "007"].map(spreadMonths), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), "0, 1, 25 and above, negatives, fractions, words and empty mean 'not spread'");
finish("run53currency");
