// Bundles the candidate (expense-tracker.jsx) with React and the real fonts into a single offline page for browser tests.
import esbuild from "esbuild"; import fs from "fs"; import path from "path";
import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");               // /tmp/tools/t when run via run.sh
const tools = path.resolve(root, "..");              // /tmp/tools (node_modules lives here)
// No default: an unset CANDIDATE used to fall back to an old expense-tracker.jsx path, which could test a stale copy.
const cand = process.env.CANDIDATE;
if (!cand || !fs.existsSync(cand)) { console.error(`build: CANDIDATE must name the App.jsx to test (got ${JSON.stringify(cand)})`); process.exit(2); }
// PAGE_OUT (optional) builds into another folder, so a second build cannot replace the page a running suite is using.
const out = process.env.PAGE_OUT ? path.resolve(process.env.PAGE_OUT) : path.join(tools, "page"); fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(cand, path.join(out, "App.jsx"));
// Windows adaptation: the interface text lives in i18n.js next to the candidate (copied, never written).
const i18nSrc = path.join(path.dirname(cand), "i18n.js"); if (fs.existsSync(i18nSrc)) fs.copyFileSync(i18nSrc, path.join(out, "i18n.js"));
fs.writeFileSync(path.join(out, "entry.jsx"), `import { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\ncreateRoot(document.getElementById("root")).render(<App/>);\n`);
await esbuild.build({ entryPoints: [path.join(out, "entry.jsx")], bundle: true, format: "iife", jsx: "automatic", loader: { ".jsx": "jsx" }, minify: true,
  define: { "process.env.NODE_ENV": '"production"' }, outfile: path.join(out, "app.js"), logLevel: "error", absWorkingDir: tools, nodePaths: [path.join(tools, "node_modules")] });
// Every subset the font package ships (latin, latin-ext for ə ğ ş …, cyrillic where the font has it), each with its
// unicode-range, as Google Fonts serves them in production. A font without a subset (DM Sans has no Cyrillic) falls back
// exactly as it would in production. Built from the package's own CSS so the ranges are not hand-copied.
const pkgCss = (pkg, w) => fs.readFileSync(path.join(tools, "node_modules/@fontsource", pkg, `${w}.css`), "utf8")
  .replace(/url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\),?\s*url\(\.\/files\/[^)]+\.woff\) format\('woff'\)/g,
    (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(tools, "node_modules/@fontsource", pkg, "files", f)).toString("base64")}) format('woff2')`);
let css = ""; for (const w of [400, 600, 700, 900]) css += pkgCss("playfair-display", w);
for (const w of [300, 400, 500, 600, 700]) css += pkgCss("dm-sans", w);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>${css}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
console.log(`built ${path.basename(cand)} (${fs.statSync(path.join(out, "app.js")).size} bytes bundled) -> ${out}`);
