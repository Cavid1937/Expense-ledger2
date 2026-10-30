// Builds one self-contained test package: every file needed to rerun the suites (tests/ without the disposable .out and the
// evidence logs), package.json and package-lock.json, plus MANIFEST.sha256 listing the SHA-256 of each file.
// Usage: node tests/make-package.mjs <outDir>            — write the package
//        node tests/make-package.mjs --verify <dir>      — check every file in <dir> against its MANIFEST.sha256 (exit 1 on any mismatch)
import crypto from "crypto"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const walk = (dir, rel = "") => fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
  const r = path.posix.join(rel, e.name);
  return e.isDirectory() ? walk(dir, r) : [r];
});

if (process.argv[2] === "--verify") {
  const dir = path.resolve(process.argv[3]);
  const lines = fs.readFileSync(path.join(dir, "MANIFEST.sha256"), "utf8").trim().split("\n");
  const listed = new Set(); let bad = 0;
  for (const l of lines) {
    const [h, f] = [l.slice(0, 64), l.slice(66)]; listed.add(f);
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) { console.log(`MISSING  ${f}`); bad++; } else if (sha(p) !== h) { console.log(`CHANGED  ${f}`); bad++; }
  }
  const extra = walk(dir).filter((f) => f !== "MANIFEST.sha256" && !listed.has(f));
  for (const f of extra) { console.log(`UNLISTED ${f}`); bad++; }
  console.log(`verify: ${lines.length} files listed, ${bad} problems`);
  process.exit(bad ? 1 : 0);
}

const out = path.resolve(process.argv[2] || "");
if (!process.argv[2] || fs.existsSync(out)) { console.error("usage: node tests/make-package.mjs <new outDir>  (the folder must not exist yet)"); process.exit(2); }
const files = [
  ...walk(path.join(root, "tests")).filter((f) => !/^(\.out|evidence)\//.test(f)).map((f) => "tests/" + f),
  "package.json", "package-lock.json",
].sort();
for (const f of files) { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.copyFileSync(path.join(root, f), path.join(out, f)); }
fs.writeFileSync(path.join(out, "MANIFEST.sha256"), files.map((f) => `${sha(path.join(out, f))}  ${f}`).join("\n") + "\n");
console.log(`package: ${files.length} files -> ${out}`);
