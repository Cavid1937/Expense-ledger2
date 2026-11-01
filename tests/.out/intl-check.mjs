import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const p = await b.newPage(); await p.goto("about:blank");
console.log("chrome", await p.evaluate(() => { const d=new Date(2026,9,13); return ["az-Latn-AZ","az","ru-RU","en-GB"].map(l => l+" | "+d.toLocaleDateString(l,{month:"long",year:"numeric"})+" | "+d.toLocaleDateString(l,{day:"numeric",month:"short"})+" | "+d.toLocaleDateString(l,{weekday:"short"})).join("\n"); }));
await b.close();
