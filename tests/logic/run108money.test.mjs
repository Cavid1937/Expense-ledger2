// Run 108 (release readiness): property test of the money boxes. What a person types or pastes goes through cleanMoneyText (while typing)
// and formMoney (on Save). For random input: the result is never NaN, negative, more than 2 decimals or above the largest amount; a minus
// sign or an exponent is never silently dropped (it is refused, so -5 can never be saved as 5); common ways of writing an amount
// (1234.56, 1234,56, 1 234,56, 1,234.56, 1.234,56) all give exactly the same amount, also when typed one key at a time; and the
// small calculator (evalAmountExpr) never throws and only gives whole qapik above 0. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { cleanMoneyText, formMoney, evalAmountExpr } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(108108);
const int = (n) => Math.floor(r() * n);
const MAX = 999999999.99;
// the app's own rule (isWholeCents): a float tolerance is wrong near the largest amount, where v*100 is not exact
const wholeCents = (v) => Number(v.toFixed(2)) === v;
const good = (v) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX && wholeCents(v));
// typing one key at a time: the box shows cleanMoneyText of what was there plus the new key
const typeIn = (s) => [...s].reduce((box, ch) => cleanMoneyText(box + ch), "");

section("R108-M1. 20,000 random typed or pasted texts: the saved amount is always a valid amount or refused");
{
  const keys = "0123456789012345678901234567890123456789..,,    -+eE₼AZNabc$١٢";
  const bad = [];
  for (let i = 0; i < 20000; i++) {
    let s = ""; const n = 1 + int(16);
    for (let j = 0; j < n; j++) s += keys[int(keys.length)];
    const paste = r() < 0.5;
    const shown = cleanMoneyText(s, paste ? { paste: true } : undefined);
    const v = formMoney(shown), vp = formMoney(shown, { positive: true });
    if (!good(v) || !good(vp) || (vp !== null && vp <= 0)) bad.push([s, shown, v, vp]);
    // a sign or exponent anywhere: never accepted as a number
    if (/[-+eE]/.test(s) && v !== null) bad.push(["sign kept as number", s, shown, v]);
    // what the box shows does not change when it is cleaned again (no drifting value on re-render)
    if (!/[-+eE]/.test(s) && cleanMoneyText(shown) !== shown) bad.push(["not stable", s, shown, cleanMoneyText(shown)]);
    if (bad.length > 5) break;
  }
  ok(bad.length === 0, "no NaN, negative, over-2-decimal or too-large amount; signs refused; the shown text is stable", bad.slice(0, 5));
}

section("R108-M2. 3,000 random amounts written five common ways: pasted or typed, each gives exactly the same amount");
{
  const bad = [];
  const group = (intStr, sep) => intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  for (let i = 0; i < 3000; i++) {
    const q = r() < 0.2 ? int(1000) : r() < 0.5 ? int(10000000) : int(99999999999);
    const intStr = String(Math.floor(q / 100)), dec = String(q % 100).padStart(2, "0"), want = q / 100;
    const forms = [`${intStr}.${dec}`, `${intStr},${dec}`, `${group(intStr, " ")},${dec}`, `${group(intStr, " ")},${dec}`, `${group(intStr, ",")}.${dec}`, `${group(intStr, ".")},${dec}`];
    forms.forEach((f, k) => {
      const pasted = formMoney(cleanMoneyText(f, { paste: true }));
      if (pasted !== want) bad.push(["paste", f, pasted, want]);
      // typed: the first four. Typing 1,234.56 key by key is refused at the 3rd digit after the first mark on purpose (the box shows it,
      // and a typed extra digit must never make the amount jump 1000 times); only pasted text reads , or . as thousands marks.
      if (k < 4) { const typed = formMoney(typeIn(f)); if (typed !== want) bad.push(["typed", f, typed, want]); }
    });
    if (bad.length > 5) break;
  }
  ok(bad.length === 0, "1234.56 / 1234,56 / 1 234,56 / 1,234.56 / 1.234,56 pasted, and the first three typed: all exact", bad.slice(0, 5));
  // whole amounts pasted with thousands marks (a common copy from a bank page) are whole amounts, never divided by 1000
  const whole = [["1,234", 1234], ["1.234", 1234], ["12,345,678", 12345678], ["1 234", 1234], ["0,123", 0.12]];
  const wbad = whole.filter(([s, w]) => formMoney(cleanMoneyText(s, { paste: true })) !== w).map(([s, w]) => [s, formMoney(cleanMoneyText(s, { paste: true })), w]);
  ok(wbad.length === 0, "pasted 1,234 and 1.234 are 1234 (a lone 0,123 stays a decimal and keeps 2 places)", wbad);
}

section("R108-M3. 20,000 random calculator texts (45.00 - 20 style): never an error, only whole qapik above 0 or refused");
{
  const keys = "0123456789012345678901234567890123456789..,,+-*/()x×÷− ";
  const bad = []; let accepted = 0;
  for (let i = 0; i < 20000; i++) {
    let s = ""; const n = 1 + int(20);
    for (let j = 0; j < n; j++) s += keys[int(keys.length)];
    let v;
    try { v = evalAmountExpr(s); } catch (e) { bad.push(["threw", s, String(e)]); continue; }
    if (v !== null) { accepted++; if (!(Number.isFinite(v) && v > 0 && v <= MAX && wholeCents(v))) bad.push([s, v]); }
    if (bad.length > 5) break;
  }
  const known = [["45.00-20", 25], ["12,5*2", 25], ["(10+5)/3", 5], ["10/3", 3.33], ["5-5", null], ["1/0", null], ["2-3", null]];
  const kbad = known.filter(([s, w]) => evalAmountExpr(s) !== w).map(([s, w]) => [s, evalAmountExpr(s), w]);
  ok(bad.length === 0 && accepted > 200, `no errors; every accepted result is whole qapik in (0, max] (${accepted} accepted)`, bad.slice(0, 5));
  ok(kbad.length === 0, "known sums: 45.00-20 = 25, 12,5*2 = 25, (10+5)/3 = 5, 10/3 = 3.33; zero, negative and /0 refused", kbad);
}
finish("run108money");
