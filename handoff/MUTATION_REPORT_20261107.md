# Mutation check (2026-11-07)

| Deliberate bug | Result |
|---|---|
| account balance: income counted as spending | KILLED (9 more failed, -9 passed vs baseline) |
| account balance: transfer adds to the wrong side | KILLED (2 more failed, -2 passed vs baseline) |
| account balance: an entry dated exactly today is ignored | KILLED (1 more failed, -1 passed vs baseline) |
| account cents: rounds down instead of to nearest | SURVIVED |
| goal monthly amount: no longer rounded UP | KILLED (4 more failed, -4 passed vs baseline) |
| goal percent: not capped at 100 | KILLED (1 more failed, -1 passed vs baseline) |
| goal complete: needs MORE than the target | KILLED (2 more failed, -2 passed vs baseline) |
| goal months needed: not rounded up | KILLED (2 more failed, -2 passed vs baseline) |
| Safe to Spend: savings floor not subtracted | KILLED (5 more failed, -5 passed vs baseline) |
| Safe to Spend: upcoming bills not subtracted | KILLED (20 more failed, -20 passed vs baseline) |
| Safe to Spend: smaller of floor and goals used | KILLED (8 more failed, -8 passed vs baseline) |
| Safe to Spend: a bill entered for today also counts as settled ahead | SURVIVED |
| Safe to Spend: any amount settles an upcoming bill | KILLED (1 more failed, -1 passed vs baseline) |
| loan annuity: interest rounded down | KILLED (8 more failed, -8 passed vs baseline) |
| loan annuity: last payment no longer absorbs leftover cents | KILLED (1 more failed, -1 passed vs baseline) |
| loan equal-principal: instalment rounded up | SURVIVED |

**3 mutant(s) not killed: add a hand-checked test for each.**

## Follow-up
The first full run (baseline 1261 passed, 0 failed, 7 missing; the 7 missing are an artifact of running a copy outside the repo) left three mutants alive: account cents rounded down, a bill entered for today settled ahead, equal-principal instalment rounded up. tests/logic/run32mut.test.mjs adds hand-worked checks for them (0.29 + 0.57 = 0.86; 2000 - 500 - 500 = 1000; 33.33 / 33.33 / 33.34). Re-running only those three: all KILLED. Result: 16 of 16 deliberate bugs are now caught. Limits: 16 bugs in 4 areas (accounts, goals, Safe to Spend, loans); budgets, bills schedule and analytics are not mutation-checked yet.

