# Run 18 — Azerbaijani / Russian items sent to a native reviewer (NOT changed in the app)
Source: ChatGPT localization review 2026-10-30. Applied in Run 18 (clear, high-confidence, still DRAFT until a native speaker confirms): loan.bank, loan.bankHint, loan.rt.equal, loan.flatReal, loan.estimate, loan.next, loan.markPaid, loan.interestHint, loan.interestInvalid, loan.none, debt.badgeOwed (ru), coach.incomplete, coach.future, coach.owedLate, help.safeNegImpact, an.forecastHow, cmp.window, goals.overdueDays (ru), set.daysToTarget (ru).

| Key / area | Why it was NOT changed | Question for the reviewer |
|---|---|---|
| debt.of (az "{total} məbləğindən") | A fragment after the remaining amount; proposal is a layout change ("remaining / total"), needs a screen check on narrow phones | Which wording reads naturally next to the remaining amount? |
| goals.needSub (az, ru plurals) | Needs a full sentence rewrite with correct Russian plural forms | Natural sentence for "N monthly savings until DATE, counted on the 1st of each month"? |
| goals.savedOf (az "{target} məbləğdən {saved}") | Reversed order; may be better as "{saved} / {target}" | Prefer ratio or sentence? |
| surplus / month.net (az "Qənaət", "Xalis qənaət") | "Qənaət" means savings, but the figure is income minus expenses. Candidates: "Gəlir artığı", "Xalis kəsir", "Gəlir xərclərə bərabərdir" | Which short labels fit and are correct? |
| surplus / deficit (ru "Профицит/Дефицит") | Technical; plain alternative "Доходы выше/ниже расходов" | Which is better for ordinary users? |
| Crash screen wording (en/az/ru) | Suggested text says saved records were not changed. I must first confirm that is truthful for the actual error boundary (a crash before the latest action is saved loses it) | After my check, approve the wording |
| Home 1.1k summaries, 1,050.00 number style | Owner decisions, not translation | — |

Everything else (all ~850 keys and hard-coded text) has NOT been audited by a native speaker: status NOT ASSESSED.
