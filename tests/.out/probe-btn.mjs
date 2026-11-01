import { launch, openPage, baseSeed, wait } from "../browser/lib.mjs";
const b = await launch(); const p = await openPage(b, { seed: { ...baseSeed(), language: "az" }, chooseLang: "az" });
await p.evaluate(() => document.querySelectorAll(".tab-btn")[3].click()); await wait(800);
console.log(await p.evaluate(() => [...document.querySelectorAll(".goals-page .btn-sm")].slice(0, 6).map((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return `${e.textContent.trim()} ${Math.round(r.width)}x${Math.round(r.height)} minH=${cs.minHeight} h=${cs.height} disp=${cs.display}`; })));
await b.close();

