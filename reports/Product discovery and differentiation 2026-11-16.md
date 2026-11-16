# Expense Ledger: product discovery, competitors and differentiation

Date: 16 November 2026. Author: Claude (implementation assistant). Reader: the owner (not a programmer).

**Short answer.** The app already does more than most competitors. Its weakness is not missing features; it is that no single promise ties them together, and the one number that should carry that promise (Safe to Spend) goes blank for part of every month. The strongest position I can defend with evidence is: *"Know what is really yours to spend until your next income, without giving your bank login to anyone."* One part of that is built and tested in this run (Run 97, not yet published). The larger part needs your decision (section 15).

How to read the evidence labels: **Confirmed** = I saw it in the code, a test, or a source I read. **Likely** = credible but not shown. **Hypothesis** = needs real users. **Opinion** = my judgement.

---

## 1. What I inspected

- Working copy `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Live version: release 96, commit `2626caf`. This run adds release 97 on top, committed on this computer only.
- The Home screen, the Safe to Spend calculation, schedules, loans, accounts, the setup questions, and the tests around them.
- Your PDF "Financial Health Indicators and Frameworks".
- Earlier research already on disk (not repeated): the 29-item backlog report, the Azerbaijan competitor notes, the Büdcəm and Cashera notes, the coach rulebook research.
- New this run: about 139 user reviews across 6 products read one by one, plus search-level evidence on 6 more, plus Azerbaijan market facts.

## 2. What the app can do today (Confirmed, from code)

| Area | State |
|---|---|
| Recording | Manual entry, sentence entry, templates, splits, gifts, reimbursements, receipt photos |
| Less typing | Bank-notice reader (Android), statement import (ABB, Unibank, CSV), recurring suggestions |
| Money position | Accounts, transfers, balances; debts and loans with payment plans; goals; sinking funds |
| Looking ahead | Safe to Spend with a line-by-line breakdown; run-out day; month-end forecast checked against past months |
| Advice | Rule-based coach (about 14 rules), insights; no AI, no score |
| Trust | Works offline, no account needed, encrypted backup, Google Drive backup, app lock |
| Languages | Azerbaijani, Russian, English |
| Phone | Android shell with widgets; never published on Google Play |

Opinion: this is a wide product. Breadth is now a risk as much as a strength (you said yourself on 8 November: keep it simple).

## 3. Competitor comparison

Prices are as listed by the sources on the day I read them; check before quoting.

| Product | Entry | Bank link | Commitment-aware "what's left" | Works offline, no account | Price | What users say most |
|---|---|---|---|---|---|---|
| YNAB | Manual + link | Yes (US/EU) | Yes (envelope method) | No | $14.99/mo or $109/yr | Loved; hard to learn; expensive |
| Monarch | Link | Yes | Partly | No | $14.99/mo or $99.99/yr | Sync breaks, wrong data, support |
| Wallet (BudgetBakers) | Both | Yes | Weak | No | Subscription | Support, bugs, lost data |
| Spendee | Both | Yes | Weak | No | Subscription | Bugs, "abandoned", sync |
| Money Manager (Realbyte) | Manual | No | No | Yes | One-off / ads | Easy and private; missing features; backup scares |
| Zenmoney | Both | Yes (RU banks) | Partly | No | Subscription | Bank sync broken |
| PocketGuard | Link | Yes | Yes ("In My Pocket") | No | Subscription | The headline number is wrong when sync misses things |
| Simplifi | Link | Yes | Yes (projection) | No | Subscription | Projection ignores planned spending |
| Cashera (AZ) | Chat, voice, receipt, notices | No | Not seen | No (server) | Plus 4.99 AZN/mo | No review corpus found |
| Büdcəm (AZ) | Notices, AI advisor | No | Not seen | No (needs internet) | $1.99/mo | No review corpus found |
| **Expense Ledger** | Manual, notices, statements | No | **Yes, shown line by line** | **Yes** | Free | Not on a store; no public reviews |

## 4. What users complain about (review study)

Counted by me from reviews I read. Small samples; themes, not statistics.

| Source | Reviews read | Top themes (count) |
|---|---|---|
| Trustpilot, Wallet/BudgetBakers (rating 2.5) | 20 | Support 9, bugs 7, lost or wrong data 6, bank sync 4, price/refund 4 |
| Trustpilot, Spendee (2.9) | 13 | Bugs/no updates 6, support 4, price 4, bank sync 3, data loss 3 |
| Trustpilot, YNAB (4.6) | 23 | Praise throughout; learning curve 4; debt-payoff stories |
| Trustpilot, Monarch (2.0) | 20 | Support 8, bank sync 6, wrong/missing data 6, price/billing 6, duplicates 4 |
| JustUseApp, Money Manager | 33 | Easy manual entry 14, wants more features 15, likes "no bank link" 8, sync/transfer 3 |
| RuStore, Zenmoney (3.9) | 30 | Bank sync broken 14, praise 16, support 3 |
| Search-level only | n/a | PocketGuard, Emma, MoneyWiz, Honeydue, Goodbudget, Simplifi forum |

**Five findings.**

1. **Bank sync is the main thing that breaks trust.** Missing entries, duplicates and wrong balances appear in every bank-linked product. (Confirmed in the reviews read.)
2. **A headline number that leaves something out is worse than no number.** PocketGuard and Simplifi users say this directly. (Confirmed at search level.)
3. **Manual apps are liked for control and privacy, then dropped because typing becomes a chore.** (Confirmed in reviews; the size of the drop-off is not measured.)
4. **Data loss and price are recurring fears.** Backup that fails once produces one-star reviews for years. (Confirmed.)
5. **Many people will not give bank credentials.** US surveys: about two-thirds very concerned; about one in five would refuse. (Confirmed for the US; not measured for Azerbaijan.)

Limits: mostly English and Russian reviews from the US, EU and Russia. I found **no usable review corpus for Cashera or Büdcəm**, and no Azerbaijani-language review set. Trustpilot over-represents angry customers. Play Store pages could not be read by my tools. Links were opened during the session; I did not keep a link for every single review.

## 5. Azerbaijan: opportunities and limits

- Open banking started in October 2025; two e-money firms joined in May 2026; reading account data needs registration with the Central Bank. (Confirmed from news sources.) **For us: not now.** It needs a legal entity, registration and money.
- Cards are replacing cash: cashless share of card turnover about 67.5% in 2025; about 21.7 million cards. (Confirmed.) So bank push notices cover a growing part of spending, which supports the notice reader.
- Instalment cards (TamKart, Birbank and others, up to 24 months) are widespread. (Confirmed they exist; **no figures found** on how many people carry several at once.)
- A state financial-inclusion programme for 2027 to 2030 was decreed on 26 May 2026. (Confirmed.) Possible future partnership angle; nothing concrete.
- I found no budgeting feature inside the main bank apps beyond spending detail. (Likely; I could not inspect the apps themselves.)
- **Hypothesis, unproven:** a salaried person in Baku with one or two instalment plans and some cash spending often does not know how much is free until pay day. This is the core assumption behind my recommendation. It needs the interviews in section 14.

## 6. Weaknesses and defects in our product

| # | Finding | Evidence | Priority |
|---|---|---|---|
| W1 | Safe to Spend follows the calendar month. From the 1st until pay arrives, Home only says "waiting". Someone paid on the 25th sees nothing useful for most of the month. | Confirmed in code and by test R97-U1 | High (needs your decision) |
| W2 | The per-day figure divides by days left in the calendar month, not days until the next income. | Confirmed in code | High (same decision) |
| W3 | Entries saved with no account do not change any balance, so every balance-based figure can look too good. | Confirmed in code | Medium |
| W4 | The app is not on Google Play; the Android package name is still `com.example...`; phones block installing the notice reader from a file. | Confirmed earlier (13 and 15 Nov) | High for any launch |
| W5 | Bank-CSV import can misread some amounts. | Confirmed in the 15 Nov audit; not fixed | Medium |
| W6 | The notice reader has never been proven on a real Xiaomi/Poco over several days. | Emulator only | Medium |
| W7 | We cannot see whether new users reach a useful first moment; only an anonymous daily count exists. | Confirmed | Medium |
| W8 | Many features, no single story. A new user meets budgets, goals, sinking funds, debts, coach, insights at once. | Opinion, from inspecting Home and Settings | Medium |

No new data-loss or wrong-sum defect was found in this run.

## 7. Three ways to position the product

**A. "The private ledger."** No account, no bank login, works offline. *Best case:* owns the privacy-minded niche. *Likely:* a small loyal group; Money Manager already sits here with millions of installs. *Worst:* seen as "one more manual tracker" and dropped when typing gets boring. Not enough alone.

**B. "What is really yours until pay day."** One trusted figure that already has bills, instalments and loan payments taken out, with the working shown. *Best case:* a daily reason to open the app and a clear sentence to tell a friend. *Likely:* strong for salaried people with fixed payments; weaker for irregular earners. *Worst:* the figure is wrong once and trust is gone, which is exactly what sinks PocketGuard. The defence is our line-by-line breakdown and the rule "show nothing rather than guess".

**C. "Family money."** Shared household ledger. *Best case:* strong retention (Goodbudget, Honeydue). *Likely:* needs server sync, accounts and conflict handling; months of work and it weakens the privacy story. Not now.

**D. "Irregular income."** Freelancers, drivers, sellers. *Likely:* real need, but harder maths and no evidence yet. Later.

**Recommendation (Opinion): B as the promise, A as the reason to believe it.** B gives the daily value; A is why a careful person lets the app hold their numbers.

## 8. Is "financial intelligence" the right direction?

Partly. Your PDF is right on three points and I agree: no single health score, local rules instead of AI, forecasts checked against the past. But the app already has about 14 coach rules and several insight types, and review evidence does not show people asking for more advice. They ask for **a number they can trust and less typing**. More rules now would add breadth to a product whose problem is focus. I recommend freezing new coach rules until the core figure works for every pay day.

## 9. Target user, problem, promise

- **Target user (Hypothesis):** an adult in Azerbaijan, paid on a known day, using a card plus cash, with at least one instalment or loan payment, who sometimes runs short before pay day.
- **Problem to own:** "My balance says 400, but how much of it is actually mine?"
- **Promise:** *Know what is really yours to spend until your next income, without giving your bank login to anyone.*
- **Activation moment:** in the first two minutes the user enters what the accounts hold, the pay day and two or three fixed payments, and sees one figure with a per-day amount.
- **Recurring value:** the figure moves as they record; bank notices do most of the typing; pay day resets it; month end shows what was kept.
- **Trust proposition:** data stays on the phone; no account required; every deduction is listed; when the app cannot know, it says so instead of guessing; export at any time.

## 10. Ranked opportunity list

| Rank | Item | Why | Risk | Status |
|---|---|---|---|---|
| 1 | Make Safe to Spend follow the pay cycle, not the calendar month | Fixes W1 and W2; the whole promise rests on it | Changes an established money rule; needs migration thought and many test updates | **Needs your approval** |
| 2 | "Until your next income" card | Removes the blank period now, without touching the rule | Low | **Built and tested this run** |
| 3 | First-run path that reaches the figure in two minutes | Activation | Low | Proposed |
| 4 | Prove the notice reader on a real phone for a week | Typing chore is why manual apps die | Low | Waiting for your phone test |
| 5 | Default account for new entries, or a nudge when an entry has none | Fixes W3 | Low to medium | Proposed |
| 6 | Google Play listing with a proper package name | W4; nobody can install it today | Costs $25 to $30; one-way package rename | **Needs your approval and payment** |
| 7 | Fix bank-CSV amount misreads | W5 | Low | Proposed |
| 8 | "Instalment" as a plain-language entry point to the existing loan plans | Local fit | Low; demand unproven | After interviews |
| 9 | Backup confidence: last-backup date in view, a restore rehearsal | Data-loss fear | Low | Proposed |

**Do not build now (with reasons):** bank connection through open banking (registration, cost, legal duty); AI advisor or chat (competitors' ground, needs a server, weakens privacy); a financial health score (your own PDF argues against it); shared household sync (heavy, off-promise); more coach rules (no demand shown); voice entry (already dropped); monthly e-mail (needs accounts and a server).

## 11. What was built in this run (Run 97)

**"Until your next income" card on Home.** It appears only when all of these hold: Safe to Spend is on, no income is recorded this month yet, at least one account is set up, and the app knows the next income date (from a recurring income or an income entry dated ahead, within 45 days).

It shows: what the accounts hold now, minus payments due before that date (recurring bills and loan payments, including ones already overdue and unrecorded), minus entries dated ahead; then the amount per day, rounded down.

It shows nothing, and the earlier "waiting" card stays, when: there are no accounts, no income date is known, the expected income date has passed without a record, or income is due today.

**Safe to Spend itself is unchanged.** This is an extra figure for the blank period, and a cheap way to test position B with real people before changing the main rule.

**Known limit:** if entries are saved without an account, balances do not fall and the figure is too high. The card's note now says so in all three languages. The real fix is item 5.

## 12. Files changed

- `App.jsx`: new function `calcUntilPay`; release number 97.
- `screens/home.jsx`: the new card; the "waiting" card shows only when the new one cannot.
- `i18n.js`: nine new texts in az, ru, en.
- `tests/logic/run97untilpay.test.mjs` (new), `tests/browser/e2e_run97_untilpay.mjs` (new), `tests/harness.mjs`, `tests/expected-counts.json`.

## 13. Tests actually run

| Check | Result |
|---|---|
| New logic test, 18 checks with hand-worked sums (month end, year end, overdue bill, loan payment, bill paid ahead not counted twice, negative balance, rounding down, all "show nothing" cases) | 18 of 18 |
| All logic tests, `node tests/run-logic.mjs` | 2708 of 2708 in 135 files |
| New browser test in en, az, ru | 10 of 10 |
| Related Home tests: safeheld 8, home 4, run15 35, plain 16, pace 3 | all passed |
| Real build + offline check, `node tests/pwa/offline-check.mjs` | 17 of 17 |

Not done: the full browser suite (per your lighter-verification rule); any check on a real phone; any look at the card by a native Azerbaijani or Russian reader. The first browser run failed two checks because of my own test ordering, not the app; I fixed the test and re-ran.

## 14. Validation plan: 5 to 10 people

Who: people paid on a known day, with at least one fixed payment; mix of ages; at least two who mostly use cash.

Ask (about past behaviour, not opinions about the app):
1. "Tell me about the last time money was tight before pay day. What did you do?"
2. "How do you know today how much you can spend? Show me."
3. "Which fixed payments do you have each month? How do you remember them?"
4. "Have you tried a money app? Why did you stop?"
5. "Would you type your bank password into a money app? Why?"

Then hand them the phone: set up accounts, pay day and two payments. Watch silently. Time it.

Signals that support position B: at least 6 of 10 describe the "is it really mine?" problem unprompted; at least 7 of 10 reach the figure in under 3 minutes; at least half say the figure differs from what they assumed. Signals against: people already get this from their bank app, or do not believe a figure they typed in themselves.

I cannot run interviews. This part is yours; I can prepare a one-page script in Azerbaijani.

## 15. Decisions that need you

1. **Change Safe to Spend to follow the pay cycle** (from pay day to pay day, using what the accounts hold). I recommend yes, after the interviews or after you have used the new card for a week. It changes an established rule, so I will not do it without your word.
2. **Publish release 97.** Your mission text says publishing needs approval, so it is committed locally and not pushed.
3. **Positioning sentence** in section 9: accept, change, or reject.
4. **Google Play account** (payment is yours to make).

## 16. Status and next action

- "Until your next income" card: **IMPLEMENTED BUT UNVERIFIED** on a real device; **VERIFIED** in logic and browser tests.
- Pay-cycle Safe to Spend: **BLOCKED** on your decision.
- Azerbaijan demand for position B: **NOT ASSESSED** (no user evidence).
- Competitor and review study: **VERIFIED** to the limits stated in section 4.

**Next action:** you say "publish" or "wait" for release 97, and answer decision 1. If you say nothing else, my next piece of work is item 5 (entries without an account), because it protects the correctness of the new figure.
