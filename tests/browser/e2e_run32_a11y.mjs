// Run 32 (backlog item 10): a transaction row names its kind in words for screen readers (the minus sign is visual only). Synthetic data only.
import { launch, openPage, ok, section, finish, tx, baseSeed, tab, settle } from "./lib.mjs";
const browser = await launch();
const T = (id, o) => tx({ id, date: "2026-10-05", ...o });
const seed = (language) => baseSeed({ language, transactions: [T(1790005000001, { merchant: "Cafe", amount: 12 }), T(1790005000002, { type: "income", category: "salary", merchant: "Pay", amount: 500 })] });
const info = (page) => page.evaluate(() => [...document.querySelectorAll(".txn-row")].map((r) => { const a = r.querySelector(".txn-amt"); const s = a.querySelector(".sr-only"); const sign = [...a.querySelectorAll("span")].find((x) => x.getAttribute("aria-hidden") === "true"); const b = s && s.getBoundingClientRect(); return { name: r.innerText.split("\n")[0], word: s && s.textContent, signHidden: !!sign, sign: sign && sign.textContent, tiny: !!b && b.width <= 2 && b.height <= 2, visible: a.getBoundingClientRect().width > 20 }; }));
section("R32-A1. Rows say Income or Expense in words; the sign is visual only");
{
  const page = await openPage(browser, { seed: seed("en") }); await tab(page, "Ledger"); await settle(page);
  const r = await info(page); const exp = r.find((x) => /Cafe/.test(x.name)), inc = r.find((x) => /Pay/.test(x.name));
  ok(exp && exp.word === "Expense: " && exp.signHidden && exp.sign === "−", "an expense row has the hidden word 'Expense:' and a hidden-from-readers minus", exp);
  ok(inc && inc.word === "Income: " && inc.signHidden && inc.sign === "+", "an income row has the hidden word 'Income:' and a hidden-from-readers plus", inc);
  ok(r.every((x) => x.tiny && x.visible), "the hidden word takes no visible space and the amount is still shown", r);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R32-A2. az and ru");
for (const [l, e, i] of [["az", "Xərc: ", "Gəlir: "], ["ru", "Расход: ", "Доход: "]]) {
  const page = await openPage(browser, { seed: seed(l) }); await tab(page, "Ledger"); await settle(page);
  const r = await info(page);
  ok(r.map((x) => x.word).sort().join("|") === [e, i].sort().join("|"), `${l}: the hidden words are '${e.trim()}' and '${i.trim()}'`, r.map((x) => x.word));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
await finish("e2e_run32_a11y", browser);
