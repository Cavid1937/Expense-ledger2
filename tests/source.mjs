// Run 27: App.jsx is being split into App.jsx + screens/*.jsx. Tests that read the app's TEXT (key usage, hard-coded text, order checks)
// must see all of it. readSource(candidate) returns App.jsx followed by every screens/*.jsx beside it (import/export keywords removed
// so the pieces read as one file). With no screens folder it returns App.jsx unchanged, so older candidates still work.
import fs from "fs"; import path from "path";
export function readSource(cand) {
  let s = fs.readFileSync(cand, "utf8");
  const dir = path.join(path.dirname(cand), "screens");
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jsx")).sort())
    s += "\n" + fs.readFileSync(path.join(dir, f), "utf8").replace(/^import .*$/gm, "").replace(/^export (?=default |async |function|const|let|class)/gm, "");
  return s;
}
