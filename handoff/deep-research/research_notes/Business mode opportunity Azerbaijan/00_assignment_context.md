# Assignment context (written by the coordinator, 2026-10-28) — read first

Product: "Expense Ledger / Personal Financial OS" — a local-first React/Vite PWA (+ Capacitor Android build) for personal finance in Azerbaijan (az/ru/en). Data lives in browser storage under the permanent key `expense_ledger_v5`; there is no backend, no accounts, no analytics. Personal users must never be forced into business workflows. Release target for the PERSONAL app: 20 Nov 2026 (correctness, backup/recovery, Android verification come first). Maintainer: one non-programmer owner assisted by AI; tight budget.

The owner's clarified intent: business support, if built, is an OPTIONAL offer/workspace the user chooses (personal, business, or both only if safely supported). Cashera is a direct competitor for this use case. The question is NOT approved scope: it is a research-and-decision task. The report must be willing to say "do not build", or "build only a narrow companion", or "separate beta later".

A ChatGPT independent review (28 Oct 2026, same date) already concluded: keep the opportunity open; do not rush a business module into the 20 Nov candidate; validate a narrow segment first (freelancers, individual entrepreneurs, simple owner-operated microbusinesses — not "all SMEs"); options are A (personal-first, research only), B (opt-in local-first single-user Business Lite), C (opt-in cloud multi-user workspace), D (full accounting/ERP/POS/payroll — not recommended); local legal claims need qualified review; generated PDF invoices must never be called official e-qaimə. Treat those as inputs to test, not as facts.

## Required output: SEVEN parts, each a self-contained, substantive, linkable section
Start each part with a level-1 heading exactly in this form (they will be split into separate Notion pages):
1. `# PART 1 — Business Mode Market & Competitor Research`
2. `# PART 2 — Business User Needs & Workflow Requirements`
3. `# PART 3 — Optional Business Workspace UX & Product Decision`
4. `# PART 4 — Architecture, Data Integrity & Security Decision Record`
5. `# PART 5 — Azerbaijan Accounting, Tax, Invoice, POS & Privacy Feasibility`
6. `# PART 6 — Business Mode Go/No-Go & Prioritized Roadmap`
7. `# PART 7 — Claude Business Mode Research Completion Report`
Avoid empty shells. Every part cites source URL, publisher and date; marks each claim as FACT (official/primary), VENDOR CLAIM, REVIEW (user evidence), SECONDARY, INFERENCE or NOT ASSESSED; and states what was not assessed. Never invent interviews, tests or demand. Use the status labels NOT ASSESSED / NEEDS WORK / IMPLEMENTED BUT UNVERIFIED / VERIFIED / BLOCKED / DEFERRED WITH REASON where a status is meant.

## Weighted decision rubric (100%) — to be applied in PART 6 with evidence and confidence per criterion
Problem severity/evidence 20%; competitive relevance/differentiation 15%; reachable users/willingness to pay 15%; fit with optional user choice 10%; financial correctness/data integrity 15%; security/privacy/legal feasibility 10%; time/cost/maintainability/20 Nov impact 15%. Scores are aids, not objective truth. Score each option (A, B, C, D, and any evidence-supported alternative such as an export/accountant-companion tool) and give best/base/downside scenarios, the go/no-go threshold, and the evidence that would change the recommendation.

## Required content checklist
- PART 1: Cashera (features with dates, pricing, privacy labels, release speed), other Azerbaijani apps, bank business apps, ERP/POS, international benchmarks and pricing; vendor claims vs release notes vs hands-on (none done) vs independent evidence.
- PART 2: segments (solo/IE, micro owner-operated, small/medium), jobs-to-be-done, workflows table (separation, cash/bank/cash boxes, income/expense, customers & amounts owed, suppliers & bills, owner/partner money, reports, accountant hand-off, backup/history/trust, multi-user), pain-point ranking with evidence quality, substitutes, willingness to pay (NOT ASSESSED if none), validation plan (10–15 owners + 3–5 accountants, paid-pilot test, 5 observed task sessions) as a PLAN only.
- PART 3: first-run and existing-user journeys for Personal / Business / Both; separate workspace, navigation, reports, data scopes; active-context indicator; safe switching; owner-paid business costs and withdrawals; localization az/en/ru; accessibility; empty/error states; backup/export/deletion; transparent pricing; defaults for existing users must not change silently. State a decision (including "not now").
- PART 4: option comparison A–D (+ alternatives) on data model (workspace identity, accounts/cash boxes, transfers, invoice lines, payment allocations, receivables/payables, owner capital/draws, reversals, currencies, audit history), storage/migration/restore (preserve `expense_ledger_v5`; never change the personal schema to "prepare"), sync/conflicts, security (tenant isolation, roles, invitation/revocation, file storage, encryption, recovery, incident response), operating cost at 100/1,000/10,000 users, effort ranges (mark INFERENCE) and risk to 20 Nov. End with a decision record (decision, status, consequences, what would reverse it).
- PART 5: separate internal records/commercial invoices, e-qaimə, fiscal POS/NKA, tax filing, statutory accounting, payroll, payment processing, Open Banking; what claims the app must avoid; what needs a qualified Azerbaijani accountant/lawyer (include the question list for the owner to send).
- PART 6: weighted scoring table, scenarios, recommendation, roadmap (what can run in parallel, what must wait for correctness/migration/recovery/device gates; belongs in current target / separate beta / later), milestones, dependencies, acceptance criteria, stop conditions.
- PART 7: what was inspected, how the research was done (5 parallel researchers + coordinator; list the notes files), the quality and gaps of the evidence (be blunt: fetch tools returned summaries; several sources unread; Google Play pages truncated), the open questions, exact next actions for the owner and for the next Claude run, and an honest confidence statement.
Write for a non-programmer owner; plain language; no marketing tone.
