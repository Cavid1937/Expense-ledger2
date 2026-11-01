// Bundles the candidate (expense-tracker.jsx) with React and the real fonts into a single offline page for browser tests.
import esbuild from "esbuild"; import fs from "fs"; import path from "path";
import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");               // /tmp/tools/t when run via run.sh
const tools = path.resolve(root, "..");              // /tmp/tools (node_modules lives here)
const cand = process.env.CANDIDATE || "/mnt/user-data/outputs/expense-tracker.jsx";
const out = path.join(tools, "page"); fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(cand, path.join(out, "App.jsx"));
fs.writeFileSync(path.join(out, "entry.jsx"), `import { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\ncreateRoot(document.getElementById("root")).render(<App/>);\n`);
await esbuild.build({ entryPoints: [path.join(out, "entry.jsx")], bundle: true, format: "iife", jsx: "automatic", loader: { ".jsx": "jsx" }, minify: true,
  define: { "process.env.NODE_ENV": '"production"' }, outfile: path.join(out, "app.js"), logLevel: "error", absWorkingDir: tools, nodePaths: [path.join(tools, "node_modules")] });
const face = (family, w, file) => `@font-face{font-family:'${family}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(tools, "node_modules/@fontsource", file)).toString("base64")}) format('woff2');}`;
let css = ""; for (const w of [400, 600, 700, 900]) css += face("Playfair Display", w, `playfair-display/files/playfair-display-latin-${w}-normal.woff2`);
for (const w of [300, 400, 500, 600, 700]) css += face("DM Sans", w, `dm-sans/files/dm-sans-latin-${w}-normal.woff2`);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>${css}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
console.log(`built ${path.basename(cand)} (${fs.statSync(path.join(out, "app.js")).size} bytes bundled) -> ${out}`);
