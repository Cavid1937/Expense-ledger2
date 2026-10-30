// Prints exactly which source a run tests: path, size, SHA-256 and git blob id of the candidate App.jsx and the i18n.js
// beside it, plus the Node version. The git blob id is what `git ls-tree` shows, so it can be matched to a commit.
import crypto from "crypto"; import fs from "fs"; import path from "path";
const blob = (buf) => crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
export function identity(group, cand) {
  const lines = [`[run-${group}] node=${process.version}`];
  for (const f of [cand, path.join(path.dirname(cand), "i18n.js")]) {
    if (!fs.existsSync(f)) { lines.push(`[run-${group}] MISSING ${f}`); continue; }
    const b = fs.readFileSync(f);
    // With core.autocrlf=true the working file has CRLF while git stores LF; gitblob-lf is the id `git ls-tree` shows.
    const lf = Buffer.from(b.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
    lines.push(`[run-${group}] source ${f} bytes=${b.length} sha256=${sha(b)} gitblob=${blob(b)} gitblob-lf=${blob(lf)}`);
  }
  return lines.join("\n");
}
