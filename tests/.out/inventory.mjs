import fs from "fs";
const src = fs.readFileSync(process.argv[2], "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");
const hits = [];
lines.forEach((l, i) => {
  const n = i + 1;
  // JSX text nodes with letters
  for (const m of l.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) { const s = m[1].trim(); if (s && !/^[\w.-]+$/.test(s) || /\s/.test(s)) hits.push([n, "jsx", s]); else if (s) hits.push([n, "jsx", s]); }
  for (const m of l.matchAll(/(placeholder|aria-label|title|label)=["']([^"']*[A-Za-z][^"']*)["']/g)) hits.push([n, m[1], m[2]]);
  for (const m of l.matchAll(/(showToast|noteLoad|showSnackbar)\(\s*[`"]([^`"]+)/g)) hits.push([n, m[1], m[2]]);
  for (const m of l.matchAll(/\b(text|title|impact|reason|error|name|label|sub|msg):\s*[`"]([^`"]*[A-Za-z ][^`"]*)[`"]/g)) hits.push([n, "prop:" + m[1], m[2]]);
  for (const m of l.matchAll(/(problems|warnings)\.push\(\s*[`"]([^`"]+)/g)) hits.push([n, m[1], m[2]]);
});
const uniq = new Map(); hits.forEach(h => { if (!uniq.has(h[2])) uniq.set(h[2], h); });
const byRegion = {}; for (const [n] of uniq.values()) { const r = n < 1170 ? "logic(<1170)" : n < 1480 ? "css" : "ui(>=1480)"; byRegion[r] = (byRegion[r] || 0) + 1; }
console.log("raw hits:", hits.length, "unique strings:", uniq.size, JSON.stringify(byRegion));
fs.writeFileSync(process.argv[3], [...uniq.values()].map(h => h.join("\t")).join("\n"), "utf8");
