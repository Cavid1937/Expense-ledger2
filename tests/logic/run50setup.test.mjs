// Run 50: the optional "set up in a minute" plan. Expected values worked out by hand (today = 20 Oct 2026); synthetic data only.
import { H, ok, section, reset, setNow, finish } from "./lib.mjs";
const { planSetup, nextPayDate, validateBill } = H;
reset(); setNow(2026, 9, 20);
const now = new Date(2026, 9, 20);
const names = { cash: "Cash", bank: "Bank card", salary: "Salary" };
const P = (a, ex = []) => planSetup(a, names, ex, now);

section("R50-U1. Next pay date");
ok(nextPayDate(5, now) === "2026-11-05", "pay day 5 has passed this month: next is 5 Nov");
ok(nextPayDate(25, now) === "2026-10-25" && nextPayDate(20, now) === "2026-10-20", "25th is still ahead; today itself counts (20th)");
ok(nextPayDate(31, new Date(2026, 10, 10)) === "2026-11-30", "31st in a 30-day month = 30 Nov");
ok(nextPayDate(31, new Date(2027, 1, 1)) === "2027-02-28", "31st in February 2027 = 28 Feb");
ok(nextPayDate(5, new Date(2026, 11, 20)) === "2027-01-05", "from December the next 5th is in January of the next year");

section("R50-U2. Accounts");
let p = P({ cash: "120", bank: "350,5" });
ok(p.ok && p.accounts.length === 2 && p.accounts[0].name === "Cash" && p.accounts[0].kind === "cash" && p.accounts[0].amount === 120 && p.accounts[1].kind === "card" && p.accounts[1].amount === 350.5, "cash 120 and bank 350,50 (comma decimal) make two accounts", p.accounts);
ok(P({}).ok && P({}).accounts.length === 0 && P({}).bill === null && P({}).goal === null, "no answers create nothing");
ok(P({ cash: "0", bank: "" }).accounts.length === 0 && P({ cash: "0" }).ok, "0 or empty = no account, and that is not an error");
p = P({ cash: "abc", bank: "10" });
ok(!p.ok && p.errors.cash === "invalid", "an invalid amount is reported on its field and the plan is refused", p.errors);
ok(!P({ cash: "-5" }).ok, "a negative opening amount is refused");
p = P({ cash: "50", bank: "70" }, ["cash"]);
ok(p.accounts.length === 1 && p.accounts[0].name === "Bank card" && p.skipped.join() === "Cash", "an account that already exists (any case) is skipped, not duplicated");

section("R50-U3. Income");
p = P({ income: "fixed", salary: "1500", payDay: "5" });
ok(p.ok && p.bill && p.bill.amount === 1500 && p.bill.freq === "monthly" && p.bill.type === "income" && p.bill.category === "salary" && p.bill.anchorDate === "2026-11-05" && p.bill.dueDay === undefined, "fixed pay 1500 on the 5th = monthly income bill starting 5 Nov", p.bill);
ok(P({ income: "fixed", salary: "1500", payDay: "31" }).bill.dueDay === 31, "a pay day after the 28th keeps the day (31) so short months do not drift");
ok(validateBill({ id: "tmp", ...p.bill, active: true, createdAt: "" }) !== null, "the bill is accepted by the app's own bill check");
ok(P({ income: "variable", salary: "1500", payDay: "5" }).bill === null && P({ income: "none" }).bill === null, "irregular or no income creates no bill");
p = P({ income: "fixed", salary: "", payDay: "" });
ok(!p.ok && p.errors.salary === "required" && p.errors.payDay === "invalid", "fixed pay without amount or day is refused", p.errors);
ok(!P({ income: "fixed", salary: "100", payDay: "32" }).ok && !P({ income: "fixed", salary: "100", payDay: "2.5" }).ok && !P({ income: "fixed", salary: "100", payDay: "0" }).ok, "pay day must be a whole number 1 to 31");

section("R50-U4. Goal");
p = P({ goalName: "Laptop", goalTarget: "2000" });
ok(p.ok && p.goal && p.goal.name === "Laptop" && p.goal.target === 2000 && p.goal.saved === 0 && p.goal.targetDate === null, "name + target = a goal with nothing saved yet", p.goal);
ok(P({ goalName: "Laptop" }).errors.goalTarget === "required" && P({ goalTarget: "500" }).errors.goalName === "required", "only half a goal is refused (nothing guessed)");
ok(P({ goalName: "Laptop", goalTarget: "0" }).errors.goalTarget === "invalid", "a target of 0 is refused");
ok(P({ goalName: "x".repeat(61), goalTarget: "5" }).errors.goalName === "long", "a goal name over 60 characters is refused");
ok(P({ goalName: "   ", goalTarget: "" }).ok, "blank spaces count as no answer");
finish("run50setup");
