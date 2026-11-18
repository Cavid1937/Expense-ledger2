// Run 108 (release readiness): a loan's repayment plan decides what the app says is still owed and what is due each month. Hand-picked
// loans are covered in the Run 17 / Run 20 tests; this builds 3,000 random loans of every repayment type (annuity, equal principal, flat
// "taksit" rate, no interest) with realistic amounts (50 to 200,000 manat, 1 to 360 months, 0 to 60% a year, some with the bank's own
// monthly payment) and checks the rules every plan must keep, in whole qapik: the parts of the payments add up to exactly the amount
// borrowed, the balance falls to exactly zero and never below, nothing is negative, the totals add up, and every instalment falls on the
// same day of the month as the first (or the month's last day). Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { loanSchedule } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(170108);
const int = (n) => Math.floor(r() * n);
const pad = (n) => String(n).padStart(2, "0");
const monthLen = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const TYPES = ["annuity", "equal", "flat", "none"];
const check = (l, sc) => {
  const p = sc.payments, bad = [];
  if (!p.length || p.length > l.months) bad.push(`${p.length} rows for ${l.months} months`);
  if (p.reduce((s, x) => s + x.principal, 0) !== l.principal) bad.push("principal parts do not add up to the loan");
  if (p[p.length - 1].balance !== 0) bad.push(`ends at ${p[p.length - 1].balance}, not 0`);
  let prev = l.principal;
  const [y0, m0, d0] = l.firstPayment.split("-").map(Number);
  p.forEach((x, i) => {
    if (![x.payment, x.interest, x.principal, x.balance].every(Number.isInteger)) bad.push(`row ${i + 1} not whole qapik`);
    // a payment of zero is unavoidable only when less than one qapik a month is owed (0.05 manat over 12 months)
    if (x.payment < 0 || (x.payment === 0 && l.principal >= l.months) || x.interest < 0 || x.principal < 0 || x.balance < 0) bad.push(`row ${i + 1} payment ${x.payment} interest ${x.interest} principal ${x.principal} balance ${x.balance}`);
    if (x.payment !== x.interest + x.principal) bad.push(`row ${i + 1} payment is not interest + principal`);
    if (x.balance !== prev - x.principal || x.balance > prev) bad.push(`row ${i + 1} balance does not follow`);
    prev = x.balance;
    const idx = m0 - 1 + i, y = y0 + Math.floor(idx / 12), m = (idx % 12) + 1;
    if (x.date !== `${y}-${pad(m)}-${pad(Math.min(d0, monthLen(y, m)))}`) bad.push(`row ${i + 1} dated ${x.date}`);
  });
  if (sc.totalPaid !== l.principal + sc.totalInterest) bad.push("total paid is not loan + interest");
  if (l.rateType === "none" && sc.totalInterest !== 0) bad.push("interest on an interest-free loan");
  return bad;
};

const run = (label, n, pick, mustPlan) => {
section(label);
const problems = [], seen = { plans: 0, refused: 0, rows: 0 };
for (let i = 0; i < n; i++) {
  const rateType = TYPES[i % 4], { principal, months, ratePct } = pick(rateType);
  const y = 2024 + int(4), m = 1 + int(12), first = `${y}-${pad(m)}-${pad(Math.min(1 + int(31), monthLen(y, m)))}`;
  const l = { principal, months, rateType, ratePct, firstPayment: first, bankPayment: null, payments: [] };
  // a bank's own payment, as people copy it from the contract: our estimate rounded up to a whole manat, never below it
  if (rateType === "annuity" && r() < 0.3) { const est = loanSchedule(l); if (est) l.bankPayment = Math.ceil(est.payments[0].payment / 100) * 100; }
  const sc = loanSchedule(l);
  if (!sc) { seen.refused++; if (mustPlan || rateType !== "annuity") problems.push(`#${i} ${JSON.stringify(l)} refused`); continue; }
  seen.plans++; seen.rows += sc.payments.length;
  const bad = check(l, sc);
  if (bad.length) problems.push(`#${i} ${rateType} ${principal} qapik, ${months} months, ${ratePct}%${l.bankPayment ? ", bank " + l.bankPayment : ""}: ${bad.slice(0, 2).join("; ")}`);
}
ok(problems.length === 0, `${seen.plans} plans with ${seen.rows} instalments: every one adds up exactly and ends at zero${seen.refused ? `; ${seen.refused} refused (no plan shown)` : ""}`, problems.slice(0, 6));
return seen;
};
// what people in Azerbaijan really take: shop instalments and cash loans up to 5 years at up to 60%, mortgages up to 30 years at up to 20%
const real = run("R108-LN1. 3,000 random realistic loans: every repayment plan pays back exactly what was borrowed", 3000, (t) => {
  const long = t !== "flat" && r() < 0.4, ratePct = t === "none" || r() < 0.1 ? 0 : Math.round(r() * (long ? 2000 : 6000)) / 100;
  return { principal: 5000 + int(20000000), months: t === "flat" ? 1 + int(48) : long ? 61 + int(300) : 1 + int(60), ratePct };
});
ok(real.plans === 3000, "a plan is made for every one of them", real);
// beyond that (decades at a very high rate, a few qapik over many months) an annuity plan may be refused, because a payment rounded to
// the qapik would never reduce the balance; then the app shows no plan rather than a wrong one. Every plan it does make still adds up.
const wide = run("R108-LN2. 3,000 extreme loans (0.01 to 200,000 manat, up to 600 months, up to 100%): any plan made adds up exactly", 3000, (t) => ({
  principal: r() < 0.3 ? 1 + int(5000) : 1 + int(20000000), months: 1 + int(600), ratePct: t === "none" ? 0 : Math.round(r() * 10000) / 100,
}), false);
ok(wide.plans > 2000, "most extreme loans still get a plan", wide);
finish("run108loanprop");
