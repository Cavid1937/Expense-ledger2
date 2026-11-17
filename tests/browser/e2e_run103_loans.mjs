// Run 103 (owner decisions D9, D10). D9: a loan from the Debts page can be linked to the recurring payment that stands for it, and is
// then counted once; marking a loan payment marks that payment paid too. D10: the Add form has an explicit "No account" choice.
// The arithmetic is in logic/run103loans.test.mjs; this checks the screens in the real bundle. Synthetic data only.
import { launch, openPage, state, wait, ok, section, finish, baseSeed, settle, tx, openAdd } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), DKEY);
const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || null, sel);
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(250); };
const openDebts = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150); await page.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(250); await page.evaluate(() => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[1].click()); await wait(300); };
// 1,200.00 over 12 months without interest, first payment today: 100.00 due this month. Stored once per tab.
const loanPre = (lender) => new Function(`try{if(!sessionStorage.getItem("__l")){sessionStorage.setItem("__l","1");localStorage.setItem("${DKEY}",JSON.stringify({version:1,debts:[],loans:[{id:"l1",lender:"${lender}",kind:"cash",principal:120000,months:12,rateType:"none",ratePct:0,firstPayment:"${TODAY}",bankPayment:null,payments:[]}]}));}}catch(e){}`);
const bill = (name) => ({ id: "b1", name, type: "expense", category: "finance", subcategory: "", amount: 100, freq: "monthly", anchorDate: TODAY, active: true, createdAt: "" });

section("R103-B1. Debts page: link a loan to its recurring payment, then mark a payment");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", bills: [bill("Mortgage")] }), pre: loanPre("Bank") }); await settle(page);
  await openDebts(page);
  ok(await page.$('[data-section="loan-bill"]') !== null && (await text(page, '[data-section="loan-via-bill"]')) === null, "the link choice is shown; different names, so nothing is matched on its own");
  await click(page, '[data-pick-for="loan-bill-l1"]'); await wait(300); await click(page, '.pick-opt[data-value="b1"]'); await wait(500);
  let st = await stored(page);
  ok(st && st.loans[0].billId === "b1", "the link is stored on the loan (billId b1)", st && st.loans[0]);
  const note = await text(page, '[data-section="loan-via-bill"]');
  ok(note !== null && /Mortgage/.test(note) && /Counted once/.test(note), "the card says it is counted once, through 'Mortgage'", note);
  await click(page, ".loan-paid-btn"); await wait(400);
  const s = await state(page), e = s.transactions.find((x) => x.loan && x.merchant === "Bank");
  ok(e && e.billId === "b1" && Math.abs(e.amount - 100) < 1e-9, "the payment's entry is linked to the recurring payment, so that one counts as paid too", e);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R103-B2. Taking the link off keeps everything else");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", bills: [bill("Mortgage")] }), pre: loanPre("Bank") }); await settle(page);
  await openDebts(page);
  await click(page, '[data-pick-for="loan-bill-l1"]'); await wait(300); await click(page, '.pick-opt[data-value="b1"]'); await wait(500);
  await click(page, '[data-pick-for="loan-bill-l1"]'); await wait(300); await click(page, '.pick-opt[data-value=""]'); await wait(500);
  const st = await stored(page);
  ok(st && !("billId" in st.loans[0]) && st.loans[0].principal === 120000 && st.loans[0].months === 12 && st.loans[0].lender === "Bank", "billId is gone; the loan's terms are unchanged", st && st.loans[0]);
  await page.close();
}
section("R103-B3. Home: a loan and the recurring payment for it are counted once");
{
  // Same lender name and amount (100.00): matched without a link. Safe to Spend 1,470 - 100 = 1,370 (not 1,270).
  const page = await openPage(browser, { seed: baseSeed({ language: "en", bills: [bill("Bank")] }), pre: loanPre("Bank") }); await settle(page);
  const amount = await text(page, '[data-section="home-safe"] .safe-amount');
  ok(/1,370\.00/.test(amount || ""), "1,370.00: the instalment is taken out once", amount);
  await click(page, '[data-section="home-safe"] .safe-toggle'); await wait(300);
  ok((await text(page, '[data-section="safe-loan-due"]')) === null, "no separate loan row: the recurring payment already stands for it");
  await openDebts(page);
  const note = await text(page, '[data-section="loan-via-bill"]');
  ok(note !== null && /Bank/.test(note), "the Debts page says the loan is counted through the recurring payment 'Bank'", note);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R103-B4. Add form: 'No account' is a choice of its own (D10)");
{
  const accPre = new Function(`try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:""},hidden:false}],transfers:[]}));}}catch(e){}`);
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5, account: "a_card01" })] }), pre: accPre }); await settle(page); await openAdd(page); await wait(300);
  const read = () => page.evaluate(() => ({ card: (document.querySelector('[data-acc-pick="a_card01"]') || {}).ariaChecked, none: (document.querySelector('[data-section="add-no-account"]') || {}).ariaChecked, label: (document.querySelector('[data-section="add-no-account"]') || {}).textContent }));
  let r = await read();
  ok(r.card === "true" && r.none === "false" && r.label === "No account", "last time's account is chosen; 'No account' is there, not chosen", r);
  await click(page, '[data-section="add-no-account"]');
  r = await read();
  ok(r.card === "false" && r.none === "true", "one tap on 'No account' chooses it and takes the card off", r);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R103-B5. A net position below zero keeps its minus sign");
{
  // 900.00 in the card, 1,200.00 still owed on the loan: -300.00 (before Run 103 it showed as 300.00)
  const both = new Function(`try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:900,date:""},hidden:false}],transfers:[]}));localStorage.setItem("${DKEY}",JSON.stringify({version:1,debts:[],loans:[{id:"l1",lender:"Bank",kind:"cash",principal:120000,months:12,rateType:"none",ratePct:0,firstPayment:"${TODAY}",bankPayment:null,payments:[]}]}));}}catch(e){}`);
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: both }); await settle(page);
  const np = await text(page, '[data-section="home-netpos"]');
  ok(np !== null && /−300\.00/.test(np), "Net position: −300.00", np);
  await page.close();
}
section("R103-B6. The recurring payment was already recorded this month: marking the loan paid adds no second entry");
{
  // the loan is linked to bill b1, whose 100.00 entry for this month is already recorded (id 9001)
  const pre = new Function(`try{if(!sessionStorage.getItem("__l")){sessionStorage.setItem("__l","1");localStorage.setItem("${DKEY}",JSON.stringify({version:1,debts:[],loans:[{id:"l1",lender:"Bank",kind:"cash",principal:120000,months:12,rateType:"none",ratePct:0,firstPayment:"${TODAY}",bankPayment:null,billId:"b1",payments:[]}]}));}}catch(e){}`);
  const seed = baseSeed({ language: "en", bills: [bill("Mortgage")] }); seed.transactions = [...seed.transactions, tx({ id: 9001, merchant: "Mortgage", amount: 100, category: "finance", billId: "b1" })];
  const page = await openPage(browser, { seed, pre }); await settle(page);
  const n0 = (await state(page)).transactions.length;
  await openDebts(page);
  await click(page, ".loan-paid-btn"); await wait(400);
  const msg = await page.evaluate(() => (document.querySelector(".toast") || {}).textContent || "");
  const dot = await page.evaluate(() => { const d = document.querySelector(".toast-dot"); return d ? getComputedStyle(d).animationName : null; });
  ok(dot === "toastDot", "the notice's dot lands with a small settle (motion video)", dot);
  let st = await stored(page), s = await state(page);
  const p = st && st.loans[0].payments[0];
  ok(s.transactions.length === n0 && p && String(p.billTxn) === "9001" && !("txnId" in p) && p.amount === 10000, "no new entry; the loan payment points at the recorded one (billTxn 9001)", { n0, n: s.transactions.length, p });
  ok(/already recorded this month/.test(msg) && /Mortgage/.test(msg), "the notice says why no entry was added", msg);
  // the next instalment: that entry is already used, so this one is recorded as its own entry, linked to the recurring payment
  await click(page, ".loan-paid-btn"); await wait(400);
  st = await stored(page); s = await state(page);
  const q = st && st.loans[0].payments[1], e = q && s.transactions.find((x) => String(x.id) === String(q.txnId));
  ok(s.transactions.length === n0 + 1 && e && e.billId === "b1", "the next instalment gets its own entry; the same recorded entry is never used twice", { n: s.transactions.length, q });
  // reload (the stored loans are read back through the checker), then save again: the reference must survive both
  await page.reload(); await settle(page); await openDebts(page);
  await click(page, ".loan-paid-btn"); await wait(400);
  st = await stored(page);
  ok(st && st.loans[0].payments.length === 3 && String(st.loans[0].payments[0].billTxn) === "9001", "after a reload and another save the reference is still there", st && st.loans[0].payments);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run103_loans", browser);
