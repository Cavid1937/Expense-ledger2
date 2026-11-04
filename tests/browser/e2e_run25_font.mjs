// Run 25: the app's own font (Onest) really renders in az, ru and en, including the manat sign, and nothing overflows. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const T = [tx({ id: 1790001000001, merchant: "Çörək evi İ ı Ə ə", amount: 12.5 })];

section("R25-FT1. Onest is used and loaded for Latin-extended, Cyrillic and the manat sign");
for (const lang of ["en", "az", "ru"]) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: T }) }); await settle(page); await wait(800);
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    const fam = getComputedStyle(document.body).fontFamily;
    const loaded = [...document.fonts].filter((f) => f.family.replace(/"/g, "") === "Onest" && f.status === "loaded").length;
    return { fam, loaded, ext: document.fonts.check('16px Onest', 'Əəğış₼'), cyr: document.fonts.check('16px Onest', 'Ж'), lat: document.fonts.check('16px Onest', 'Abc') };
  });
  ok(/^"?Onest"?/.test(r.fam), `${lang}: the page font starts with Onest`, r.fam);
  ok(r.loaded >= 1 && r.ext && r.lat, `${lang}: the Latin and Latin-extended files are loaded (manat sign and az letters)`, r);
  if (lang === "ru") ok(r.cyr && r.loaded >= 2, "ru: the Cyrillic file is loaded", r);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${lang}: no horizontal scroll`);
  ok(page.errors.length === 0, `${lang}: no JavaScript errors`, page.errors[0]);
  await page.close();
}
await finish("e2e_run25_font", browser);
