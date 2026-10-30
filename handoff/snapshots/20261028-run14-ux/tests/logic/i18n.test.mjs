// Interface language (2026-10-26): catalog completeness, placeholders, plural forms, key usage, hard-coded leftovers,
// language preference storage, and that changing the language never changes data or calculations.
import { H, KEY, SRC, ok, section, eq, reset, setNow, T, finish } from "./lib.mjs";
import fs from "fs"; import path from "path";
const { t, tn, tIn, setLang, getLang, MESSAGES, LANGS, LANG_NAMES, CATEGORIES, migrateAndLoad, buildBackup, applyImport, planImport, calcSafeToSpend, calcPatterns, summariseReasons, catName, subName } = H;
const I18N_SRC = fs.readFileSync(path.join(path.dirname(process.env.CANDIDATE), "i18n.js"), "utf8");
const src = SRC.replace(/\r\n/g, "\n");
const keys = Object.keys(MESSAGES);

section("L1. Catalog completeness and form");
ok(eq(LANGS, ["az", "en", "ru"]) && LANG_NAMES.az === "Azərbaycan dili" && LANG_NAMES.en === "English" && LANG_NAMES.ru === "Русский", "three languages with native names: Azərbaycan dili, English, Русский");
const PLURAL = { en: ["one", "other"], az: ["one", "other"], ru: ["one", "few", "many", "other"] };
const forms = (v) => typeof v === "string" ? [v] : Object.values(v);
const missing = [], badPlural = [];
for (const k of keys) for (const l of LANGS) {
  const v = MESSAGES[k][l];
  if (v === undefined || (typeof v === "string" && !v.trim())) missing.push(`${k} [${l}]`);
  else if (typeof v === "object" && PLURAL[l].some((f) => typeof v[f] !== "string" || !v[f].trim())) badPlural.push(`${k} [${l}]`);
}
ok(missing.length === 0, `every one of ${keys.length} keys has az, en and ru text`, missing.slice(0, 20));
ok(badPlural.length === 0, "every plural entry has all forms its language needs (en/az: one, other · ru: one, few, many, other)", badPlural.slice(0, 20));
const ph = (s) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((x) => x !== "n"))].sort();
// Placeholders a language may leave out on purpose (documented): the month in "N days left" is implied in az/ru, and
// {payments}/{schedules} are English-only grammar words (az/ru phrase the count without them).
const OPTIONAL = { "safe.daysLeft": ["month"], "safe.noteSchedules": ["payments", "schedules"] };
const phBad = [];
for (const k of keys) {
  const ref = ph(forms(MESSAGES[k].en).join(" "));
  for (const l of ["az", "ru"]) {
    const got = ph(forms(MESSAGES[k][l]).join(" "));
    const extra = got.filter((x) => !ref.includes(x)), dropped = ref.filter((x) => !got.includes(x) && !(OPTIONAL[k] || []).includes(x));
    if (extra.length || dropped.length) phBad.push(`${k} [${l}] extra {${extra}} dropped {${dropped}}`);
  }
}
ok(phBad.length === 0, "the same {placeholders} appear in all three languages (no value silently dropped; 2 documented exceptions)", phBad.slice(0, 20));
const nBad = keys.filter((k) => !k.startsWith("unit.") && LANGS.some((l) => { const v = MESSAGES[k][l]; return typeof v === "object" && ["other", "few", "many"].some((f) => v[f] && !v[f].includes("{n}")); }));
ok(nBad.length === 0, "every plural form for counts other than one shows the number {n}", nBad);
const cyr = /[Ѐ-ӿ]/, latin = /[A-Za-zƏəĞğİıÖöŞşÜüÇç]/;
const ruNoCyr = keys.filter((k) => forms(MESSAGES[k].ru).some((s) => !cyr.test(s.replace(/\{\w+\}/g, "")) && latin.test(s.replace(/\{\w+\}/g, ""))));
const ruAllow = ["common.ok", "sub.Metro", "an.median"].filter((k) => keys.includes(k));
ok(ruNoCyr.filter((k) => !ruAllow.includes(k)).length === 0, "Russian text is written in Cyrillic (no English left in the ru column)", ruNoCyr);
ok(keys.every((k) => forms(MESSAGES[k].az).every((s) => !cyr.test(s))), "Azerbaijani text uses the Latin alphabet (no Cyrillic)");
const sameAsEn = keys.filter((k) => forms(MESSAGES[k].az).join("|") === forms(MESSAGES[k].en).join("|") && /[a-z]{3}/.test(forms(MESSAGES[k].en).join("")));
const azAllow = ["sub.Metro", "sub.Internet", "an.median", "sub.Visa"];
ok(sameAsEn.filter((k) => !azAllow.includes(k)).length === 0, "no Azerbaijani entry is just a copy of the English", sameAsEn);
ok(/[əğıİöşüç]/.test(Object.values(MESSAGES).map((e) => forms(e.az).join(" ")).join(" ")) && /[ƏəĞğIıİiÖöŞşÜüÇç]/.test(I18N_SRC), "Azerbaijani letters (ə ğ ı İ ö ş ü ç) are present and the file is UTF-8");

section("L2. t() / tn() behaviour");
setLang("ru");
ok(tn("toast.deleted", 1) === "1 операция удалена" && tn("toast.deleted", 2) === "2 операции удалены" && tn("toast.deleted", 5) === "5 операций удалено" && tn("toast.deleted", 21) === "21 операция удалена", "Russian plural forms: 1 / 2 / 5 / 21", [1, 2, 5, 21].map((n) => tn("toast.deleted", n)));
setLang("az"); ok(tn("toast.deleted", 3) === "3 əməliyyat silindi" && tn("toast.deleted", 1) === "Əməliyyat silindi", "Azerbaijani: noun stays singular after a number");
setLang("en"); ok(tn("toast.deleted", 1) === "Transaction deleted" && tn("toast.deleted", 2) === "2 transactions deleted", "English: one / other");
setLang("az"); ok(t("goals.savedOf", { saved: "5 ₼", target: "10 ₼" }) === "10 ₼ məbləğdən 5 ₼", "placeholders are filled in the language's own word order");
ok(t("safe.waitingExpected", { amount: "$&$1{amount}" }).includes("$&$1{amount}"), "values are inserted literally (no $-pattern or placeholder re-expansion)");
ok(t("no.such.key") === "no.such.key", "an unknown key shows the key itself (visible in review, never blank)");
setLang("xx"); ok(getLang() === "en", "an invalid language falls back to English");
setLang("ru"); ok(tIn("az", "lang.continue") === "Davam et" && getLang() === "ru", "tIn reads one language without switching the current one");
setLang("en");

section("L2b. Dates are written from the catalog (Chrome has no Azerbaijani date data: it showed \"2026 M10\")");
const { monthName, monthShort, fmtLongDate, calcGoalProgress } = H;
setLang("az"); ok(monthName("2026-10") === "Oktyabr 2026" && monthName("2026-06") === "İyun 2026" && monthShort("2026-09") === "sen" && fmtLongDate(new Date(2026, 9, 13)) === "13 oktyabr 2026", "Azerbaijani: Oktyabr 2026 · İyun 2026 (dotted capital İ) · sen · 13 oktyabr 2026", [monthName("2026-10"), monthName("2026-06"), monthShort("2026-09"), fmtLongDate(new Date(2026, 9, 13))]);
setLang("ru"); ok(monthName("2026-10") === "Октябрь 2026" && fmtLongDate(new Date(2026, 9, 13)) === "13 октября 2026 г." && monthShort("2026-02") === "февр.", "Russian: nominative month alone, genitive inside a date (13 октября 2026 г.)", [monthName("2026-10"), fmtLongDate(new Date(2026, 9, 13))]);
setLang("en"); ok(monthName("2026-10") === "October 2026" && monthShort("2026-10") === "Oct" && fmtLongDate(new Date(2026, 9, 13)) === "13 October 2026", "English output is unchanged from before (October 2026 · Oct · 13 October 2026)");
setNow(2026, 9, 13); setLang("az"); ok(/^Yanvar 2027$/.test(calcGoalProgress({ target: 300, saved: 0, monthlyTarget: 100 }, new Date(globalThis.__NOW)).estCompletion), "goal estimates use the same month names (Yanvar 2027)"); setLang("en");
const dateCalls = src.split("\n").filter((l) => /toLocaleDateString\(/.test(l) && !/^\s*\/\//.test(l));
ok(dateCalls.length === 1 && /const mn=.*"en-GB"/.test(dateCalls[0]), "no screen formats dates with the browser's locale data any more (the one remaining call is the Ledger search also accepting English month names)", dateCalls);

section("L3. Every key the app uses exists, and every key in the catalog is used");
// Keys passed straight to t()/tn()/tIn() must exist. Keys chosen by a condition (t(a ? "k1" : "k2")) count as used when
// their quoted name appears in App.jsx. A literal ending in "." is a prefix completed at run time (checked below).
const direct = [...src.matchAll(/\bt(?:n|In)?\(\s*(?:[a-z]+\s*,\s*)?"([\w.\- ]+)"/g)].map((m) => m[1]).filter((k) => !k.endsWith("."));
const usedMissing = direct.filter((k) => !MESSAGES[k]);
ok(usedMissing.length === 0, `all ${new Set(direct).size} keys passed directly to t()/tn()/tIn() exist in the catalog`, usedMissing);
const used = new Set(keys.filter((k) => src.includes(`"${k}"`)));
const quotedLike = [...src.matchAll(/"((?:ins|home|safe|goals|budgets|pace|import|csv|load|settings|add|set|help|month|rec|an|mp|ledger|lang|banner|toast|common|date|wc|detail|unit)\.[\w.\- ]+)"/g)].map((m) => m[1]).filter((k) => !k.endsWith("."));
ok(quotedLike.filter((k) => !MESSAGES[k]).length === 0, "every quoted key name in App.jsx (including ones picked by a condition) exists", quotedLike.filter((k) => !MESSAGES[k]));
const CAT_IDS = CATEGORIES.map((c) => c.id), SUBS = [...new Set(CATEGORIES.flatMap((c) => c.subs))];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], FREQ = ["weekly", "biweekly", "monthly", "yearly"];
const REASONS = ["not a transaction record", "missing date", "invalid date", "missing amount", "invalid amount", "negative amount", "zero amount", "amount too large", "unsupported type", "invalid recurrence", "more than 2 decimal places", "invalid active flag", "invalid recurrence flag"];
const dynamic = { "nav.": ["home", "ledger", "monthly", "goals", "more"], "cat.": CAT_IDS, "tile.": CAT_IDS, "sub.": SUBS, "dow.": DAYS, "dow.pl.": DAYS, "dow.cmp.": DAYS,
  "freq.": FREQ, "freqCap.": FREQ, "surplus.": ["Surplus", "Deficit", "Break-even"], "month.net.": ["Net surplus", "Net deficit", "Break-even"],
  "an.perDay.": ["null", "same", "weekend", "weekday"], "ledger.type.": ["all", "expense", "income"], "reason.": REASONS,
  "mon.": [...Array(12)].map((_, i) => String(i + 1)), "monGen.": [...Array(12)].map((_, i) => String(i + 1)), "monShort.": [...Array(12)].map((_, i) => String(i + 1)),
  "wdShort.": DAYS, "wdNarrow.": DAYS, "tpl.": ["t1", "t3", "t4", "t5"] };
const dynMissing = [];
for (const [p, vals] of Object.entries(dynamic)) { ok(src.includes(`"${p}"`) || src.includes(`"${p}"+`) || src.includes(`'${p}'`), `App.jsx builds keys with the prefix "${p}"`); for (const v of vals) if (!MESSAGES[p + v]) dynMissing.push(p + v); }
ok(dynMissing.length === 0, "every key built at run time (category, subcategory, weekday, frequency, reason …) exists", dynMissing);
const unused = keys.filter((k) => !used.has(k) && !Object.entries(dynamic).some(([p, vals]) => vals.some((v) => p + v === k)));
ok(unused.length === 0, "no unused keys in the catalog", unused);

section("L4. No hard-coded English text left in the interface");
// The UI part of App.jsx is compiled with esbuild (the bundler the app's build already uses) and the compiled element
// children and text attributes are inspected — a real parse, not a regex over JSX.
const { transformSync } = await import("esbuild");
const ui = src.slice(src.indexOf("// ROOT APP"));
const js = transformSync(ui, { loader: "jsx", jsx: "automatic" }).code;
const allowText = new Set(["Expense Ledger"]);                      // the product name is not translated
const unq = (body) => { try { return JSON.parse(`"${body.replace(/\\x([0-9a-fA-F]{2})/g, "\\u00$1")}"`); } catch { return body; } };   // esbuild may use \xNN escapes
const strLits = (s) => [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => unq(m[1]));
const childTexts = [];
for (const m of js.matchAll(/children:\s*"((?:[^"\\]|\\.)*)"/g)) childTexts.push(unq(m[1]));
// children: [ ... ] — collect only the string literals that are direct items of the array (depth 0), not the
// class names / props of nested elements inside it.
for (const m of js.matchAll(/children:\s*\[/g)) {
  let i = m.index + m[0].length, depth = 0; const found = [];
  while (i < js.length) {
    const c = js[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1; while (j < js.length && js[j] !== c) j += js[j] === "\\" ? 2 : 1;
      // a value compared in code (tab === "home") is not displayed text
      const compared = /[=!]==?\s*$/.test(js.slice(Math.max(0, i - 5), i)) || /^\s*[=!]==?/.test(js.slice(j + 1, j + 6));
      if (depth === 0 && c !== "`" && !compared) found.push(unq(js.slice(i + 1, j)));
      i = j + 1; continue;
    }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) { if (depth === 0) break; depth--; }
    i++;
  }
  // ["weekly", …].map(f => t("freqCap."+f)) is a list of codes turned into translated labels, not displayed text
  if (!/^\]\s*\.map\(/.test(js.slice(i, i + 8))) childTexts.push(...found);
}
const leftovers = childTexts.map((s) => s.trim()).filter((s) => /[A-Za-z]{2,}/.test(s) && !allowText.has(s));
ok(leftovers.length === 0, `no English text written directly into elements (${childTexts.length} text children inspected)`, [...new Set(leftovers)].slice(0, 25));
const attrs = [...js.matchAll(/(placeholder|"aria-label"|title|alt):\s*"([^"]*[A-Za-z]{2,}[^"]*)"/g)].map((m) => `${m[1]}="${m[2]}"`);
ok(attrs.length === 0, "no fixed English placeholder / aria-label / title / alt attributes", attrs);
const literalCalls = [...src.matchAll(/\b(showToast|showSnackbar|noteLoad|setErr|prompt)\(\s*["`]([^"`]*[A-Za-z]{2,}[^"`]*)["`]/g)].map((m) => `${m[1]}("${m[2]}")`);
ok(literalCalls.length === 0, "no fixed English text passed to toasts, snackbars, load notices, form errors or prompts", literalCalls);
const pushed = [...src.matchAll(/\b(problems|warnings|insights)\.push\(\s*["`][^"`]*/g), ...src.matchAll(/\b(text|title|impact|error):\s*["`][^"`]*[A-Za-z]{3}[^"`]*/g)].map((m) => m[0]);
ok(pushed.length === 0, "no fixed English sentences in validation problems, warnings, insights, helper cards or import errors", pushed);

section("L5. Language preference: stored with the existing settings, backward compatible");
reset(); let st = migrateAndLoad();
ok(st.language === null, "a genuinely fresh install (nothing stored) has no language yet → the chooser is shown");
reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [T({ id: 1 })], currency: "₼" }));
st = migrateAndLoad(); ok(st.language === "en" && getLang() === "en", "data saved by an earlier version (no language field) → English, no chooser (existing users are not sent through onboarding)");
for (const l of ["az", "ru", "en"]) { reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [], language: l })); st = migrateAndLoad(); ok(st.language === l && getLang() === l, `a saved "${l}" is restored and applied before anything is shown`); }
reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [], language: null }));
st = migrateAndLoad(); ok(st.language === null, "fresh install that was saved before a choice was made (language: null) → chooser shown again, not skipped");
reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [], language: "de" }));
st = migrateAndLoad(); ok(st.language === "en", "an unsupported stored value falls back to English");
reset(); localStorage.setItem("finance_os_v3", JSON.stringify({ transactions: [T({ id: 2 })] }));
st = migrateAndLoad(); ok(st.language === "en", "a user migrating from an older storage key is an existing user → English, no chooser");
reset(); localStorage.setItem(KEY, "{{{ corrupt"); st = migrateAndLoad(); ok(st.language === "en", "unreadable stored data (recovery copy kept) still counts as an existing user");
setLang("en");
const device = { transactions: [T({ id: 1 })], budgets: {}, templates: [], currency: "$", goals: [], safeToSpend: { savingsTarget: 0, enabled: false }, lastBackup: null, language: "ru" };
const file = buildBackup({ ...device, language: "az" });
ok(file.language === undefined, "a backup file does not carry the language (it is a preference of one device)");
for (const mode of ["merge", "replace"]) ok(applyImport(device, planImport(JSON.stringify(file), "b.json"), mode).language === "ru", `${mode} import keeps this device's language`);

section("L6. Changing the language never changes data or calculations");
reset(); setNow(2026, 9, 13);
const data = [T({ id: 1, type: "income", category: "salary", amount: 2000, date: "2026-10-02" }), T({ id: 2, amount: 50, date: "2026-10-05", subcategory: "Coffee" }), T({ id: 3, recurring: true, recurFreq: "monthly", merchant: "Rent", category: "housing", amount: 450, date: "2026-09-03" })];
const snap = JSON.stringify(data);
const results = LANGS.map((l) => { setLang(l); const r = calcSafeToSpend(data, { savingsTarget: 100 }, [], new Date(globalThis.__NOW)); return [r.remaining, r.curInc, r.curExp, r.futureCommitments, r.dailyAllowance]; });
ok(eq(results[0], results[1]) && eq(results[1], results[2]), "Safe to Spend figures are identical in all three languages", results);
ok(JSON.stringify(data) === snap, "the transactions themselves are untouched (ids, amounts, categories, English subcategory)");
const csvRows = "Date,Amount,Category\r\n2026-09-01,5,Food & Dining\r\n2026-09-02,6,Qida və restoranlar";
const plans = LANGS.map((l) => { setLang(l); const p = planImport(csvRows, "x.csv"); return p.transactions.map((x) => [x.amount, x.category]); });
ok(eq(plans[0], plans[1]) && eq(plans[1], plans[2]) && plans[0][0][1] === "food", "CSV import maps categories the same way whatever the interface language (English CSV names are the identifiers)", plans);
setLang("ru"); ok(catName("food") === "Еда и рестораны" && subName("Coffee") === "Кофе" && subName("my own sub") === "my own sub", "display names follow the language; a user's own subcategory is shown exactly as typed");
setLang("az"); ok(summariseReasons([{ reason: "negative amount" }, { reason: "negative amount" }]) === "mənfi məbləğ: 2", "skip reasons are shown in the interface language");
setLang("en"); ok(summariseReasons([{ reason: "negative amount" }]) === "1 negative amount", "…and unchanged in English");
const flat = Array.from({ length: 60 }, (_, i) => { const d = new Date(2026, 9, 13 - i); return T({ id: 100 + i, amount: [0, 6].includes(d.getDay()) ? 30 : 10, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }); });
const ins = LANGS.map((l) => { setLang(l); return calcPatterns(flat, "₼", new Date(globalThis.__NOW)).insights.map((x) => x.id); });
ok(eq(ins[0], ins[1]) && eq(ins[1], ins[2]) && ins[0].includes("weekend"), "the same insights are produced in every language (only the wording differs)", ins);
setLang("en");

finish("i18n");
