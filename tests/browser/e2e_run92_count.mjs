// Run 92 in the real bundled app: the anonymous daily user count. The switch lives in Settings -> Privacy, starts on,
// turning it off is remembered and forgets this month's random id, and the test page never sends the count. Synthetic data only.
import { launch, openPage, ok, section, finish, baseSeed, tx, wait, KEY } from "./lib.mjs";
const browser = await launch();
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const pref = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k + "__count") || "null"), KEY);

section("R92-C1. Settings -> Privacy: 'Count me as a user' starts on and can be turned off");
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }) });
const sent = [];
page.on("request", (r) => { if (/active_days/.test(r.url())) sent.push(r.url()); });
await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(500);
await click(page, '[data-fold-head="privacy"]'); await wait(500);
const sw = '[data-section="count-toggle"]';
ok(!!(await page.$(sw)), "the switch is inside Privacy");
ok((await page.evaluate((s) => document.querySelector(s).getAttribute("aria-checked"), sw)) === "true", "it starts on");
ok(/Count me as a user/.test(await page.evaluate(() => document.querySelector('[data-section="count"]').innerText)), "it is called 'Count me as a user'");
await click(page, sw); await wait(400);
const off = await pref(page);
ok((await page.evaluate((s) => document.querySelector(s).getAttribute("aria-checked"), sw)) === "false" && off && off.off === true && off.id === "", "off: remembered, and this month's id is forgotten", off);
await click(page, '[data-fold-head="privacy"]'); await wait(500);
ok((await page.evaluate(() => document.querySelector('[data-fold-sub="privacy"]')?.innerText)) === "App usage sharing is off", "closed, Privacy now says sharing is off");
await click(page, '[data-fold-head="privacy"]'); await wait(500);
await click(page, sw); await wait(400);
ok((await pref(page)).off === false, "on again: remembered");
ok(sent.length === 0, "the test page (file:, automated browser) never sends the count", sent);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
await browser.close();
finish("e2e_run92_count");
