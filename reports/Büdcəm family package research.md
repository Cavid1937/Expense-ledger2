# Serve the household before syncing phones

*Research report, 17 November 2026. Desk research only. Nothing was built, installed or bought. Sources are linked inline. "Owner-supplied" means material the owner gave us that we could not check on a public page.*

Büdcəm's "Ailə paketi" (Family plan, sold as "Ailəm") is a server-based shared space for **up to 5 people (1 owner + 4 members)**. Members join by invite link. Each member needs their own Büdcəm account, which uses a phone-number login. Personal entries stay private unless shared. The owner controls permissions. It costs **$2.99/month or $24.99/year**, against $1.99 / $17.99 for the personal plan. The app is only about four weeks old, has 22 App Store ratings, and has a public complaint about "many bugs". Around the world, family features take one of three forms: a shared login, one household with equal rights, or an owner who controls a shared space. The best privacy models are Zenmoney's "personal account" flag and Honeydue's per-account visibility levels. The research on households points the same way. Couples who pool money do better. About a third of partners keep some money secret. The second partner often stops logging. Shared money tools are used for control and abuse. For Expense Ledger, this means **the cheapest and safest high-value step is not syncing phones**. It is making the app good at the most common real case: **one person keeping the household's books**, with "for whom / paid by", shared-or-personal tags, household loans and bills. Phone-to-phone sync should wait until interviews show that both partners want to log on their own phones. If it comes, it should use end-to-end encryption, not a readable server copy. The owner said "don't build anything yet", so the report ends with ranked options, a recommendation, and the cheapest checks to run first.

## Büdcəm sells a 5-person shared space with permissions, run on its own servers

**Who and how big.** Büdcəm is made by Kodivo Tech MMC ([budcem.az](https://budcem.az)). The App Store seller is an individual, Agshin Hajizada. Version 1.0 came out on 19 October and version 1.0.4 on 5 November. It has **4.8 stars from only 22 ratings** ([App Store](https://apps.apple.com/az/app/b%C3%BCdc%C9%99m/id6807151015)). Only four written reviews are visible. One, from about 16 November, praises the bank-notification capture but reports "many bugs" and category changes that do not save. One positive reviewer shares the seller's surname, so the high average is weak evidence. We found no press coverage, funding or social media accounts. **We could not see any Google Play numbers**: the Play page did not load for our tools. Installs, Android rating, permissions and the "Data safety" section are all unknown.

**What the Family plan includes (public sources).** The terms allow **5 people in total**. The owner creates the family space, invites people and removes them ([terms](https://budcem.az/terms.html)). People join by **invitation link**, and the terms warn users to share links only with people they know. Members can add to the family budget. What else they can manage depends on **the owner's permission settings**. The privacy policy says family entries are visible to members "within their access level". **Personal entries are not shown to the family automatically.** The owner may have broader access. A permission controls whether others see a member's full salary or only the amount given to the family ([privacy](https://budcem.az/privacy.html)). A member who leaves keeps their personal budget and loses access to shared data. If the owner stops paying, members may lose the family space but keep their personal budgets. The website also lists "family panel and member balances" and push notifications for family members, and says Family includes everything in the personal plan ([budcem.az](https://budcem.az)).

**What only the owner-supplied ad shows (17 Nov 2026, not verified).** The ad shows several things no public page confirms:

- two budgets in one app, with a switch at the top
- the line "Kim nəyi görür — sən seçirsən" ("you choose who sees what")
- adding and removing members
- shared goals ("Ortaq hədəflər") and limits
- loans, cash and cards on one family panel
- hiding the family panel from children

**What is still unknown.** We do not know the names of the permission toggles. We do not know whether a member can be "view only", whether invite links expire, or how the family panel gets its numbers. Most likely each member types entries by hand or captures their own bank notifications: Büdcəm has **no direct bank connection** to any Azerbaijani bank. **The trial length is unresolved.** The website and the ad say 7 days free. An App Store release note says "a 24-hour free trial for new users". It is also not stated what, if anything, works without paying.

**How it works underneath.** Everything runs through Büdcəm's servers. Login is a phone number plus SMS code (OTP, a "one-time password"), or Apple/Google sign-in. When switched on, bank notifications are sent to their server to pull out the amount, merchant, last card digits and balance. AI work goes to Google Gemini and to Anthropic, and data "may be processed outside Azerbaijan" ([privacy](https://budcem.az/privacy.html)). Their app shows a "No internet – changes will be sent later" banner. That fits a server-first design (owner's screenshots, 8 Nov).

| | Büdcəm Personal | Büdcəm Family | Cashera Plus Family |
|---|---|---|---|
| Price | $1.99/mo, $17.99/yr | $2.99/mo, $24.99/yr | 7.99 ₼/mo, 59 ₼/yr |
| People | 1 | up to 5 | 2–5 |
| Billing | Apple / Google, USD | Apple / Google, USD | bank card, AZN |
| Sharing model | — | owner sets permissions; personal entries private | shared group, expenses visible to all at once |

Sources: [App Store](https://apps.apple.com/az/app/b%C3%BCdc%C9%99m/id6807151015), [budcem.az](https://budcem.az), [cashera.app](https://cashera.app). At about 1.70 AZN per USD, Büdcəm Family is roughly 5.1 ₼/month. That undercuts Cashera. Cashera also offers **free split groups of up to 5 people** with "who owes whom".

## Other apps share in three ways, and the good ones protect personal money

**Three designs.** Around the world, apps share in one of three ways.

- **Shared login.** Everyone signs into one profile. Goodbudget, PocketGuard and CoinKeeper do this. It is cheap. But CoinKeeper's own help pages admit it **cannot show who made an entry** and **cannot limit a member to certain accounts** ([CoinKeeper help](https://ruhelp.coinkeeper.me/6dc02654e26540409f32ebe09fd92dd4)).
- **One household, separate logins, equal rights.** Monarch is the example. According to one review, nothing can be hidden from the partner ([getfinny](https://getfinny.app/blog/monarch-money-for-couples)).
- **An owner plus members in a shared space.** YNAB Together allows up to 6 people, each with their own login. The Group Manager can see every budget a member owns or can open, whatever the sharing settings say ([YNAB terms](https://www.ynab.com/terms/ynab-together)). In Spendee, only the owner pays. Guests can edit any entry, and the shared wallet uses the owner's categories. **Wallets linked to a bank cannot be shared**, and budgets stay personal ([Spendee help](https://help.spendee.com/article/224-shared-wallets)).

**The privacy designs worth copying.** Zenmoney, the regional benchmark for Russian-speaking users, shares accounts by default. A "Личный счёт" (personal account) tick makes one account private. Reports then show only that account's total to others, never its entries ([Zenmoney support](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr)). Honeydue lets each person set every account to one of three levels: "balances and transactions", "balance only" or "hidden". Single entries, such as a gift, can also be hidden ([CNBC Select](https://www.cnbc.com/select/honeydue-budgeting-app-review/)). Only YNAB documents what happens when someone leaves. Each person keeps what they own. Shared items are cut off. Bank links to shared budgets are removed ([YNAB terms](https://www.ynab.com/terms/ynab-together)). **The norm is that sharing costs nothing extra.** One paid subscription covers the family at YNAB, Monarch, Zenmoney and CoinKeeper.

**Sharing creates new ways to leak data.** In 2023, Money Lover's shared wallets exposed members' e-mail addresses and transactions to other members ([BleepingComputer](https://www.bleepingcomputer.com/news/security/money-lover-for-android-and-ios-leaked-email-addresses-transactions/)).

**Banks in Azerbaijan sell child cards, not household budgets.** Leobank's Uşaq kartı is for ages 7–18. Parents get limits, live alerts, category blocking and a ban on cash withdrawal ([Leobank FAQ](https://leobank.az/az/faq/kids-card); [ena.az](https://ena.az/az/news/id-67068)). It reached **20,000 users by August 2026** ([fed.az](https://fed.az/az/bank/leobank-usaq-karti-istifadecilerinin-sayi-20-000-e-catdi-263025)). ABB offers a similar Alpha Card for ages 7–17 ([apa.az](https://apa.az/maliyye/abb-alfa-nesli-ucun-alpha-card-mehsulunu-teqdim-edib-896355)). No Birbank/Kapital Bank family product was found. In short, banks answer "the parent controls the child's card". Büdcəm and Cashera answer "the household sees shared money". **No one offers a view of family money across several banks**, except through manual entry or notification capture.

## Households need a shared pot, private money, and protection from each other

**Pooling helps, and secrecy is normal.** The largest study of couples' money found that couples who pool all their money are more satisfied and less likely to break up. The study had six parts and **38,534 people**. The effect was strongest for low-income or stressed couples, and it held in collectivist cultures too ([CU Boulder summary of Gladstone et al., 2022](https://www.colorado.edu/business/faculty-research/2022/12/10/pooling-finances-and-relationship-satisfaction)). Secrecy is also common. **40% of US adults living with a partner** admit "financial infidelity", meaning hidden spending, secret debt or a secret card ([Bankrate, Jan 2025](https://www.bankrate.com/press-releases/40-of-u-s-adults-in-live-in-relationships-have-committed-financial-infidelity/)). In Australia the figure is 27% ([Finder, 2025](https://www.finder.com.au/news/1-in-4-hide-money-from-partners-2025)). Both facts lead to the same design: make a shared household pot the easy path, and keep a personal area that is truly private. If an app forces everyone to see everything, people will log dishonestly or quietly use a second app.

**The most common failure is that the second person stops logging.** Users report this again and again. One person tracks. The other never starts, or stops. The shared budget then becomes wrong. On r/ynab, couples describe how they cope: they avoid making the non-tracking partner log anything, settle up at month end, or estimate the partner's spending ([r/ynab thread](https://redlib.ssps.io/r/ynab/comments/1l4apg8/how_do_you_budget_with_a_partner_who_doesnt_use)). This evidence is anecdotal but consistent. It matters more in Azerbaijan. Western apps fill the gap with automatic bank sync. Here, **only about 49% of adults had a debit card in 2024** ([Findex via statbase](https://statbase.ru/data/aze-debit-card-ownership/)), so **cash must be a normal entry type**. Typing every entry is the burden. A family feature that needs two people to type everything is the design most likely to be abandoned.

**Shared money tools are used for abuse.** UK researchers and the charity Surviving Economic Abuse found that banking products are "weaponised" by abusers. They propose a "safe mode" and separate checks for joint accounts ([Northumbria, Dec 2025](https://newsroom.northumbria.ac.uk/pressreleases/report-calls-on-the-uk-banking-industry-to-consider-interventions-that-design-out-economic-abuse-3422784.pdf)). A large study of US consumer complaints found 513 cases of financial abuse by an intimate partner ([Bhattacharya et al., CHI 2024](https://arxiv.org/abs/2403.13944)). Spyware research shows that ordinary "dual-use" apps are repurposed to watch partners ([Chatterjee et al.](https://www.cs.cornell.edu/~rahul/papers/IPV_Spyware.pdf)).

For Expense Ledger, this sets **five rules that are requirements, not extras**:

1. Personal space is private by default.
2. Any member can leave on their own and keep a copy of their own data.
3. Nobody can watch silently: everyone sees who is in the household and what is shared.
4. No member can limit another member's money.
5. Hiding something on screen is not protection if the data is already on that phone.

**Azerbaijani realities, and what we do not know.** The only data on who decides at home is an **attitude survey from 2010**. It asked about household decisions in general, not money. 73% said a man should be the main decision-maker ([Caucasus Barometer 2010](https://caucasusbarometer.org/en/cb2010az/GENDECI)). That is too old to design around. But it is a reason **not** to build a "head of household sees everything" mode. Such a mode could strengthen existing control.

Other facts that shape the design:

- **Debt:** consumer loans were about 8.7 billion AZN in April 2025 ([Trend](https://www.trend.az/business/4027022.html)), and credit-card loans cost about 25% a year ([Trend](https://www.trend.az/business/4049950.html)). So "who pays which kredit this month" is a likely household need.
- **Income:** the average salary is about **1,174 ₼ a month** (first half of 2026, [stat.gov.az](https://stat.gov.az/source/finance/?lang=en)). Budgets are tight.
- **Remittances:** money sent from relatives abroad was over $1 billion in 2024, mostly from Russia ([Report.az](https://report.az/en/amp/finance/cba-reveals-volume-of-money-transfers-to-and-from-azerbaijan-in-2024)). This is a separate, irregular kind of income.

We found **no Azerbaijani evidence on any of these**:

- who records the household's expenses
- pocket-money habits
- whether partners or elders would accept being seen
- whether anyone will pay for a family feature

Every local assumption above is a hypothesis until households are asked.

## Real phone-to-phone sharing changes the app's cost, legal duties and privacy promise

**Today's promise.** The privacy page says the app "works without an account (an account is optional)". It says, "Without an account, nothing from your ledger is sent to us." An optional Google sign-in stores a full copy of the ledger on Expense Ledger's Supabase server in Frankfurt. Only that account can read it (`public/privacy.html`, lines 81–96 of the English text). **Every family option should be judged against this promise.**

**What syncing two phones requires.** The project already has a merge tool, `syncMerge.js`. Its own header says it is **not wired into the app**. Entries are not yet stamped with an `updatedAt` time. Deletions are not kept as "tombstones" (small markers that say "this was deleted", so a deleted entry does not come back from another phone). The tool also trusts the phone's clock, and phone clocks drift. Actual Budget, the closest open-source example, uses a "hybrid logical clock" (HLC) for this. That is a clock that combines real time with a counter, so the order of changes stays correct even when phone clocks disagree ([Actual docs](https://actualbudget.org/docs/getting-started/sync/)). Even Actual advises against two people using one file at the same time.

For money, the rules should be:

- merge whole entries, so one entry never gets an amount from one phone and a currency from another
- always recompute balances from entries
- show "deleted by X, edited by Y" instead of quietly picking a winner
- warn about likely duplicates when both partners log the same purchase

**Cloud and server choices, and what they cost.** Three paths exist, and each has a catch.

- **The partners' own Google Drive.** The app's current Drive backup cannot simply be shared. Files in Drive's hidden app folder **cannot be shared at all**; Google's API rejects it ([Google Drive docs](https://developers.google.com/workspace/drive/api/guides/appdata)). A shared Drive file would need a broader Drive permission and Google's review. Two phones writing one file also race each other. Money Manager Ex shows exactly that failure ([MMEX forum](https://forum.moneymanagerex.org/viewtopic.php?p=14264)).
- **Our own server.** Supabase's free tier allows 500 MB and pauses after a week of no use. The paid plan starts at **$25/month** ([Supabase pricing](https://supabase.com/pricing)). The server could read the family's financial data.
- **End-to-end encryption.** Data is locked on the phone, and only household members hold the key. Tools like Jazz and Evolu can do this, but they are young. Removing a member stops them seeing new data. **It cannot take back what they already received** ([Jazz docs](https://jazz.tools/docs/react/reference/encryption)).

**Do not copy Büdcəm's phone-number login.** SMS codes to Azerbaijani networks cost **$0.25–$0.47 per message** ([Plivo](https://www.plivo.com/sms/pricing/az/)). 10,000 logins a month would cost about $3,500. Invite links or QR codes, or the Google sign-in the app already has, cost nothing.

**Legal duties (a lawyer must confirm all of this).** A purely on-phone app is mostly a tool. A server that stores and shows one person's data to another probably makes the owner an "operator" under Azerbaijan's Law on Personal Data. That may require **registering, or even licensing, an information system**. Sources disagree on which ([DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ); [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan)). Other duties would apply too:

- written consent that names the purpose, the data, how long it is kept, and how to withdraw
- rules for sending data abroad (the server is in the EU)
- care with sensitive categories: family spending can reveal health, religion or "family life"

This question may already be live. Today's optional account stores personal ledger data on a server abroad, so the operator, registration and cross-border questions may apply now, not only if family sync is built (lawyer must confirm). A new data protection law was drafted in October 2025, and we do not know if it was adopted ([Report.az](https://report.az/en/ict/azerbaijan-updates-law-on-protection-of-personal-data)). Sharing budget records does not move money. Payment-service licensing therefore most likely does not apply. That changes if the app ever pulls balances directly from banks, which counts as an "account information service" under CBAR law ([CBAR law](https://uploads.cbar.az/assets/Law%20of%20the%20Republic%20of%20Azerbaijan%20on%20payment%20services%20and%20payment%20systems_Sep_2023_KR%20(002).pdf)).

**Google Play rules if the family tier is paid on Android.**

- **Use Play Billing.** Azerbaijan has no alternative-billing option, and the app may not point buyers to a cheaper web payment ([Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)).
- **Fee:** auto-renewing subscriptions here carry a **15% fee** ([Play fees](https://support.google.com/googleplay/android-developer/answer/112622)).
- **Trials:** the trial length, the charge and how to cancel must all be shown up front ([Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533)).
- **Account deletion:** once accounts exist, deletion must work both in the app and through a web link ([account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)).

**Money benchmarks.** Across 115,000 apps, freemium apps convert only **about 2%** of users by day 35, and longer trials convert better than short ones ([RevenueCat 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)). A family tier would earn money only if it is clearly worth it. A 7-day trial is short for a feature where you first have to persuade a partner to join.

## Ranked options, from doing nothing to full shared accounts

The table below runs from the cheapest option to the most ambitious. Effort figures are estimates for one developer working with AI help. Running costs for 10k and 100k families are rough projections from published price lists, not quotes.

| # | Option | What the user gets | Value | Running cost (100 / 10k / 100k families) | Effort | Main risk | Effect on privacy promise |
|---|---|---|---|---|---|---|---|
| 0 | Do nothing | Personal app only | None for families | $0 | 0 | Büdcəm/Cashera own the "family" story | Unchanged |
| 1 | **One-person household ledger** | One phone keeps the family's books. Each entry gets "for whom / paid by" (Me, Spouse, Child, Parents, Household) and a shared-or-personal tag. Household loans, kommunal (utility) bills and pocket money appear in one view. Summary by person | High if one person really tracks (hypothesis); fits the "second partner stops logging" evidence | $0 / $0 / $0 | ~2–4 weeks (estimate) | Users may expect real sharing; risk of clutter in a simple app | Unchanged: no new data leaves the phone |
| 2 | Read-only household summary | Option 1 plus a monthly family summary (image/PDF) sent through the phone's share sheet, with private items left out | Medium: partner sees the picture without logging | $0 | 1–2 weeks | A stale copy; the sender chooses to share it | Unchanged: the user sends it on purpose |
| 3 | File or QR exchange with merge | Partners swap a household file now and then; the app merges it and flags duplicates. Only the shared accounts are exported | Medium: both can log, no account | $0 | 3–6 weeks (stamping, tombstones, clock fix, merge screen, tests) | People forget to sync; merge mistakes in money data | Kept: no account, no server |
| 4 | Shared file in Google Drive | Automatic-ish sync through a file the partners share in Drive | Medium | $0 to us | 4–8 weeks + Google review | Two phones overwrite each other; every member needs Google; cannot reuse today's hidden folder | Weakened: Google holds a shared file; broader Drive permission |
| 5 | Server family sync with accounts (Büdcəm/Cashera model) | Live shared space, roles, invites, push alerts | High if demand is real | $0* / ~$25–50 per month / ~$100–1,000 per month | 2–4 months | Server can read family data; legal registration; abuse surface; account deletion duties | **Much weaker**: the same readable-server model as today's optional account, but now one person's data is shown to others |
| 6 | End-to-end encrypted group sync | Like 5, but the server sees only locked data; invite by QR/link, no phone login | High, and a real point of difference | Relay ~$0–20 per month | 3–6+ months | Young libraries; a lost key means lost data; removed members keep old data | Mostly kept: we cannot read it, but data does leave the phone |

\*Supabase Free pauses after a week of inactivity, so it does not suit a live product. Option 5 does not start from zero: Google sign-in and a Supabase account store already exist. That lowers its effort somewhat but does not change its risks.

**Recommendation.** When the owner gives the go-ahead, **build Option 1 first, with Option 2 as a small add-on**. Do not copy Büdcəm's server model (Option 5). There are four reasons:

1. **It matches the most common pattern.** One person keeping the books is the most frequent arrangement in the user reports. The biggest failure of shared apps, the second partner who stops logging, cannot hurt it.
2. **It costs nothing and keeps the promise.** It costs $0 to run and needs no account and no Play billing. It sends no new data to any server and adds no new legal duty.
3. **It meets local needs.** It covers cash, household loans and kommunal, which are the needs the Azerbaijani data supports best.
4. **It leaves the door open.** It can be built so that Option 3 or Option 6 can follow later. The steps are to stamp each entry with a change time, keep deletion markers, and move the merge tool to a hybrid clock. That work is reusable and does not lock in a server.

Option 1 should stay free. A paid family tier only makes sense when it includes real syncing between phones. If the owner later wants live sharing, **go to Option 6 (encrypted), not Option 5**. Option 5 would turn Expense Ledger into a less polished copy of two existing apps and give up its one clear difference.

**What would change this recommendation.** Three findings would change it:

- **Partners want their own phones.** If interviews show that in at least half of the households both partners want to log on their own phones, then real sync (Option 3, then 6) moves up.
- **Büdcəm Family takes off.** If Büdcəm's Family plan shows real traction (many Play installs, reviews that talk about family use), the market is proving demand that we only assume today.
- **People will pay.** Clear willingness to pay about 3–5 ₼ a month for sharing would justify the 3–6 months Option 6 needs.

On the other side, if interviews show that partners or elders would use shared visibility to watch others, the safety rules become even more central. Live sharing might then not be worth offering at all.

**Cheapest checks first.**

1. **Büdcəm's Play listing (free, about 15 minutes).** The owner opens the listing on his Poco phone and takes screenshots of:
   - "About this app" (installs, last update)
   - "Data safety"
   - "App permissions"
   - the newest reviews

   If he is willing to start a free trial, he can also screenshot the Family screens: the permission toggle names, the invite flow and the family panel. That would answer most of the open questions in the first section. A Play trial usually needs a payment method and renews automatically. He should cancel it in Play → Subscriptions before it ends.
2. **Household interviews (free, 1–2 weeks).** Talk to **8–12 households in Azerbaijani and Russian**, in Baku and one region. Include young couples, families with children, and households where several generations live together. Ask:
   - Who records the money today, and how?
   - Would your partner log on their own phone?
   - What would you never want your partner, parents or children to see?
   - Which shared bills and loans cause arguments?
   - Would you pay for sharing, and how much?
3. **A lawyer (paid, only if Option 5 or 6 goes ahead).** Ask an Azerbaijani lawyer about the registration duty, consent wording in az/ru/en, and sending data abroad. Do this before any family data reaches a server.

## Conclusion

The research changes the question. "Should we build a family package like Büdcəm's?" turns out to be the wrong question. The useful one is "who in an Azerbaijani household actually keeps the books, and what do they need?" Büdcəm's package is a reasonable first version of a Western-style shared space. But it is weeks old, has few users, is described as buggy, and is built on phone logins, readable servers and AI vendors. Expense Ledger differs where it counts: no account by default, no phone login, and no AI vendor receiving data. (Its optional account copy is still readable by the server operator.) The evidence on households suggests that a well-designed single-keeper ledger, private by default and honest about cash and debts, may serve more families than a shared screen that a second partner never opens. That needs testing with households. Until interviews say otherwise, Expense Ledger's privacy promise works as a competitive advantage as well as a limit.
