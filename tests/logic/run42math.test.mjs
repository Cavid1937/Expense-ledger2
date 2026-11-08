// Run 42: simple arithmetic in the amount box ("45 - 20"). A hand-written parser, no eval. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { evalAmountExpr: ev } = H;
reset();

section("R42-M1. Basic arithmetic gives the hand-computed result");
ok(ev("45.00-20") === 25 && ev("45-20") === 25, "45.00 - 20 = 25");
ok(ev("45 − 20") === 25 && ev("45 - 20") === 25, "spaces and the typographic minus are fine");
ok(ev("12.5×3") === 37.5 && ev("12,5*3") === 37.5, "12.5 x 3 = 37.5 (dot or comma as the decimal mark, x or *)");
ok(ev("(30+12)/2") === 21 && ev("(30+12)÷2") === 21, "(30 + 12) / 2 = 21");
ok(ev("2+3*4") === 14, "multiplication first: 2 + 3 x 4 = 14");
ok(ev("-5+10") === 5 && ev("-(2+3)+10") === 5, "a leading minus is allowed when the total is still positive");
ok(ev("0.1+0.2") === 0.3, "0.1 + 0.2 is 0.3 (not 0.30000000000000004)");
ok(ev("10/3") === 3.33 && ev("20/3") === 6.67, "a result with more than 2 decimals is rounded to 2 (10/3 = 3.33, 20/3 = 6.67)");
ok(ev("45.10-20") === 25.1, "45.10 - 20 = 25.10");
ok(ev("100+25.5+0.5") === 126, "several terms: 100 + 25.5 + 0.5 = 126");

section("R42-M2. Anything that is not a positive, valid amount gives null");
ok(ev("5-10") === null, "a negative total is refused");
ok(ev("45-45") === null, "a total of zero is refused");
ok(ev("10/0") === null, "division by zero is refused");
ok(ev("3*-2") === null, "3 x -2 is negative: refused");
ok(ev("") === null && ev("   ") === null && ev(null) === null && ev(undefined) === null, "empty input gives null");
ok(ev("1+") === null && ev("+1") === null && ev("*2") === null && ev("2**3") === null && ev("2//3") === null, "dangling or doubled signs are refused");
ok(ev("(1+2") === null && ev("1+2)") === null && ev("()") === null, "unbalanced brackets are refused");
ok(ev("1,234+5") === null && ev("1.234+1") === null, "a number with 3 decimals (a thousands mark) is refused, never read as 1.234");
ok(ev("1e3+1") === null && ev("abc") === null && ev("5+a") === null, "letters and exponents are refused");
ok(ev("99999999*99999999") === null, "a total above the largest amount is refused");
ok(ev("((((((((1))))))))") === null && ev("((((((1))))))") === 1, "more than 6 nested brackets are refused; 6 are fine");
ok(ev("1+".repeat(30) + "1") === null, "text longer than 40 characters is refused");
ok(ev("alert(1)") === null && ev("process.exit()") === null && ev("1;2") === null, "code-like text is just refused (nothing is ever evaluated)");
finish("run42math");
