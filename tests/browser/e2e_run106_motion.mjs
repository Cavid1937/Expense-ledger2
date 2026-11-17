// Run 106 (owner: "you forget adding Claude app feel to new features, e.g. What if I buy something? is instant"): every control on the
// five tabs that unfolds something (aria-expanded="false", or data-section ending in "-open") must start a motion when pressed.
// A new feature that pops open with no motion fails here. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, daysAgo, wait } from "./lib.mjs";
const txs = []; for (let i = 0; i < 40; i++) txs.push(tx({ amount: 3 + i, merchant: "Shop " + (i % 7), date: daysAgo(i % 40), category: ["food", "transport", "shopping", "bills"][i % 4] }));
txs.push(tx({ type: "income", category: "salary", amount: 2000, merchant: "Work", date: daysAgo(5) }));
const browser = await launch();
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: txs, safeToSpend: { enabled: true } }) }); await settle(page);
const TABS = ["Home", "Entries", "Analytics", "Goals", "Settings"];
let checked = 0;
for (let tabIx = 0; tabIx < TABS.length; tabIx++) {
  section(`R106-M${tabIx + 1}. ${TABS[tabIx]}: every opener moves`);
  await page.evaluate((i) => document.querySelectorAll(".tab-btn")[i].click(), tabIx); await wait(900);
  const n = await page.evaluate(() => { document.querySelectorAll("[data-probe]").forEach((e) => e.removeAttribute("data-probe")); const els = [...document.querySelectorAll('main [aria-expanded="false"], main [data-section$="-open"]')]; els.forEach((e, i) => e.setAttribute("data-probe", i)); return els.length; });
  const still = [];
  for (let k = 0; k < n; k++) {
    const r = await page.evaluate(async (k) => {
      const el = document.querySelector(`[data-probe="${k}"]`); if (!el || !el.isConnected || el.offsetParent === null) return null;
      const label = (el.getAttribute("data-section") || el.className || el.tagName) + " | " + (el.textContent || "").trim().slice(0, 40);
      el.click(); await new Promise((r) => setTimeout(r, 60));
      return { label, anims: document.getAnimations().filter((a) => a.playState === "running").length };
    }, k);
    if (r) { checked++; if (r.anims === 0) still.push(r.label); }
    await page.keyboard.press("Escape"); await wait(200);
    await page.evaluate(() => { const c = document.querySelector('.sheet-overlay [data-closer="1"]'); c && c.click(); }); await wait(400);
  }
  ok(still.length === 0, `${TABS[tabIx]}: no opener appears without motion`, still);
}
ok(checked >= 5, "the sweep actually pressed openers", checked);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await finish("e2e_run106_motion", browser);
