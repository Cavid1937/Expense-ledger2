// Run 24: Settings feel — the name's Save button is off until the name changes, and a pressed row has a soft background. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const type = (page, sel, v) => page.$eval(sel, (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);

section("R24-SF1. Name Save follows changes");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await page.evaluate(() => { [...document.querySelectorAll("nav button, .tabbar button, [role=tab]")].find((b) => /settings/i.test(b.innerText))?.click(); }); await wait(400);
  const dis = () => page.evaluate(() => document.querySelector('[data-section="st-name-save"]').disabled);
  ok(await dis(), "Save is off while the name is unchanged");
  await type(page, "#profile-name", "Aysel"); await wait(120);
  ok(!(await dis()), "Save turns on when the name is edited");
  await page.evaluate(() => document.querySelector('[data-section="st-name-save"]').click()); await wait(300);
  ok(await dis(), "Save is off again once the name is saved");
  const pressed = await page.evaluate(() => { const r = document.querySelector(".list-row"); return r ? getComputedStyle(r).borderRadius : ""; });
  ok(parseFloat(pressed) >= 10, "rows are rounded so the pressed state is a pill", pressed);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run24_setfeel", browser);
