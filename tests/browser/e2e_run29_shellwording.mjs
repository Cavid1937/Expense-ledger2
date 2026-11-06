// Run 29: inside the Android app the safety / privacy texts must not claim "only on this phone / nobody else keeps a copy", because Android's
// automatic Google backup may keep an older copy. The website keeps its original texts. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const SHELL = `window.LedgerNative={installId:function(){return "ID-1";}}`;
const sheet = async (page, id) => {
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(350);
  await page.evaluate((i) => document.querySelector(`.more-page [data-more="${i}"]`).click(), id); await wait(400);
  return page.evaluate((i) => (document.querySelector(`[data-section="info-${i}"]`) || {}).innerText || "", id);
};
const card = (page) => page.evaluate(() => (document.querySelector(".more-id") || document.body).innerText);
section("R29-W1. Website: original wording");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const s = await sheet(page, "safe");
  ok(/no server copy/i.test(s) && !/Google backup|automatic backup/i.test(s), "website safety sheet keeps its text (no Android backup claims)");
  await page.evaluate(() => document.querySelector('[data-section="info-safe"] [data-closer]').click()); await wait(300);
  ok(/stored only on this device/i.test(await card(page)), "website More card keeps its text");
  await page.close();
}
section("R29-W2. Android app: honest wording in en / az / ru");
for (const [l, re, bad] of [["en", /Google/, /no server copy|nobody can restore/i], ["az", /Google/, /server surəti yoxdur/], ["ru", /Google/, /копии на сервере нет/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }), pre: SHELL }); await settle(page);
  const s = await sheet(page, "safe");
  ok(re.test(s) && !bad.test(s), `${l}: safety sheet mentions Google's automatic backup and drops the "nobody keeps a copy" claim`, s.slice(0, 200));
  await page.evaluate(() => document.querySelector('[data-section="info-safe"] [data-closer]').click()); await wait(300);
  ok(/Google/.test(await card(page)), `${l}: More card mentions Google backup`);
  if (l === "en") {
    await page.evaluate(() => document.querySelector('[data-section="info-safe"]') && document.querySelector('[data-section="info-safe"] [data-closer]').click()); await wait(200);
    const p = await sheet(page, "privacy");
    ok(/Google backup is on/i.test(p) && /Without a backup file or a Google backup/i.test(p), "en: privacy sheet explains the Google copy and deletion");
  }
  ok(page.errors.length === 0, `${l}: no JavaScript errors`, page.errors[0]);
  await page.close();
}
await finish("e2e_run29_shellwording", browser);
