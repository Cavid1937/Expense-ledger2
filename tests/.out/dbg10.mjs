import { launch, openPage, tab, wait } from "../browser/lib.mjs";
const b = await launch(); const p = await openPage(b, { pre: `(() => { navigator.canShare = () => false; navigator.share = async () => {}; })();` });
await tab(p, "ImportExport"); await wait(300);
console.log(await p.evaluate(() => ({ share: !!document.querySelector(".io-share"), prim: [...document.querySelectorAll(".io-page .btn")].map((x) => x.className + " | " + x.innerText) })));
await b.close();

