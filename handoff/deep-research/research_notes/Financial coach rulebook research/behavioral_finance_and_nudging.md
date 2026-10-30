# Behavioural finance and nudge/habit design for a rule-based money coach

Access date for every URL below: 2026-10-30. Label key: PRIMARY = paper/regulator/agency page (read via search abstract or fetched page); SECONDARY = blog, news, aggregator or commentary; INFERENCE = my reasoning, not a finding. Not legal or financial advice. Search tool was rate-limited at times and several sources were seen only as abstracts/search snippets, which is flagged per item. Items I know from background literature but could not source this session are listed under Gaps, not presented as findings.

## (a) Why people mis-track and mis-spend (core concepts)

### Takeaway
Present bias, limited attention, optimism about future tasks, and "ostrich" avoidance of bad news are the best-supported reasons people under-track and drift off budget. Several famous headline effects (loss aversion as a universal law, scarcity-IQ numbers, large nudge effects) are contested or shrink a lot under replication, so the coach should rely on low-risk, modest-effect design and not on strong claims about "what people always do".

### Cited Findings
- Planning fallacy (PRIMARY citation, details SECONDARY): Buehler, Griffin and Ross (1994, JPSP 67:366-381) found people predict their own task completion too optimistically while observers are less biased; people picture future steps and rarely recall how past tasks went. The "37 students, 55.5 days, ~30% on time" numbers came from secondary summaries, not the paper text. — [Buehler et al. 1994 PDF](https://bear.warrington.ufl.edu/brenner/mar7588/Papers/buehler-et-al-1994.pdf); [Wikipedia summary (SECONDARY)](https://en.wikipedia.org/wiki/Planning_fallacy)
- Ostrich effect (PRIMARY): in Vanguard login data 2007-08, account logins fell about 9.5% after market declines; stronger in males and wealthier investors; bond-only investors showed the reverse. Some commentary disputes the "heads in the sand" framing. Relevance: people look away from bad financial news. — [Sicherman, Loewenstein, Seppi, Utkus, "Financial Attention", RFS 2016](https://www.cmu.edu/dietrich/sds/docs/loewenstein/FinancialAttention.pdf); [IDEAS record](https://ideas.repec.org/a/oup/rfinst/v29y2016i4p863-897..html)
- Limited attention to lumpy future expenses causes under-saving; reminders help partly by correcting that. — [Karlan, McConnell, Mullainathan, Zinman, "Getting to the Top of Mind", NBER w16205 / Management Science 2016](https://img.nber.org/papers/w16205)
- Double-entry mental accounting / pain of paying (PRIMARY theory): Prelec and Loewenstein (1998, Marketing Science) propose that the pain of paying interacts with consumption pleasure and plays a self-regulation role. A 2019 Management Science field test on 1.8 million credit-card accounts found debt for non-durable (transient) consumption was about 10 percentage points (absolute) more likely to be repaid than debt for durables, an effect compared to a ~15-point APR rise. This supports mental accounting but is NOT a cash-vs-card experiment. — [Prelec/Loewenstein record](https://ideas.repec.org/a/inm/ormksc/v17y1998i1p4-28.html); [Quispe-Torreblanca et al. 2019](https://eprints.nottingham.ac.uk/54167)
- Fresh-start effect (PRIMARY): Dai, Milkman and Riis (2014, Management Science): gym visits, "diet" searches and goal commitments rise after temporal landmarks (new week, month, year, birthday, holiday). Archival field studies, not randomised interventions. A secondary source reports a later paper (Dai 2018) found resets help people who had been failing but can demotivate those already doing well, unverified by me. — [Dai, Milkman, Riis 2014 PDF](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf); [summary incl. 2018 caveat (SECONDARY)](https://yukaichou.com/behavioral-analysis/fresh-start-effect-dai-milkman-riis-temporal-landmarks/)
- Defaults (PRIMARY): Madrian and Shea (QJE 2001): automatic 401(k) enrolment raised participation substantially, but the default contribution rate and fund became sticky (many stayed at the low default); authors attribute this to inertia and to employees reading the default as advice. I could not confirm the specific percentages (49%/86%) this session. A secondary source reports average contribution fell 2.9% under auto-enrolment. — [NBER w7682](https://www.nber.org/papers/w7682); [Chicago Booth Review (SECONDARY)](https://www.chicagobooth.edu/review/savings-america-helping-individuals-provide-their-own-retirement)
- Implementation intentions ("if situation X then I do Y"): Gollwitzer and Sheeran (2006) meta-analysis of 94 tests reported d = 0.65 on goal attainment; a 2024/25 update of 642 tests reports a wide range (0.27 to 0.66) depending on outcome type. Treat single-number d = 0.65 as an upper-range summary; many tests are small lab/health studies, not money apps. — [KOPS repository entry](https://kops.uni-konstanz.de/handle/123456789/69905); [secondary overview](https://goalsandprogress.com/implementation-intentions-research/)
- Habit formation: Lally et al. (2010) – 96 students, 84 days; median 66 days to plateau but range 18 to an extrapolated 254 days; about half had not reached habit-level automaticity by day 84; occasional missed days did not materially derail it (secondary report). Lally herself says 66 days is not a rule. Replication still thin. — [BPS Research Digest](https://bps.org.uk/research-digest/how-form-habit); [Surrey interview](https://www.surrey.ac.uk/news/does-it-really-take-66-days-form-habit-we-asked-expert-dr-pippa-lally); [critical summary (SECONDARY)](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit)
- Loss aversion is CONTESTED: Gal and Rucker (2018) argue it was overgeneralised and many findings reflect inertia/status-quo preference; Mrkva et al. (2020) reply that it has moderators but exists (mainly for larger losses). A COVID-era online experiment found no difference between gain and loss messages. All via secondary summaries, original papers not read. — [Collins blog summary (SECONDARY)](https://www.jasoncollins.blog/posts/the-case-against-loss-aversion); [reading list (SECONDARY)](https://thebehavioralscientist.com/?p=2813)
- Scarcity (Mullainathan and Shafir): a pre-registered replication of 20 scarcity studies (Nelson and Moore, PNAS per secondary source) found only 4 of 20 significant; the original authors' own self-replication of the cognitive-load result was mixed; the "13-14 IQ points" car-repair claim is the weakest part while the broader idea that scarcity captures attention has partial support. I did not read the PNAS paper. — [Collins, "Replicating scarcity" (SECONDARY)](https://jasoncollins.blog/posts/replicating-scarcity); [self-replication record](https://ideas.repec.org/a/eee/joepsy/v75y2019ipas016748701830309x.html)
- Nudges overall (PRIMARY): across 126 trials (23+ million people) from two US Nudge Units the average effect was 1.4 percentage points (about 8% over control) versus 8.7 points (33.5%) in published academic nudge papers; publication bias plausibly explains most or all of the gap; forecasters overestimated effects while practitioners were well calibrated. — [DellaVigna and Linos, NBER w27594 / Econometrica 2022](https://www.nber.org/papers/w27594)
- Maier et al. (PNAS 2022) argue that after correcting a prior meta-analysis (Mertens et al.) for publication bias, there is no clear evidence of an average nudge effect (true effect could be as low as d = 0.08 under severe bias); Mertens et al. replied that these are "growing pains" and that effects vary by context/domain. I read only summaries. — [Maier et al. in PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9351501); [PsyPost summary (SECONDARY)](https://www.psypost.org/2022/07/re-analysis-of-meta-analysis-reveals-no-evidence-for-nudging-once-accounting-for-publication-bias-63598)
- Design heuristic from BIT: EAST – make it Easy, Attractive, Social, Timely (published 2014 framework, "not a comprehensive account"). — [BIT EAST PDF](https://bi.team/wp-content/uploads/2014/04/BIT-EAST.pdf)

### Inferences
- INFERENCE: Because average nudge effects in the field are small (~1-2 points) and context-dependent, a coach should be built to be harmless when ignored and cheap to run, not to depend on large behaviour change.
- INFERENCE: Manual-entry abandonment is best explained by effort cost plus present bias plus the ostrich effect (a bad week makes opening the app unpleasant). The rules should therefore reduce entry effort first and never make a missing week feel like a failure.
- INFERENCE: Fresh-start timing (start of week/month) is a plausible slot for a summary, but evidence is observational and may be short-lived, so use it for scheduling only, not for intensity of pressure.
- INFERENCE: "If-then" wording (implementation intentions) can be borrowed for suggested actions ("When you get paid, set aside X") but only offered, never imposed.

### Gaps
- Not sourced this session (background knowledge only, do NOT quote without verification): hyperbolic discounting primary papers (Laibson 1997 etc.); anchoring (Tversky and Kahneman 1974); goal-gradient (Hull 1932; Kivetz et al. 2006); the cash-vs-card pain-of-paying experiments (Prelec and Simester 2001; Soman) and their replication status; optimism about own spending; ego-depletion/priming replication failures relevant to Kahneman's book; direct evidence on why manual entry is abandoned (no peer-reviewed study found; only inference).
- The 2018 Dai "resets demotivate winners" finding rests on one secondary blog.
- Exact Madrian and Shea participation figures unconfirmed.

## (b) Which app interventions work, which fail

### Takeaway
Just-in-time alerts tied to a concrete imminent cost (e.g. arranged-overdraft usage) have the best field evidence and produce small, real savings with no measured harm; generic early-warning/low-balance alerts, unpaid-item alerts and generic savings reminders show weak or null effects, and a reminder that fixes one fee can push costs elsewhere for some users. Specific, goal-labelled reminders work better than generic ones.

### Cited Findings
- FCA Occasional Paper 40 (field experiment, 2 UK banks, >1 million customers, Nov 2017-Apr 2018): just-in-time arranged-overdraft alerts reduced charges (about £0.28-0.45 per customer per month in Trial D); early-warning evidence was weak/mixed; low-balance alerts for customers without an arranged overdraft were inconclusive (about -£0.20/month at Bank 1, no effect at Bank 2); unpaid-item alerts showed no reduction; telephone survey: customers mostly responded by using savings, cutting discretionary spending, or informal borrowing, and respondents did not find alerts distracting. — [FCA OP40](https://www.fca.org.uk/publications/occasional-papers/occasional-paper-no-40-time-act-field-experiment-overdraft-alerts)
- Follow-on published analysis: Grubb, Kelly, Nieboer, Osborne, Shaw (Journal of Finance), six largest UK banks, 2017, automatic enrolment in text alerts cut overdraft and unpaid-item charges by 4-19%, benefits concentrated in low-income, frequent and financially vulnerable customers, with no offsetting harm found; alerts were "not a complete solution". — [Boston College news summary (SECONDARY to the JF paper)](https://www.bc.edu/content/bc-web/sites/bc-news/articles/2025/spring/study-shows-text-message-alerts-significantly-reduce-overdrafts.html)
- Side effects: Medina (RFS 2021), Brazilian financial management platform: due-date reminders cut credit-card late fees ~14% but raised checking-account overdraft fees ~9%; users with a history of overdrafts saw net fee increases (about +5%) while others saved about 15%. Abstract-level only. — [Medina, "Side effects of nudging"](https://academicnewsletter.sufe.edu.cn/info/352133)
- Savings reminders: in three bank field experiments (Bolivia, Peru, Philippines) reminders raised savings; reminders naming a specific goal/planned expense lifted savings about 16% (Peru), generic reminders had no measurable effect; gain-vs-loss framing made no significant difference; extra reminders did not add; larger effect (~47%) for time-inconsistent people. — [Karlan et al., NBER w16205](https://img.nber.org/papers/w16205)
- Notifications and fatigue: a 2021 experiment with 17,500 retail-app users across five push frequencies over seven weeks linked higher frequency of non-personalised pushes to more uninstalls and fewer direct opens (retail, not banking). A 2019 vendor-commissioned Leanplum survey of 1,000 US users: top reason for deleting apps is irrelevant notifications; only 13% found financial-app pushes annoying and 49% found financial/banking alerts helpful. — [Credit Union Times on the survey (SECONDARY)](https://cutimes.com/2019/09/12/brands-fail-because-of-noisy-apps-survey/?amp=1); [study listing (SECONDARY)](https://weareaffective.com/learning-centre/how-many-push-notifications-are-too-many-for-app-users)
- Timing: BIT reports prompting at the moment of consequence (court fines, before a bailiff is sent) tripled payment; this is a government-collection setting, not a budgeting app. — [BIT EAST PDF](https://bi.team/wp-content/uploads/2014/04/BIT-EAST.pdf)
- A credit-union balance-reminder pilot (5,200 members) was shut down after a few weeks and yielded no usable results (SECONDARY via a case-study listing). — [Advanced Hindsight case study](https://case-studies.advanced-hindsight.com/case-studies/u5tfY1V4/sending-reminders-to-reduce-money-wasted-on-overdr)

### Inferences
- INFERENCE: Alerts that are tied to a known, user-set threshold (budget limit the user created, a bill the user entered) are closest to the "just-in-time, concrete" design that worked; generic "you spent a lot" tips are closest to the generic alerts that did not.
- INFERENCE: A coach using only the user's own data cannot see their other accounts, so Medina-style displacement (fixing one cost, raising another) is possible; avoid pushing a single-category tightening message without a cushion check.
- INFERENCE: A manual-entry app has a special risk: if the user has not logged for days, "balance/budget" advice computed from stale data would be wrong; silence is better than guessing.

### Gaps
- No peer-reviewed field RCT found on round-ups, streaks, or weekly summaries in this session. Streak/gamification harm and shame/avoidance effects are plausible but I found no sourced RCT.
- No CFPB or Ideas42 field report was opened this session (CFPB financial well-being scale found, see section (d)); YNAB/Monzo/Mint practitioner write-ups not retrieved; the Mint overdraft-warning study mentioned in a search snippet was not verified.
- No study found specific to irregular or low-income users in budgeting apps beyond the Grubb et al. subgroup result and Medina heterogeneity.
- Fatigue evidence is retail or vendor survey, not banking.

## (c) Tone and framing

### Takeaway
Evidence that gain-versus-loss framing matters is weak: the best-controlled money-app trial found no framing difference, and the loss-aversion literature is itself contested. Specificity (named goal, concrete amount) mattered more than emotional framing. Shame/avoidance risk is real (ostrich effect), so bad news should be factual, optional, and paired with a concrete next step.

### Cited Findings
- Gain vs loss framing in reminders showed no significant difference. — [Karlan et al., NBER w16205](https://img.nber.org/papers/w16205)
- Loss aversion contested and likely moderated by loss size; a COVID message experiment found no gain/loss difference. — [Collins summary (SECONDARY)](https://www.jasoncollins.blog/posts/the-case-against-loss-aversion)
- People look at accounts less after bad news (about 9.5% fewer logins after market falls), so negative messaging risks being avoided entirely. — [Sicherman et al. 2016](https://www.cmu.edu/dietrich/sds/docs/loewenstein/FinancialAttention.pdf)
- Survey of FCA alert users: respondents supported alerts, did not find them distracting; opt-out users still supportive; main user responses were practical (use savings, cut discretionary spending). Suggests plain factual alerts are acceptable. — [FCA OP40](https://www.fca.org.uk/publications/occasional-papers/occasional-paper-no-40-time-act-field-experiment-overdraft-alerts)
- BIT EAST includes "Social" (norms), but the framework is a heuristic, not proof that social comparison is safe in money contexts. — [BIT EAST PDF](https://bi.team/wp-content/uploads/2014/04/BIT-EAST.pdf)

### Inferences
- INFERENCE: Because framing evidence is null/contested, choose the framing that is most respectful and truthful (neutral facts + choice) rather than the one "behavioural science says wins".
- INFERENCE: Social comparison ("people like you spend less on food") is risky for a small app: no valid peer data, would be fabricated or unfairly anchored, and can shame low-income users. Do not use it.
- INFERENCE: For low or irregular income users, "save more" advice can be unachievable; messages should refer to the user's own past ranges and never assume a salary or a surplus.

### Gaps
- No plain-language-body guidance (e.g. UK Money and Pensions Service, Plain English Campaign, Azerbaijani/Russian equivalents) retrieved this session. No sourced evidence on how to deliver bad money news; the guidance below is my design judgement.
- No sourced evidence on Azerbaijani or Russian phrasing; needs native-speaker review.
- No study retrieved on shame/anxiety harm from budgeting apps.

## (d) Ethics, explainability, and the advice/information line

### Takeaway
Regulators distinguish general information/guidance from personal recommendation; filtering or steering a specific person toward specific actions based on personal circumstances can cross the line, and the boundary is under review in the UK. Dark patterns are an enforcement focus. An in-app coach should stick to describing the user's own data, state uncertainty, and avoid product recommendations.

### Cited Findings
- UK: the FCA treats a "personal recommendation" as the key advice boundary; general information without a recommended action is guidance. A secondary source reports FCA/ HMT's Advice Guidance Boundary Review and that filtering products by personal factors can be treated as advice. Status as of Oct 2026 not confirmed here. — [FS Forum summary (SECONDARY)](https://thefsforum.co.uk/knowledge-hub/tactic/fca-personal-recommendations-are-the-key-advice-boundary/); [Linklaters note (SECONDARY)](https://financialregulation.linklaters.com/post/102in3w/advice-vs-guidance-and-the-consumer-investments-strategy)
- US: CFPB has treated dark patterns as potentially unlawful and issued Circular 2023-01 (cancellation at least as easy as enrolment). Search noted current CFPB status may have changed under new leadership; I did not verify current force of these documents. — [Kelley Drye summary (SECONDARY)](https://kelleydrye.com/viewpoints/podcasts/ad-law-access/regulators-continue-to-focus-on-dark-patterns-in-negative-option-marketing)
- CFPB publishes a 10-question Financial Well-Being Scale, a possible optional self-report outcome measure. — [CFPB scale user guide](https://files.consumerfinance.gov/f/201512_cfpb_financial-well-being-user-guide-scale.pdf)
- Defaults can be read as endorsement ("advice") by users. — [Madrian and Shea, NBER w7682](https://www.nber.org/papers/w7682)
- Side effects of a nudge can hurt a subgroup (e.g. users with overdraft history). — [Medina RFS 2021](https://academicnewsletter.sufe.edu.cn/info/352133)

### Inferences
- INFERENCE (not legal advice): A rule-based coach that reports the user's own numbers ("food spending is 38% above your 3-month average") is information; one that says "you should move X into a savings product" or names providers is closer to personal recommendation. Keep to the former.
- INFERENCE: Useful disclaimers are specific ("based only on the 14 entries you logged; missing entries make this lower than reality") rather than boilerplate ("not financial advice").
- INFERENCE: Every tip needs a "why am I seeing this" line, a way to mute that tip type, and no hidden data use; all computation can stay on-device, which fits the app's local-storage design.
- INFERENCE: Because defaults act as advice, any default budget/savings amount the app suggests must be labelled as a placeholder.

### Gaps
- EU rules (MiFID II advice definition, GDPR consent/profiling, EU AI Act transparency for automated advice), ASIC and Azerbaijani financial-regulation specifics: not retrieved. Needs a lawyer for any market-specific claim.
- Current (Oct 2026) status of FCA boundary review and CFPB dark-pattern enforcement unverified.

## (e) Books: one-line takeaways and replication status

### Takeaway
The books are useful idea sources, but several specific claims in them have not survived replication. Treat concepts (defaults, friction, present bias, mental accounting) as more robust than named lab effects (priming, ego depletion, scarcity-IQ numbers). Only some of this is verified from sources I opened; the rest is background and marked as such.

### Cited Findings
- Nudge (Thaler and Sunstein): choice architecture, defaults, make good choices easy. Defaults are strongly supported in pensions (Madrian and Shea) but average nudge effects are much smaller in at-scale trials and contested after publication-bias correction. — [Madrian and Shea](https://www.nber.org/papers/w7682); [DellaVigna and Linos](https://www.nber.org/papers/w27594); [Maier et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC9351501)
- Scarcity (Mullainathan and Shafir): scarcity captures attention. Weak replication on cognitive-load/IQ claims; broader attention idea partly supported. — [Collins on replication (SECONDARY)](https://jasoncollins.blog/posts/replicating-scarcity)
- Thinking, Fast and Slow (Kahneman): planning fallacy and the inside/outside view are well grounded (Buehler et al. 1994); loss aversion is debated in its strong form. — [Buehler et al.](https://bear.warrington.ufl.edu/brenner/mar7588/Papers/buehler-et-al-1994.pdf); [Collins on loss aversion (SECONDARY)](https://www.jasoncollins.blog/posts/the-case-against-loss-aversion)
- Atomic Habits (Clear): popularises cue-based habits and implementation intentions; the empirical backbone (Gollwitzer and Sheeran; Lally) supports "cue plus tiny action" but the "66 days" figure is a median with huge spread. — [BPS Research Digest](https://bps.org.uk/research-digest/how-form-habit); [KOPS meta-analysis entry](https://kops.uni-konstanz.de/handle/123456789/69905)

### Inferences
- INFERENCE: The Psychology of Money (Housel) is narrative, not empirical research; use it for tone (humility, avoid moralising), not as evidence. Misbehaving (Thaler): history of behavioural economics; mental accounting, endowment and present-bias concepts are the durable parts. Predictably Irrational (Ariely): popular but has had data-integrity problems around Ariely's other work (not verified here); treat specific experiments with caution.

### Gaps
- I did not retrieve sources on replication status of Ariely's work, Kahneman's priming chapter, or ego depletion; those statements are background-only and should be verified before the report relies on them.
- "Misbehaving" and "The Psychology of Money" evidence claims not sourced.

## Implications for a coach rule

### Takeaway
Build a quiet, factual, user-controlled coach: speak rarely, only about the user's own numbers, only with enough data, offer one small optional action, and always show why. This design is robust to the contested evidence because it does not need large nudge effects to be worthwhile and has little downside if ignored.

### Cited Findings
(Design draws on: just-in-time alerts worked and were welcomed [FCA OP40](https://www.fca.org.uk/publications/occasional-papers/occasional-paper-no-40-time-act-field-experiment-overdraft-alerts); specific goal reminders beat generic [Karlan et al.](https://img.nber.org/papers/w16205); framing showed no advantage [same]; side effects can hurt subgroups [Medina](https://academicnewsletter.sufe.edu.cn/info/352133); frequent non-personalised pushes raise uninstalls [study listing](https://weareaffective.com/learning-centre/how-many-push-notifications-are-too-many-for-app-users); bad news is avoided [Sicherman et al.](https://www.cmu.edu/dietrich/sds/docs/loewenstein/FinancialAttention.pdf).)

### Inferences
Tone guide (INFERENCE; native-speaker review needed for Azerbaijani and Russian):

Do:
- State the fact with the number and the period: "You have spent 240 AZN on food this month. Your usual by this date is about 200 AZN."
- Use the user's own baseline, not a norm. "Compared with your last 3 months."
- Offer one optional step, framed as a choice: "Want to set a food limit for the rest of the month?" with "Not now" and "Don't show this kind of tip".
- Say what you do not know: "Based on 9 entries so far. If some are missing, this may look lower than it really is."
- Celebrate effort neutrally and specifically: "You logged 5 days this week."
- After a gap, welcome back with no blame: "Welcome back. Add what you remember; rough amounts are fine."

Don't:
- No guilt or labels: avoid "You overspent again", "bad habit", "careless", "you should".
- No streak-loss threats ("You'll lose your 12-day streak!").
- No social comparison with other users or "average person".
- No predictions stated as fact ("You will run out of money by the 20th"); use ranges and conditions ("If spending continues at this pace, this could reach about X").
- No product or provider recommendations, no investment suggestions, no "move your savings".
- No fear or urgency language for non-urgent items.

Ten rules for WHEN a tip may be shown (INFERENCE; tune with testing):
1. Silence when data is thin: show no analytical tip until there are at least ~14 days of history and ~15 entries, or ~2 full months for month-over-month tips. Instead show a neutral prompt about logging.
2. Staleness gate: if the last entry is older than 3 days, do not show spending/budget tips (data likely incomplete); show only the welcome-back message once.
3. Maximum frequency: at most 1 tip per day and 3 per week in total; at most 1 per tip type per week.
4. Cooldown after dismissal: if the user dismisses a tip type, do not show it again for 14 days; after 2 dismissals, stop that type until the user re-enables it.
5. Cooldown after action: once the user acts on a tip (sets a limit, adds a goal), do not show that type for 30 days.
6. Only user-set thresholds trigger warnings: a budget-limit tip may appear only if the user created that limit; show once at ~80% and once at 100%, never repeatedly.
7. Timing: show tips inside the app at a natural moment (right after saving an entry, or on opening at the start of a week/month for a summary), not as an out-of-app push unless the user opted in; one optional weekly summary at the start of the week.
8. Bad-news pacing: never show two negative-valence tips in the same session; lead with a neutral or positive fact when both exist; negative tips never appear as the first screen after a long absence.
9. Uncertainty and explainability: every tip shows the data window and count used, and a "Why am I seeing this?" detail; when confidence is low (few entries, highly variable income or spending), downgrade to a descriptive statement or suppress.
10. Respect circumstances: for irregular or low income, never imply a surplus; compare with the user's own range, avoid "save X%" targets unless the user set the goal, and offer a master "Quiet mode / turn off tips" in settings that is always one tap away and honoured immediately.

### Gaps
- The numeric thresholds (14 days, 15 entries, 1/day, 14-day cooldown) are my design defaults; no source gives optimal values. They should be tested with real users before being treated as validated.
- No sourced evidence for the best language for Azerbaijani or Russian users; needs native review and lightweight user testing.
