// Run 83 (owner, 14 Nov): long help paragraphs became small info buttons. The explanation opens under the heading and closes by the
// button, Escape or a tap elsewhere. Synthetic data only.
import { launch, openPage, openAdd, ok, section, finish, baseSeed, tx, wait } from "./lib.mjs";
const browser = await launch();
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const has = async (page, sel) => !!(await page.$(sel));

section("R83-T1. Settings: Hours of work is a heading with an info button, not a paragraph");
let page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 5 })] }) });
await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(400);
// open every fold so the tips are on the page
await page.evaluate(() => document.querySelectorAll("[data-fold-head]").forEach((h) => { if (h.getAttribute("aria-expanded") === "false") h.click(); })); await wait(600);
ok(await has(page, '[data-tip-btn="work"]') && await has(page, '[data-tip-btn="quick"]') && await has(page, '[data-tip-btn="acc"]'), "Hours of work, quick-add link and accounts have an info button");
ok(!/based on your recorded income/.test(await page.evaluate(() => document.querySelector(".more-page").innerText)), "the long text is not shown until asked");
ok((await page.evaluate(() => document.querySelector('[data-tip-btn="work"]').getAttribute("aria-label"))) === "More about this", "the button has a spoken name");
await click(page, '[data-tip-btn="work"]'); await wait(450);
ok((await page.evaluate(() => document.querySelector('[data-tip-btn="work"]').getAttribute("aria-expanded"))) === "true" && /based on your recorded income/.test(await page.evaluate(() => document.querySelector('[data-tip-pop="work"]')?.innerText || "")), "one tap shows the explanation");
await page.keyboard.press("Escape"); await wait(450);
ok((await page.evaluate(() => document.querySelector('[data-tip-btn="work"]').getAttribute("aria-expanded"))) === "false", "Escape closes it");
await click(page, '[data-tip-btn="quick"]'); await wait(400);
await page.mouse.click(5, 5); await wait(450);
ok((await page.evaluate(() => document.querySelector('[data-tip-btn="quick"]').getAttribute("aria-expanded"))) === "false", "a tap elsewhere closes it");
ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal scroll");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R83-T2. Add form: spread and pay-back explanations are behind info buttons (az)");
page = await openPage(browser, { seed: baseSeed({ language: "az", transactions: [] }) });
await openAdd(page); await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(450);
ok(await has(page, '[data-tip-btn="spread"]') && await has(page, '[data-tip-btn="reimb"]'), "both have an info button");
ok((await page.evaluate(() => document.querySelector('[data-tip-btn="spread"]').getAttribute("aria-label"))) === "Ətraflı", "az spoken name");
await click(page, '[data-tip-btn="reimb"]'); await wait(450);
ok(/Dostlar/.test(await page.evaluate(() => document.querySelector('[data-tip-pop="reimb"]')?.innerText || "")), "the pay-back explanation opens in Azerbaijani");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
await browser.close();
finish("e2e_run83_tips");
