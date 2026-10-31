// Builds the app icons from one drawing (Run 20). Run: node scripts/make-icons.mjs  (uses the installed Chrome via puppeteer-core)
// The old icons were a missing-character box on the retired black-and-cream palette. This draws a ledger page on the Caspian palette
// (#07151A background, #4CC9C4 accent) with the art inside the 80% "safe zone" so Android can mask it to any shape.
import fs from "fs"; import path from "path"; import puppeteer from "puppeteer-core";
const out = path.resolve("public");
const art = `<rect x="136" y="104" width="240" height="304" rx="36" fill="#0E2229" stroke="#4CC9C4" stroke-width="18"/>
  <path d="M180 190H332M180 246H332M180 302H262" stroke="#4CC9C4" stroke-opacity=".55" stroke-width="16" stroke-linecap="round"/>
  <circle cx="338" cy="334" r="36" fill="#4CC9C4"/><path d="M322 335l11 11 21-24" stroke="#07151A" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = (round) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${round ? 112 : 0}" fill="#07151A"/>${art}</svg>`;
fs.writeFileSync(path.join(out, "icon.svg"), svg(true));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const shot = async (name, size, round) => { const p = await browser.newPage(); await p.setViewport({ width: size, height: size });
  await p.setContent(`<body style="margin:0;background:transparent">${svg(round).replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  await p.screenshot({ path: path.join(out, name), omitBackground: true }); await p.close(); };
await shot("icon-192.png", 192, true); await shot("icon-512.png", 512, true);
await shot("icon-maskable-512.png", 512, false); await shot("apple-touch-icon.png", 180, false);
await browser.close(); console.log("icons written to", out);
