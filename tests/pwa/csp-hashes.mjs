// Run 108 (CSP preparation, owner decisions 18 Nov): the security policy in vercel.json lists every inline <script> and <style> the app uses
// by its sha256 hash instead of allowing 'unsafe-inline'. A hash changes whenever that text changes (a styles.js edit, a launch-screen tweak),
// so this check recomputes them and fails when vercel.json is out of date. Run with --write to update vercel.json.
// Used by offline-check.mjs (runs before every push) and csp-check.mjs. Standalone: node tests/pwa/csp-hashes.mjs <built dist folder> [--write]
import fs from "fs"; import path from "path"; import crypto from "crypto"; import { fileURLToPath, pathToFileURL } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const h = (s) => "'sha256-" + crypto.createHash("sha256").update(s, "utf8").digest("base64") + "'";
const inline = (html, tag) => [...html.matchAll(new RegExp(`<${tag}(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1]).filter((s) => s.trim());

// Expected hashes: inline scripts and styles of the built index.html, plus the stylesheet App.jsx renders in a <style> tag (styles.js).
export async function expectedHashes(distDir) {
  const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  const { CSS } = await import(pathToFileURL(path.join(root, "styles.js")).href);
  return { script: inline(html, "script").map(h), style: [...inline(html, "style"), CSS].map(h) };
}

const directive = (csp, name) => (csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(name + " ")) || "").split(/\s+/).slice(1);
// The rule for every page except app-open.html (which has its own, so the Android app may frame it)
export const mainRule = (cfg) => cfg.headers.find((x) => x.source.startsWith("/(") && x.source.endsWith(".*)"));
const policyKey = (hdrs) => hdrs.find((x) => x.key === "Content-Security-Policy") || hdrs.find((x) => x.key === "Content-Security-Policy-Report-Only");

// Problems with vercel.json against the build: missing hashes, stale hashes, 'unsafe-inline'. Empty list = fine.
export async function checkHashes(distDir) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const csp = policyKey(mainRule(cfg).headers).value;
  const want = await expectedHashes(distDir), bad = [];
  for (const kind of ["script", "style"]) {
    const have = directive(csp, kind + "-src");
    for (const x of want[kind]) if (!have.includes(x)) bad.push(`${kind}-src is missing ${x}`);
    for (const x of have.filter((t) => t.startsWith("'sha256-"))) if (!want[kind].includes(x)) bad.push(`${kind}-src has a stale hash ${x}`);
    if (have.includes("'unsafe-inline'")) bad.push(`${kind}-src still allows 'unsafe-inline'`);
  }
  return { bad, want };
}

// Rewrites the hashes in vercel.json (keeps every other source in the two directives as it is).
export async function writeHashes(distDir) {
  const file = path.join(root, "vercel.json"), text = fs.readFileSync(file, "utf8"), cfg = JSON.parse(text);
  const entry = policyKey(mainRule(cfg).headers), want = await expectedHashes(distDir);
  entry.value = entry.value.split(";").map((d) => d.trim()).map((d) => {
    const [name, ...src] = d.split(/\s+/), kind = name.replace(/-src$/, "");
    if (!(kind in want) || !name.endsWith("-src")) return d;
    const keep = src.filter((t) => !t.startsWith("'sha256-") && t !== "'unsafe-inline'");
    return [name, keep[0], ...want[kind], ...keep.slice(1)].join(" ");
  }).join("; ");
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2).replace(/\{\s+"key": ("[^"]+"),\s+"value": ("(?:[^"\\]|\\.)*")\s+\}/g, '{ "key": $1, "value": $2 }') + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2]; if (!dist) { console.log("usage: node tests/pwa/csp-hashes.mjs <built dist folder> [--write]"); process.exit(2); }
  if (process.argv.includes("--write")) await writeHashes(dist);
  const { bad, want } = await checkHashes(dist);
  console.log(JSON.stringify(want, null, 1)); console.log(bad.length ? "FAIL\n" + bad.join("\n") : "csp-hashes OK"); process.exit(bad.length ? 1 : 0);
}
