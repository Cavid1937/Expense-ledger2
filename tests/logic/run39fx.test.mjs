// Run 39 (2026-11-07): entries paid in another currency. The ledger keeps the manat amount (all totals unchanged); fx remembers what was paid
// and at which rate. Expected values worked out by hand. The network is replaced by a fake; synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { cleanFx, fxToBase, fetchCbarRate, fxBaseOk, normaliseTxn, buildCsv, migrateAndLoad, calcMonthSummary, forSpending } = H;
reset();

section("R39-1. Converting to manat: whole numbers, half-up to the qəpik");
ok(fxToBase(100, 1.90371) === 190.37, "100.00 EUR × 1.90371 = 190.371 -> 190.37", fxToBase(100, 1.90371));
ok(fxToBase(12.34, 1.9037) === 23.49, "12.34 × 1.9037 = 23.491658 -> 23.49", fxToBase(12.34, 1.9037));
ok(fxToBase(0.03, 0.5) === 0.02 && fxToBase(0.01, 1.7) === 0.02, "0.015 and 0.017 round half-up to 0.02", [fxToBase(0.03, 0.5), fxToBase(0.01, 1.7)]);
ok(fxToBase(1000, 0.0105263) === 10.53, "1000 JPY × 0.0105263 = 10.5263 -> 10.53", fxToBase(1000, 0.0105263));
ok(fxToBase(9999999.99, 1.70001) === 17000099.98, "a large amount stays exact (9,999,999.99 × 1.70001 = 17,000,099.9799… -> 17,000,099.98)", fxToBase(9999999.99, 1.70001));

section("R39-2. What is kept");
ok(eq(cleanFx({ cur: "EUR", amt: 100, rate: 1.903712, on: "2026-11-06", src: "cbar" }), { cur: "EUR", amt: 100, rate: 1.90371, on: "2026-11-06", src: "cbar" }), "a valid record; the rate kept to 6 significant digits");
ok(cleanFx({ cur: "eur", amt: 1, rate: 1 }) === null && cleanFx({ cur: "AZN", amt: 1, rate: 1 }) === null && cleanFx({ cur: "EUR", amt: 1.234, rate: 1 }) === null && cleanFx({ cur: "EUR", amt: 0, rate: 1 }) === null && cleanFx({ cur: "EUR", amt: 1, rate: "2" }) === null && cleanFx("x") === null, "refused: lower-case code, AZN itself, 3 decimals, zero, a rate given as text, junk");
ok(cleanFx({ cur: "USD", amt: 5, rate: 1.7, src: "weird" }).src === "cbar" && cleanFx({ cur: "USD", amt: 5, rate: 1.7, src: "manual" }).src === "manual", "the source is either the Central Bank or the person's own rate");
ok(fxBaseOk("₼") && fxBaseOk("AZN") && !fxBaseOk("$"), "offered only when the ledger currency is the manat");

section("R39-3. Stored with the entry; totals use the manat amount");
const e = T({ id: 1, amount: 190.37, date: "2026-10-05", fx: { cur: "EUR", amt: 100, rate: 1.90371, on: "2026-10-03", src: "cbar" } });
ok(eq(normaliseTxn(e).fx, { cur: "EUR", amt: 100, rate: 1.90371, on: "2026-10-03", src: "cbar" }) && normaliseTxn(e).amount === 190.37, "normaliseTxn keeps fx and does not touch the amount");
ok(!("fx" in normaliseTxn(T({ id: 2, fx: { cur: "EUR", amt: -1, rate: 1 } }))) && !("fx" in normaliseTxn(T({ id: 3 }))), "invalid fx is dropped; an entry without fx keeps its old shape");
globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: [e], language: "en" }));
ok(migrateAndLoad().transactions[0].fx.cur === "EUR", "it survives saving and loading");
const s = calcMonthSummary(forSpending([e, T({ id: 4, amount: 9.63, date: "2026-10-06" })]), "2026-10", "2026-09", new Date(2026, 9, 31));
ok(s.curExp === 200, "spending = 190.37 (the EUR entry in manat) + 9.63 = 200.00", s.curExp);
const lines = buildCsv([e]).replace(/^﻿/, "").split("\r\n");
ok(/"190\.37"/.test(lines[1]) && /"100\.00","EUR","1\.90371"$/.test(lines[1]), "CSV: Amount 190.37 in manat, and PaidAmount 100.00, PaidCurrency EUR, Rate 1.90371", lines[1]);

section("R39-4. The official rate: asked once per currency and day, then remembered");
reset();
let calls = 0, lastUrl = "";
const fake = (body, okk = true) => async (url) => { calls++; lastUrl = url; return { ok: okk, json: async () => body }; };
const r1 = await fetchCbarRate("EUR", "2026-10-06", fake({ date: "2026-10-06", base: "EUR", quote: "AZN", rate: 1.9037 }));
ok(r1.rate === 1.9037 && r1.on === "2026-10-06", "1 EUR = 1.9037 ₼: the Central Bank's own published figure, not a rounded inverse", r1);
ok(/providers=cbar/.test(lastUrl) && /base=EUR/.test(lastUrl) && /quotes=AZN/.test(lastUrl) && /date=2026-10-06/.test(lastUrl) && !/amount|merchant|category/.test(lastUrl), "the request carries only the currency and the date", lastUrl);
await fetchCbarRate("EUR", "2026-10-06", fake([]));
ok(calls === 1, "the second time it comes from this device (no request)", calls);
const sat = await fetchCbarRate("USD", "2026-10-11", fake({ date: "2026-10-10", base: "USD", quote: "AZN", rate: 1.7 }));
ok(sat.rate === 1.7 && sat.on === "2026-10-10", "a Sunday gets Friday's published rate, and says which day it is (1 USD = 1.70 ₼)", sat);
let threw = 0;
try { await fetchCbarRate("GBP", "2026-10-06", fake([], false)); } catch { threw++; }
try { await fetchCbarRate("GBP", "2026-10-06", fake({ quote: "AZN", rate: 0 })); } catch { threw++; }
try { await fetchCbarRate("gbp", "2026-10-06", fake([])); } catch { threw++; }
ok(threw === 3, "no answer, a zero rate or a bad code: it fails, so the person types the rate (never a guessed rate)");
const fut = await fetchCbarRate("TRY", "2026-12-30", fake({ date: "2026-10-13", base: "TRY", quote: "AZN", rate: 0.0398 }));
ok(/date=2026-10-13/.test(lastUrl) && fut.on === "2026-10-13", "a future date asks for today's rate", lastUrl);
section("R39-5. Quick-add link: fills the form, checks every value, never saves");
const { parseQuickAdd } = H;
ok(eq(parseQuickAdd("?add=expense&amount=4.50&merchant=Coffee&category=food"), { type: "expense", amount: 4.5, category: "food", merchant: "Coffee", note: "" }), "expense 4.50, Coffee, Food");
ok(parseQuickAdd("?add=income&amount=1500&category=Pension").category === "pension" && parseQuickAdd("?add=income&category=food").category === "salary", "income: Pension by name; an expense category on an income falls back to Salary");
ok(parseQuickAdd("?add=expense&amount=-5").amount === "" && parseQuickAdd("?add=expense&amount=1.234").amount === "" && parseQuickAdd("?add=expense&amount=abc").amount === "" && parseQuickAdd("?add=expense&amount=3,5").amount === 3.5, "a negative, 3-decimal or text amount is left empty; 3,5 is read as 3.50");
ok(parseQuickAdd("?amount=5") === null && parseQuickAdd("?add=delete") === null && parseQuickAdd("") === null, "no 'add', or an unknown kind: nothing opens");
ok(parseQuickAdd("?add=expense&merchant=" + "x".repeat(300)).merchant.length === 80 && !/[\u0000-\u001f]/.test(parseQuickAdd("?add=expense&note=a%0Ab").note), "long text is cut; control characters are removed");
finish("run39fx");
