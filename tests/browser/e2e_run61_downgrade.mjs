// Run 61: an older app version (version 9, tests/fixtures/app-v9) opening data whose goal has a history (contribs) and a reached day.
// The older version does not know these two fields; the goal's total ("saved") must stay exactly the same and the app must work.
import { spawnSync } from "child_process"; import fs from "fs"; import os from "os"; import path from "path"; import { fileURLToPath, pathToFileURL } from "url";
import { launch, openPage, openGoals, wait, ok, section, finish, baseSeed, KEY, TODAY } from "./lib.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const out = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-v9-page-"));
const built = spawnSync(process.execPath, [path.join(here, "build.mjs")], { env: { ...process.env, CANDIDATE: path.join(here, "..", "fixtures", "app-v9", "App.jsx"), PAGE_OUT: out }, encoding: "utf8" });
const V9 = pathToFileURL(path.join(out, "index.html")).href;
const browser = await launch();
const goal = { id: "g1", name: "Laptop", target: 1000, saved: 450, monthlyTarget: 0, targetDate: null, contribs: [{ id: "c1", date: TODAY, amount: 150, note: "Birthday", src: "add" }] };

section("R61-D1. The current app keeps the history");
let page = await openPage(browser, { seed: baseSeed({ language: "en", goals: [goal] }) }); await openGoals(page, "goals"); await wait(300);
let st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
ok(built.status === 0 && st.goals[0].saved === 450 && st.goals[0].contribs.length === 1, "the version 9 app builds; the current app stores 450 and its history line");
await page.close();

section("R61-D2. Version 9 opens the same data");
page = await openPage(browser, { url: V9, seed: null }); await wait(800);
const shown = await page.evaluate(() => document.body.innerText);
ok(!/Something went wrong/i.test(shown) && page.errors.length === 0, "the older app opens without an error", page.errors[0]);
await page.evaluate(() => { const b = [...document.querySelectorAll(".tab-btn")][3]; if (b) b.click(); }); await wait(600);
await page.evaluate(() => { const s = document.querySelectorAll(".goals-page .seg-btn")[1]; if (s) s.click(); }); await wait(500);
const goalsText = await page.evaluate(() => document.body.innerText);
st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
ok(st.goals.length === 1 && st.goals[0].saved === 450 && st.goals[0].target === 1000, "the goal's total is still exactly 450 of 1,000 (the older app may drop the history it does not know)", st.goals[0]);
ok(/Laptop/.test(goalsText) && /450/.test(goalsText), "and the older app shows the goal with 450", goalsText.slice(0, 300));
await page.close();
await browser.close();
try { fs.rmSync(out, { recursive: true, force: true }); } catch {}
finish("e2e_run61_downgrade");
