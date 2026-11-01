// Azerbaijani localization audit (Run 7). Reads i18n.js (and App.jsx for usage), then writes:
//   <out>/az-review-sheet.csv  — every interface text RENDERED with example values (az · en · ru), one row per form, with an
//                                empty "Reviewer verdict" and "Suggested wording" column for a native Azerbaijani reviewer
//   <out>/az-audit-summary.txt — counts and the automatic findings below
// Automatic findings (they flag risks; they do not judge grammar — only a native speaker can):
//   A. Turkish spellings that differ from Azerbaijani ("ve", "için", "değil", "yok", "şimdi", …)
//   B. a value slotted in directly before a suffix-bearing word ("{month} ilə", "{name}-ın", "{x}da") — the ending would have
//      to agree with a value the text cannot see (the "sen ilə müqayisədə" problem)
//   C. short month names (monShort.*) passed into any t() call other than chart labels
// Usage: node tests/az-audit.mjs <i18n.js> <App.jsx> <outDir>        Exit 1 if A or C finds anything.
import fs from "fs"; import path from "path"; import { pathToFileURL } from "url";
const [i18nPath, appPath, outDir] = process.argv.slice(2);
if (!i18nPath || !appPath || !outDir) { console.error("usage: node tests/az-audit.mjs <i18n.js> <App.jsx> <outDir>"); process.exit(2); }
const tmp = path.join(outDir, "_i18n_audit_copy.mjs"); fs.mkdirSync(outDir, { recursive: true }); fs.copyFileSync(i18nPath, tmp);
const { MESSAGES, t, tn, setLang } = await import(pathToFileURL(tmp).href); fs.unlinkSync(tmp);
const app = fs.readFileSync(appPath, "utf8");
const forms = (v) => typeof v === "string" ? { "": v } : v;
const EX = { amount: "1,050.00 ₼", a: "560.35 ₼", b: "1,054.54 ₼", n: 3, d: 27, month: "oktyabr 2026", m: "oktyabr", y: 2026, date: "27 oktyabr 2026",
  name: "Netflix", merchant: "Bravo", names: "Bravo, Araz", category: "Ərzaq", pct: 47, days: 30, v: 9, why: " (2 yanlış tarix)", summary: "2 yanlış tarix",
  goals: "500.00 ₼", floor: "300.00 ₼", up: 2, un: 1, s: 3, payments: "ödəniş", schedules: "cədvəl", said: 10, has: 9, found: "date, amount", we: "30.00 ₼", wd: "10.00 ₼", count: 4 };
const fill = (s) => s.replace(/\{(\w+)\}/g, (m0, k) => (k in EX ? String(EX[k]) : m0));
const keys = Object.keys(MESSAGES).sort();
const csv = [["Key", "Form", "Azerbaijani (rendered)", "English (rendered)", "Russian (rendered)", "Placeholders", "Auto flags", "Reviewer verdict (OK / change)", "Suggested Azerbaijani wording", "Reviewer notes"]];
// Word boundaries that know Azerbaijani letters (JavaScript's \b only knows A–Z, so it never matches next to ə, ş, ğ …).
const W = (s, flags = "iu") => new RegExp(`(?<!\\p{L})${s}(?!\\p{L})`, flags);
const TURKISH = ["ve", "için", "değil", "yok", "şimdi", "hesap", "gider", "kaydet\\p{L}*", "ayarlar", "tamam", "harcama\\p{L}*", "gelir", "bütçe"].map((w) => W(w));
const SUFFIX_AFTER_PLACEHOLDER = new RegExp(`\\{(month|name|merchant|category|names|date|m)\\}(?:\\s*(?:ilə|ilən)(?!\\p{L})|-?(?:ın|in|un|ün|nın|nin|nun|nün|da|də|dan|dən|a|ə|ya|yə|ı|i|u|ü)(?!\\p{L}))`, "u");
const A = [], B = [];
let formCount = 0;
for (const k of keys) {
  const az = forms(MESSAGES[k].az), en = forms(MESSAGES[k].en), ru = forms(MESSAGES[k].ru);
  const fs_ = [...new Set([...Object.keys(az), ...Object.keys(en)])];
  for (const f of fs_) {
    formCount++;
    const azS = az[f] ?? az.other ?? Object.values(az)[0], enS = en[f] ?? en.other ?? Object.values(en)[0], ruS = ru[f] ?? ru.other ?? Object.values(ru)[0];
    const flags = [];
    if (TURKISH.some((re) => re.test(azS))) { flags.push("A: Turkish spelling?"); A.push(`${k}${f ? "." + f : ""}: ${azS}`); }
    if (SUFFIX_AFTER_PLACEHOLDER.test(azS)) { flags.push("B: suffix after a slotted value"); B.push(`${k}${f ? "." + f : ""}: ${azS}`); }
    csv.push([k, f || "—", fill(azS), fill(enS), fill(ruS), [...new Set((azS.match(/\{\w+\}/g) || []))].join(" "), flags.join("; "), "", "", ""]);
  }
}
// C. short month names inside sentences: monthShort(…) may only feed chart/bar labels
// (also the conditional form t(cond ? "a" : "b", { … monthShort(…) }))
const C = [...app.matchAll(/\bt\(\s*([^,]*?"[^"]+"[^,]*?)\s*,\s*\{[^}]*monthShort\(/g)].map((m0) => [...m0[1].matchAll(/"([^"]+)"/g)].map((q) => q[1]).join(" / "));
const esc = (v) => /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
fs.writeFileSync(path.join(outDir, "az-review-sheet.csv"), "﻿" + csv.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n", "utf8");
const usedKeys = new Set([...app.matchAll(/\bt[nI]?n?\(\s*"([^"]+)"/g)].map((m0) => m0[1]));
const summary = [
  `Azerbaijani localization audit — ${new Date().toISOString()}`,
  `Catalog: ${keys.length} keys, ${formCount} rendered forms (plural forms counted separately). Keys passed directly to t()/tn() in App.jsx: ${usedKeys.size}.`,
  `Review sheet: az-review-sheet.csv (UTF-8, opens in Excel/Sheets) — one row per form, example values filled in, empty reviewer columns.`,
  ``,
  `A. Turkish spellings in Azerbaijani text: ${A.length}`, ...A.map((x) => "   " + x),
  `B. A value slotted in directly before a suffix-bearing word (ending cannot agree with the value): ${B.length}`, ...B.map((x) => "   " + x),
  `C. Short month names passed into sentences: ${C.length}`, ...C.map((x) => "   " + x),
  ``,
  `Not checked automatically (needs the native reviewer): grammar and word order of complete sentences, natural financial terms,`,
  `tone, punctuation, and whether each sentence reads well with real values. Nothing here marks the wording as reviewed.`,
];
fs.writeFileSync(path.join(outDir, "az-audit-summary.txt"), summary.join("\r\n") + "\r\n", "utf8");
console.log(summary.join("\n"));
process.exit(A.length || C.length ? 1 : 0);
