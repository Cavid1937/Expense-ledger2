// Run 79 in the real bundled app: the back swipe that follows the thumb (owner, 14 Nov: "swipe back"). On Android 14+ the shell reports the
// swipe to window.__ledgerBackGesture (MainActivity.java); here the shell's calls are made by hand, in the same order the shell makes them.
// The layer Back would close follows the swipe, settles back when the swipe is cancelled, and closes through the normal Back when let go.
import { launch, openPage, ok, section, finish, baseSeed, tx, wait, openAdd } from "./lib.mjs";
const browser = await launch();
const g = (page, phase, p, edge) => page.evaluate((a) => window.__ledgerBackGesture(a[0], a[1], a[2]), [phase, p, edge]);
const style = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? { scale: el.style.scale, translate: el.style.translate, radius: el.style.borderRadius } : null; }, sel);
const back = (page) => page.evaluate(() => { window.__ledgerBackGesture("commit", 1, 0); return window.__ledgerNativeBack(); });

section("R79-B1. Home with nothing open: nothing moves (Back there only warns)");
const page = await openPage(browser, { seed: baseSeed({ transactions: [tx({ amount: 5 })] }) });
ok((await page.evaluate(() => typeof window.__ledgerBackGesture)) === "function", "the page offers the gesture hook to the Android app");
ok((await g(page, "start", 0, 0)) === "ok" && (await g(page, "move", 0.6, 0)) === "none", "on Home nothing is picked to follow the thumb");
await g(page, "cancel", 0, 0);

section("R79-B2. A sub-page follows the swipe and settles back when the swipe is cancelled");
await page.evaluate(() => [...document.querySelectorAll(".tab-btn")][1].click()); await wait(500);
await g(page, "start", 0, 0); await g(page, "move", 0.5, 0);
const s1 = await style(page, "main.page");
ok(s1 && Number(s1.scale) < 1 && Number(s1.scale) > 0.9 && /^\d+px/.test(s1.translate) && parseInt(s1.translate) > 0 && parseInt(s1.radius) > 0, "half way from the left edge: the page is a little smaller, moved right, with rounded corners", s1);
await g(page, "move", 1, 0);
const s2 = await style(page, "main.page");
ok(Math.abs(Number(s2.scale) - 0.92) < 0.001 && parseInt(s2.translate) === 24, "at the end of the swipe: 92 % and 24 px, never more", s2);
await g(page, "cancel", 0, 0); await wait(400);
const s3 = await style(page, "main.page");
ok(s3.scale === "" && s3.translate === "" && s3.radius === "", "cancelled: the page settles back to normal", s3);
ok(await page.evaluate(() => [...document.querySelectorAll(".tab-btn")][1].getAttribute("aria-current") === "page"), "and nothing happened: still on the same page");

section("R79-B3. Let go on a sub-page: Back returns Home");
await g(page, "start", 0, 1); await g(page, "move", 0.7, 1);
const s4 = await style(page, "main.page");
ok(parseInt(s4.translate) < 0, "a swipe from the right edge moves the page to the left", s4);
ok((await back(page)) === "handled", "let go: the normal Back runs");
await wait(700);
ok(await page.evaluate(() => [...document.querySelectorAll(".tab-btn")][0].getAttribute("aria-current") === "page"), "Home is shown");
const s5 = await style(page, "main.page");
ok(s5.scale === "" && s5.translate === "", "the new page is not left shrunk", s5);

section("R79-B4. The add form follows the swipe and closes when let go");
await openAdd(page);
await g(page, "start", 0, 0); await g(page, "move", 0.4, 0);
const s6 = await style(page, ".add-overlay");
ok(s6 && Number(s6.scale) < 1 && s6.radius === "", "the add form follows (its own corners are left alone)", s6);
await back(page); await wait(800);
ok(!(await page.$(".add-overlay")), "let go: the add form closed");

section("R79-B5. An open editor inside a page, or reduced motion: nothing moves, Back works as before");
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.evaluate(() => [...document.querySelectorAll(".tab-btn")][1].click()); await wait(500);
await g(page, "start", 0, 0);
ok((await g(page, "move", 0.5, 0)) === "none" && (await style(page, "main.page")).scale === "", "with reduced motion the page does not move");
ok((await back(page)) === "handled", "Back itself still works");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close(); await browser.close();
finish("e2e_run79_backswipe");
