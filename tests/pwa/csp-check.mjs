// Run 107 (security order 17 Nov): the headers in vercel.json, with the Content Security Policy ENFORCED (live it ships as Report-Only first),
// must not block anything the app needs: opening, every tab, adding an entry, a PDF statement, CSV and backup exports, opening offline.
// Builds into a temp folder and serves it with a tiny local server that sends the vercel.json headers. Synthetic data only; downloads go to temp.
// Usage: node tests/pwa/csp-check.mjs
import http from "http"; import { spawnSync } from "child_process"; import fs from "fs"; import os from "os"; import path from "path"; import crypto from "crypto";
import { fileURLToPath } from "url"; import { launch, wait, ok, section, finish, KEY, openData } from "../browser/lib.mjs"; import { checkHashes, mainRule } from "./csp-hashes.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-csp-")), PORT = 4185, URL0 = `http://localhost:${PORT}/`;
const b = spawnSync(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js"), "build", "--outDir", out, "--emptyOutDir"], { cwd: root, encoding: "utf8" });
console.log(`build exit=${b.status} -> ${out}`); if (b.status !== 0) { console.log(b.stdout, b.stderr); process.exit(1); }

const cfg = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const hdrs = Object.fromEntries(mainRule(cfg).headers.map((h) => [h.key, h.value]));
// Run 108: app-open.html has its own rule. The Android app loads it in a hidden frame from https://localhost to count app starts; the
// site-wide "X-Frame-Options: DENY" (release 107) refused that frame, so app starts went uncounted from 17 Nov.
const aoRule = cfg.headers.find((h) => h.source === "/app-open.html"), aoHdrs = Object.fromEntries((aoRule ? aoRule.headers : []).map((h) => [h.key, h.value]));
const matches = (src, p) => new RegExp("^" + src + "$").test(p);
const csp = hdrs["Content-Security-Policy-Report-Only"] || hdrs["Content-Security-Policy"];

section("CSP-1. The policy itself");
{
  // The inline first-paint script is allowed by its hash only; the hash must match the BUILT page, or the theme colour would be blocked.
  const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
  const inl = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.trim());
  const hashes = inl.map((s) => "'sha256-" + crypto.createHash("sha256").update(s, "utf8").digest("base64") + "'");
  ok(inl.length === 1 && hashes.every((h) => csp.includes(h)), "every inline script in the built page is listed by its hash", { inline: inl.length, hashes });
  ok(!/unsafe-eval/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp), "scripts: no 'unsafe-eval' and no 'unsafe-inline'");
  // Run 108: styles too. The launch-screen <style> in index.html and the app's stylesheet (styles.js) are listed by hash; no 'unsafe-inline'.
  const { bad } = await checkHashes(out);
  ok(bad.length === 0 && !/style-src[^;]*unsafe-inline/.test(csp), "every inline script and style is listed by its current hash, no stale ones, no 'unsafe-inline' (fix: node tests/pwa/csp-hashes.mjs <dist> --write)", bad);
  const pub = ["privacy.html", "app-open.html"].map((f) => fs.readFileSync(path.join(out, f), "utf8"));
  ok(pub.every((t) => !/<style/i.test(t) && !/<script(?![^>]*\bsrc=)/i.test(t) && !/\sstyle=/i.test(t)), "privacy.html and app-open.html have no inline script or style");
  const src = mainRule(cfg).source, pathsIn = ["/", "/index.html", "/privacy.html", "/assets/index-x.js", "/sw.js", "/app-open.js", "/privacy.css"], pathsOut = ["/app-open.html"];
  ok(pathsIn.every((p) => matches(src, p)) && pathsOut.every((p) => !matches(src, p)), "the site-wide rule covers every page except app-open.html", src);
  const aoCsp = aoHdrs["Content-Security-Policy-Report-Only"] || aoHdrs["Content-Security-Policy"] || "";
  ok(!!aoRule && !("X-Frame-Options" in aoHdrs) && /frame-ancestors https:\/\/localhost(;|$)/.test(aoCsp) && aoHdrs["X-Content-Type-Options"] === "nosniff" && /script-src 'self'(;|$)/.test(aoCsp) && /default-src 'none'/.test(aoCsp),
    "app-open.html: only the Android app (https://localhost) may frame it; its own scripts only", aoHdrs);
  ok(/object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp), "plugins off, base address fixed, the app cannot be framed");
  ok(hdrs["X-Content-Type-Options"] === "nosniff" && hdrs["X-Frame-Options"] === "DENY" && /camera=\(\)/.test(hdrs["Permissions-Policy"] || ""), "the other headers are set");
  ok(!("Clear-Site-Data" in hdrs) && !/Cross-Origin-Opener-Policy/.test(JSON.stringify(cfg)), "no Clear-Site-Data (would wipe the ledger) and no COOP (would break the Google sign-in window)");
}

// Local server: static files + SPA fallback, every response carries the headers, the policy ENFORCED.
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain" };
const send = { ...hdrs }; delete send["Content-Security-Policy-Report-Only"]; send["Content-Security-Policy"] = csp;
const sendAo = { ...aoHdrs }; if (sendAo["Content-Security-Policy-Report-Only"]) { sendAo["Content-Security-Policy"] = sendAo["Content-Security-Policy-Report-Only"]; delete sendAo["Content-Security-Policy-Report-Only"]; }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, URL0).pathname); if (p.endsWith("/")) p += "index.html";
  if (p.startsWith("/_vercel/")) { res.writeHead(404, send); res.end(); return; }
  let f = path.join(out, p); if (!f.startsWith(out) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(out, "index.html");
  res.writeHead(200, { ...(p === "/app-open.html" ? sendAo : send), "Content-Type": types[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await launch();
const seed = { language: "en", currency: "₼", transactions: [1, 2, 3].map((i) => ({ id: i, type: i === 3 ? "income" : "expense", amount: i * 7.5, category: i === 3 ? "salary" : "food", subcategory: "", merchant: "Shop" + i, note: "", date: new Date().toISOString().slice(0, 10), recurring: false, recurFreq: null, isActive: true })), budgets: { food: 100 }, templates: [], goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) errors.push("console: " + m.text().slice(0, 300)); });
await page.evaluateOnNewDocument((k, s) => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); if (!localStorage.getItem(k)) localStorage.setItem(k, s); }, KEY, JSON.stringify(seed));
const viol = async () => (await page.evaluate(() => window.__csp || [])).concat(errors);
const click = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const tabBtn = (i) => page.evaluate((n) => { const t = document.querySelectorAll(".tab-btn")[n]; if (t) t.click(); return !!t; }, i);

section("CSP-2. The app with the policy enforced");
{
  await page.goto(URL0, { waitUntil: "load" }); const opened = await page.waitForSelector(".tabbar", { timeout: 10000 }).then(() => true).catch(() => false);
  const bg = await page.evaluate(() => document.documentElement.style.getPropertyValue("--bg"));
  ok(opened && /Shop1/.test(await page.evaluate(() => document.body.innerText)), "opens and shows the saved entries");
  ok(!!bg, "the first-paint theme script ran (allowed by its hash)", bg);
  // Control: an injected inline script must be blocked AND reported, which proves the policy is enforced and the watcher works
  const ctl = await page.evaluate(async () => { const s = document.createElement("script"); s.textContent = "window.__injected=1"; document.head.appendChild(s); await new Promise((r) => setTimeout(r, 100)); const r = { ran: window.__injected === 1, seen: window.__csp.length }; window.__csp.length = 0; return r; });
  errors.length = 0;
  ok(!ctl.ran && ctl.seen >= 1, "control: an injected inline script is blocked and reported", ctl);
  // Run 108: the same for an injected inline style, which proves styles are now held to their hashes; the app's own <style> applied
  const sty = await page.evaluate(async () => { const s = document.createElement("style"); s.textContent = "body{outline:7px solid red}"; document.head.appendChild(s); await new Promise((r) => setTimeout(r, 100)); const r = { applied: getComputedStyle(document.body).outlineWidth === "7px", seen: window.__csp.length, appCss: getComputedStyle(document.querySelector(".tabbar")).position }; window.__csp.length = 0; s.remove(); return r; });
  errors.length = 0;
  ok(!sty.applied && sty.seen >= 1 && sty.appCss === "fixed", "control: an injected inline style is blocked and reported, while the app's own stylesheet applies", sty);
  for (let i = 0; i < 5; i++) { await tabBtn(i); await wait(450); }
  ok((await viol()).length === 0, "every tab opened with nothing blocked", await viol());

  await page.goto(URL0 + "?add=expense&amount=5&merchant=Bravo&category=food", { waitUntil: "load" }); await page.waitForSelector(".tabbar"); await wait(800);
  ok((await viol()).length === 0, "the quick-add link opens with nothing blocked", await viol());

  // Data page: a one-page PDF statement goes through PDF.js in the page (the riskiest code for a policy without 'unsafe-eval')
  await page.goto(URL0, { waitUntil: "load" }); await page.waitForSelector(".tabbar");
  const io = await openData(page).then(() => true).catch(() => false);
  ok(io, "the data page opened");
  if (io) {
    const esc = (s) => s.replace(/[\\()]/g, (c) => "\\" + c);
    const stream = [[72, 760, "Account statement"], [72, 700, "2026-10-06 Coffee shop -4.50"], [72, 680, "2026-10-07 Salary +100.00"]].map(([x, y, s]) => `BT /F1 9 Tf ${x} ${y} Td (${esc(s)}) Tj ET`).join("\n");
    const objs = ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, "<< /Type /Page /Parent 4 0 R /MediaBox [0 0 595 842] /Contents 2 0 R /Resources << /Font << /F1 1 0 R >> >> >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Catalog /Pages 4 0 R >>"];
    let pdf = "%PDF-1.4\n"; const offs = []; objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const x = pdf.length; pdf += `xref\n0 6\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size 6 /Root 5 0 R >>\nstartxref\n${x}\n%%EOF\n`;
    const pf = path.join(out, "..", path.basename(out) + "-statement.pdf"); fs.writeFileSync(pf, Buffer.from(pdf, "latin1"));
    const input = await page.$(".io-page input[type=file]"); await input.uploadFile(pf);
    const read = await page.waitForSelector('[data-section="import-statement"], [aria-label="Restore backup"] [role="alert"], [aria-label="Restore backup"]', { timeout: 20000 }).then(() => true).catch(() => false);
    await wait(500); fs.rmSync(pf, { force: true });
    ok(read && (await viol()).length === 0, "a PDF statement was read by PDF.js with nothing blocked", await viol());
    await page.keyboard.press("Escape"); await wait(400);
    await page.evaluate(() => { const s = document.querySelector('[aria-label="Restore backup"]'); const c = s && [...s.querySelectorAll("button")].find((b) => /cancel|close/i.test(b.textContent + (b.getAttribute("aria-label") || ""))); if (c) c.click(); }); await wait(300);
    await click('[data-section="io-csv"]'); await wait(600);
    await click('[data-section="io-save"]'); await wait(800);
    await click('[data-section="io-xlsx"]'); await wait(300); await click('[data-section="io-xlsx-go"]'); await wait(800);
    ok((await viol()).length === 0, "CSV, backup and Excel exports ran with nothing blocked", await viol());
  }

  // Offline reopen still works with the policy (service worker and its cache are same-origin)
  const sw = await page.evaluate(async () => !!(await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))])));
  await wait(1200); await page.setOfflineMode(true); await page.reload({ waitUntil: "load" }).catch(() => {});
  const off = await page.waitForSelector(".tabbar", { timeout: 8000 }).then(() => true).catch(() => false); await page.setOfflineMode(false);
  ok(sw && off && (await viol()).length === 0, "reopened offline from the service worker with nothing blocked", { sw, off, v: await viol() });
}

section("CSP-3. The other pages on the site");
{
  // privacy.html (linked from Settings and the store listing) and app-open.html (the Android app's start counter). Only policy reports count
  // here: /_vercel/insights is not served locally, so its 404 is expected.
  const p2 = await browser.newPage();
  await p2.evaluateOnNewDocument(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
  await p2.goto(URL0 + "privacy.html", { waitUntil: "load" });
  const pr = await p2.evaluate(() => ({ v: window.__csp, bg: getComputedStyle(document.body).backgroundColor, max: getComputedStyle(document.querySelector("main")).maxWidth }));
  ok(pr.v.length === 0 && pr.max === "720px" && pr.bg !== "rgba(0, 0, 0, 0)", "privacy page styled from privacy.css with nothing blocked", pr);
  await p2.goto(URL0 + "app-open.html", { waitUntil: "load" }); await wait(300);
  const ao = await p2.evaluate(() => ({ v: window.__csp, va: typeof window.va }));
  ok(ao.v.length === 0 && ao.va === "function", "app-open page: the analytics queue is set up from app-open.js with nothing blocked", ao);
  await p2.close();
}
server.close(); fs.rmSync(out, { recursive: true, force: true });
await finish("csp-check", browser);
