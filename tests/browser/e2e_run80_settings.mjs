// Run 80 in the real bundled app (owner, 14 Nov): Settings was "scattered, uncoordinated" and the widget card was always open.
// Privacy and widgets are now folds that start closed; Import / Export puts "Bring data in" first; the first launch offers a bank statement
// instead of typing balances. Synthetic data only.
import { launch, openPage, ok, section, finish, baseSeed, tx, wait, KEY } from "./lib.mjs";
const browser = await launch();
const SHELL = `window.LedgerNative = { widget: { canPin: () => Promise.resolve(true), requestPin: () => Promise.resolve(true), set: () => Promise.resolve(true), update: () => Promise.resolve(true) } };`;
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const has = async (page, sel) => !!(await page.$(sel));
// Settings WITHOUT the helper that opens every fold: what a person sees first
const goSettings = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(500); };

section("R80-S1. Settings opens tidy: widgets and privacy are closed rows with a one-line summary");
let page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }), pre: SHELL });
await goSettings(page);
ok(await has(page, '[data-fold-head="widgets"]') && await has(page, '[data-fold-head="privacy"]'), "Widgets and Privacy are rows like the other sections");
ok(!(await has(page, '[data-section="widget-show"]')) && !(await has(page, '[data-section="learn-toggle"]')), "their switches are not spread over the page until opened");
const subs = await page.evaluate(() => [document.querySelector('[data-fold-sub="widgets"]')?.innerText, document.querySelector('[data-fold-sub="privacy"]')?.innerText]);
ok(subs[0] === "Amounts shown on widgets" && subs[1] === "Nothing is shared", "closed, each says where things stand", subs);
const order = await page.evaluate(() => [...document.querySelectorAll(".more-page [data-fold], .more-page [data-section='more-data'], .more-page [data-section='more-app']")].map((e) => e.getAttribute("data-fold") || e.getAttribute("data-section")));
ok(await page.evaluate(() => [...document.querySelectorAll(".more-page .list-title")].filter((e) => e.innerText.trim() === "Privacy").length === 1), "only one item on the page is called Privacy");
await click(page, '[data-fold-head="privacy"]'); await wait(500);
ok(await has(page, '[data-more="privacy"]') && await has(page, '[data-section="learn-toggle"]'), "opened, Privacy holds the privacy notice and the sharing switch");
await click(page, '[data-fold-head="privacy"]'); await wait(400);
ok(order.indexOf("more-data") < order.indexOf("privacy") && order.indexOf("privacy") < order.indexOf("widgets") && order.indexOf("widgets") < order.indexOf("more-app"), "privacy and widgets sit in the Data and safety group, before the App group", order);
await click(page, '[data-fold-head="widgets"]'); await wait(500);
ok(await has(page, '[data-section="widget-add-safe"]') && await has(page, '[data-section="widget-hide"]'), "one tap opens the widget section with its Add buttons and switches");
await click(page, '[data-section="widget-hide"]'); await wait(300);
await click(page, '[data-fold-head="widgets"]'); await wait(500);
ok((await page.evaluate(() => document.querySelector('[data-fold-sub="widgets"]')?.innerText)) === "Amounts hidden on widgets", "closing it again shows the new state in the summary");
ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal scroll");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R80-S2. Import / Export: bringing data in (bank statements) comes first");
page = await openPage(browser, { seed: baseSeed({ language: "az", transactions: [tx({ amount: 5 })] }) });
await goSettings(page);
ok(/Bank çıxarışları/.test(await page.evaluate(() => document.querySelector('[data-more="io"]').innerText)), "az: the Import / Export row names bank statements first");
await click(page, '[data-more="io"]'); await page.waitForSelector(".io-page"); await wait(400);
const first = await page.evaluate(() => { const p = document.querySelector(".io-page"); const imp = p.querySelector('[data-section="io-import"]'), bak = p.querySelector('[data-section="io-backup-card"]'); return !!imp && !!bak && !!(imp.compareDocumentPosition(bak) & Node.DOCUMENT_POSITION_FOLLOWING); });
ok(first, "the import card is above the backup card");
ok(await has(page, '.io-page input[type="file"]'), "the file picker is still there");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R80-S3. First launch: a bank statement instead of typing balances");
page = await openPage(browser, { fresh: true, seed: null, chooseLang: false });
await click(page, '.lang-opt input[value="en"]'); await click(page, ".lang-continue"); await page.waitForSelector('[data-ob="guest"]', { timeout: 4000 }); await wait(450);
await click(page, '[data-ob="guest"]'); await page.waitForSelector('[data-section="setupq-statement"]', { timeout: 4000 }); await wait(400);
ok(/ABB and Unibank/.test(await page.evaluate(() => document.querySelector('[data-section="setupq-statement"]').innerText)), "the first question offers a bank statement and says which banks are read");
// Run 83 (owner, 14 Nov): choosing the statement no longer jumps away and skips the other questions. It is marked as an answer,
// the questions go on, and the end shows a short guide with "Bring it in now" / "Later".
await click(page, '[data-section="setupq-statement"]'); await wait(250);
ok(await page.evaluate(() => document.querySelector('[data-section="setupq-statement"]').getAttribute("aria-pressed") === "true") && await has(page, '[data-section="onboarding"]'), "choosing the statement marks it and stays on the questions");
for (let i = 0; i < 3; i++) { await click(page, '[data-section="setupq-next"]'); await wait(420); }
await click(page, '[data-debts="yes"]'); await wait(150);
await click(page, '[data-section="setupq-save"]'); await wait(500);
ok(await has(page, '[data-section="setupq-guide-stmt"]') && await has(page, '[data-section="setupq-guide-debts"]') && await has(page, '[data-section="onboarding"]'), "the end shows a guide for the statement and for the loan, still inside the first launch");
const fc = await page.evaluate((k) => JSON.parse(localStorage.getItem(k + "__first_choices") || "null"), KEY);
ok(fc && fc.stmt === true && fc.debts === true, "the first answers are remembered on this phone", fc);
await click(page, '[data-section="setupq-stmt-now"]');
await page.waitForSelector(".io-page", { timeout: 4000 }); await wait(700);
ok(!(await has(page, '[data-section="onboarding"]')) && await has(page, '[data-section="io-import"]'), "'Bring it in now': the first launch ends and Import / Export opens with the import card");
ok((await page.evaluate((k) => localStorage.getItem(k + "__onboard"), KEY)) === "done", "the first launch is recorded as finished (it does not come back)");
const fc2 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k + "__first_choices") || "null"), KEY);
ok(fc2 && fc2.stmtState === "now" && fc2.debtsState === "later", "the statement is marked done now, the loan as 'later'", fc2);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R83-N1. The next day Home reminds once about the loan; 'Not needed' ends it");
page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }), pre: `localStorage.setItem("${KEY}__first_choices", JSON.stringify({ stmt: true, debts: true, stmtState: "now", debtsState: "later", laterAt: Date.now() - 25 * 3600 * 1000 }));` });
await wait(500);
ok(await page.evaluate(() => document.querySelector('[data-section="home-first-nudge"]')?.dataset.kind) === "debts", "Home shows the loan reminder a day later");
await click(page, '[data-section="nudge-dismiss"]'); await wait(700);
ok(!(await has(page, '[data-section="home-first-nudge"]')), "'Not needed' removes it");
ok((await page.evaluate((k) => JSON.parse(localStorage.getItem(k + "__first_choices")).debtsState, KEY)) === "dismissed", "and it is remembered, so it does not come back");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }), pre: `localStorage.setItem("${KEY}__first_choices", JSON.stringify({ stmt: true, stmtState: "later", laterAt: Date.now() - 3600 * 1000 }));` });
await wait(500);
ok(!(await has(page, '[data-section="home-first-nudge"]')), "not on the same day as 'Later'");
await page.close();
await browser.close();
finish("e2e_run80_settings");
