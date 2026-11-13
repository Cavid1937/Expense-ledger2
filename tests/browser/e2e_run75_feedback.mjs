// Run 75 in the real bundled app: "Report a problem or write to us". The network is a stand-in that records what would be sent.
import { launch, openPage, openSettings, ok, section, finish, baseSeed, tx, wait, toast } from "./lib.mjs";
const browser = await launch();
const SPY = `{ window.__fb = []; const f = window.fetch; window.fetch = function (u, o) { if (/feedback_reports/.test(String(u))) { window.__fb.push(String((o && o.body) || "")); return Promise.resolve(new Response("", { status: 201 })); } return f.apply(this, arguments); }; }`;
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "ZzqSecretShop", amount: 77.77 })] }), pre: SPY });
await openSettings(page); await wait(300);

section("R75-FB1. The row and the form");
ok(!!(await page.$('.more-page [data-more="feedback"]')), "Settings has 'Report a problem or write to us'");
await page.evaluate(() => document.querySelector('.more-page [data-more="feedback"]').click()); await page.waitForSelector('[data-section="fb-sheet"]'); await wait(300);
const txt = await page.evaluate(() => document.querySelector('[data-section="fb-sheet"]').innerText);
ok(/do not write card numbers/.test(txt) && /Only if you want an answer/.test(txt) && /Never your entries/.test(txt), "the form says what not to write, that contact is optional, and what the technical details are", txt.slice(0, 300));
ok(await page.evaluate(() => document.querySelector('[data-section="fb-send"]').disabled), "Send is off until something is written");

section("R75-FB2. Sending");
await page.type("#fb-msg", "Saving froze. My card 4169 7388 1234 5678"); await wait(100);
await page.evaluate(() => document.querySelector('[data-section="fb-send"]').click()); await wait(600);
const sent = await page.evaluate(() => window.__fb.map((b) => JSON.parse(b)));
ok(sent.length === 1 && /Saving froze\. My card …/.test(sent[0].message) && !/4169/.test(JSON.stringify(sent[0])), "one message is sent, with the card number hidden", sent[0]);
ok(!/ZzqSecretShop|77\.77/.test(JSON.stringify(sent[0])) && /"v":/.test(sent[0].details || ""), "nothing from the ledger is in it; the technical details are only version, screen size and the last error", sent[0] && sent[0].details);
ok(/Thank you/.test(await toast(page, 50)) && !(await page.$('[data-section="fb-sheet"]')), "a thank-you notice, and the form closes");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await browser.close();
finish("e2e_run75_feedback");
