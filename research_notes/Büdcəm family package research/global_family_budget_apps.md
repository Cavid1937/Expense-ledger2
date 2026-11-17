# Family, couple and household shared-budget features in personal-finance apps (worldwide)

Research date: 17 Nov 2026. Method: web search plus fetching official pages where possible (YNAB Together terms, Zenmoney support, Actual Budget docs, Spendee help, PocketGuard help, CoinKeeper help, T-Bank and Kaspi pages, which were seen through search results). Many price figures come from third-party review sites (often affiliate or SEO sites), so they are marked as such. The BudgetBakers help article returned HTTP 403, so Wallet details come from search excerpts only. Around 16 tool calls were used, so several apps on the list have thin or no coverage; these are named under Gaps.

## 1. How sharing and permissions work, app by app

### Takeaway
Three architectures dominate. (a) **Shared login / shared profile**: everyone signs into one account (Goodbudget, CoinKeeper, PocketGuard, Monefy through cloud files). This is cheap and simple, but there is no attribution and no privacy. (b) **One household, separate logins, equal rights**: Monarch, Simplifi, and Zenmoney, though Zenmoney adds "personal account" privacy. (c) **Owner-plus-members on a shared container** (a wallet, group or budget file) with roles: YNAB Together, Spendee shared wallets, BudgetBakers Wallet groups, Money Lover shared wallets, and Actual Budget. Granular privacy, meaning a choice per account and per transaction of what the partner sees, is rare. Honeydue and Zenmoney are the clearest examples.

### Cited Findings
**YNAB (YNAB Together), primary source: terms page**
- A group has up to six people, and each person has their own YNAB account and login. The group shares one subscription price — [YNAB Together terms](https://www.ynab.com/terms/ynab-together)
- The person who invites becomes the **Group Manager**. The manager pays, invites and removes members, and can see each member's first name, email and *all budgets the member owns or can access*, whatever the sharing settings are. The manager can edit shared budgets — [YNAB Together terms](https://www.ynab.com/terms/ynab-together)
- Members create their own budgets and choose whether to share each one with the group. The creator is the owner and can delete a budget or transfer its ownership. A member can belong to only one group at a time — [YNAB Together terms](https://www.ynab.com/terms/ynab-together)
- Minimum ages: 13 in the US, 16 elsewhere — [YNAB Together terms](https://www.ynab.com/terms/ynab-together)
- Launch announcement — [Introducing YNAB Together](https://www.ynab.com/whats-new/introducing-ynab-together) (the launch date was not captured)

**Monarch Money**
- Members are invited from Settings → Members → "Invite another member for free". The invite arrives by email — [Monarch help: Add Members](https://help.monarch.com/hc/en-us/articles/360048393452-Add-Members-to-an-Existing-Account) (this article is about 1 year old)
- Every member has their own login but the *same* visibility and management rights. According to one third-party review, Monarch does not let you hide accounts or transactions from household members — [getfinny Monarch for couples](https://getfinny.app/blog/monarch-money-for-couples); [Monarch for couples page](https://www.monarch.com/for-couples)
- Someone who already has a Monarch account cannot be invited. They must use a different email or delete their existing account — reported in [search summary of Monarch help/reviews](https://help.monarch.com/hc/en-us/articles/360048393452-Add-Members-to-an-Existing-Account) (not verified word for word)

**Honeydue (couples, free)**
- For each linked account, the owner picks a sharing level: balances and transactions, balance only, or hidden. Individual transactions can also be hidden, for example a gift — [CNBC Select review](https://www.cnbc.com/select/honeydue-budgeting-app-review/); [Experian review](https://www.experian.com/blogs/ask-experian/honeydue-app-review/)
- Sharing is limited to 2 people. Honeydue Joint Banking is described as reservation and waitlist only — [fincomparelab Honeydue review, 2026](https://www.fincomparelab.com/reviews/honeydue-review/) (secondary)
- One reviewer finds hiding whole accounts from a partner "dubious" but accepts hiding single transactions. Another notes hidden transactions are still searchable in the app — [getoutofdebt.org review](https://getoutofdebt.org/106687/review-honeydue-a-personal-finance-app-for-couple-2); [fioney review](https://fioney.com/honeydue-review/)
- Original launch coverage — [TechCrunch, Aug 2017](https://techcrunch.com/2017/08/07/honeydue-is-a-money-management-app-for-couples/?ncid=rss)

**Goodbudget (envelopes)**
- Household sharing works through **one shared login**: partners use the same household email or username and password on their own devices — [moneycrashers review](https://www.moneycrashers.com/goodbudget-review); [theappnote](https://www.theappnote.com/blog/shared-household-budget-apps-which-fits)
- Free plan: 20 envelopes, 1 account, 2 devices, 1 year of history. Premium: unlimited envelopes and accounts, 5 devices, 7 years of history, and US-only bank sync — [learnofchrist Goodbudget review 2026](https://learnofchrist.com/resources/goodbudget); [fincomparelab](https://www.fincomparelab.com/guides/goodbudget-pricing/)

**Spendee (shared wallets), primary source: help center**
- The owner opens a cash wallet, chooses ⋯ → Invite People, and enters an email. The invitee accepts in the app or by email — [Spendee Help: Shared Wallets](https://help.spendee.com/article/224-shared-wallets)
- Only the **owner** needs Plus or Premium — [Spendee Help](https://help.spendee.com/article/224-shared-wallets)
- The owner and guests can add, edit or delete *any* transaction, whoever created it. The wallet always uses the **owner's categories**, and only the owner can change them — [Spendee Help](https://help.spendee.com/article/224-shared-wallets)
- **Bank-connected wallets cannot be shared.** Budgets stay personal: a budget can include a shared wallet, but other members do not see it — [Spendee Help](https://help.spendee.com/article/224-shared-wallets)

**Wallet by BudgetBakers (Group Sharing)**
- Creating and managing a group needs Premium. Members do *not* need Premium. Members can use the shared accounts but cannot add bank accounts or use premium features outside the group. Permissions are managed per member (Menu → Group Sharing → member). Members switch from their personal Wallet to the group's shared Wallet to add entries — [BudgetBakers support: Everything about Group Sharing](https://support.budgetbakers.com/hc/en-us/articles/7149394922002-Everything-about-Group-Sharing) (seen through a search excerpt only, because the fetch was blocked with 403)
- Roles to "view, manage or admin" content — [BudgetBakers privacy policy, 2021](https://www.woolsocks.eu/legal/bb/BudgetBakers_Privacy-Policy_EN_v1.0.pdf) (old; the current role names are unconfirmed)

**Money Lover (shared wallets)**
- Users can create shared wallets with specific people, such as family or coworkers. In 2023 a flaw exposed members' emails and transaction data to other members, and the publisher Finsify fixed it on 27 Jan 2023 — [BleepingComputer](https://www.bleepingcomputer.com/news/security/money-lover-for-android-and-ios-leaked-email-addresses-transactions/)
- Recent versions added budgets for shared wallets (according to store version notes) — [Google Play listing](https://play.google.com/store/apps/details?id=com.bookmark.money&hl=en&gl=US)

**Zenmoney / Дзен-мани (Russia/CIS), primary source: support article**
- The main account invites from More → Shared access by entering an email. The invitee **receives a generated login (their email) and password by email** and must sign in with them, not with Google or Apple ID — [Zenmoney support: Семейный учёт](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr)
- Accounts are **shared by default**. Ticking "Личный счёт" (personal account) makes an account's operations visible only to its owner. Reports show totals of other users' personal accounts, but not their operations. Users have equal rights except over other people's personal accounts. Transfers *into* another user's personal account are allowed — [Zenmoney support](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr)
- Only the main login can add or remove logins. One subscription covers everyone. The full family budget works only in the mobile apps, and the web version is incomplete — [Zenmoney support](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr)
- "Up to 5 users" on a family plan — [a2is.ru catalog](https://a2is.ru/catalog/uchyot-lichnykh-finansov/zen-money) (secondary; the official article does not state a maximum)

**CoinKeeper (Russia/CIS)**
- Family accounting means **one profile used on unlimited devices**: each member installs the app and logs into the shared profile. It is a Premium option, and one Premium subscription covers everyone — [CoinKeeper help: Совместный/семейный учет](https://ruhelp.coinkeeper.me/6dc02654e26540409f32ebe09fd92dd4); [English version](https://enhelpd.coinkeeper.me/Shared-Family-Accounting-of-Finance-f5ffe9a0022840388c6cf761e31cac92)
- The app **cannot show which family member made a transaction** (tags are the suggested workaround) and **cannot limit a member to certain accounts or categories** — [CoinKeeper help](https://ruhelp.coinkeeper.me/6dc02654e26540409f32ebe09fd92dd4)

**Actual Budget (open-source, local-first), primary source: docs**
- Multi-user mode needs an **OpenID provider**. Roles are **Basic** (create budgets and collaborate on others' budgets) and **Admin** (also manages the user directory, can give everyone access to files, and can transfer ownership). Access is granted or revoked per budget file, and the owner is visible and transferable — [Actual docs: multi-user](https://actualbudget.org/docs/config/multi-user/)

**Quicken Simplifi, PocketGuard, Copilot, Rocket Money, Tiller, Lunch Money**
- Simplifi: share access with one other person at no extra cost. One review mentions "Spaces" that invitees can view and edit — [Wall Street Survivor comparison](https://www.wallstreetsurvivor.com/rocket-money-vs-monarch/); [marriagekidsandmoney families list](https://marriagekidsandmoney.com/best-budget-apps-for-families/) (secondary)
- PocketGuard: the official approach is to sign in with **the same login** on different devices, and to create another profile for personal spending — [PocketGuard help](https://pocketguard.com/help/how-to-share-the-access-to-pocketguard-profile-with-another-person/)
- Copilot: sources **conflict**. One says each person needs their own paid subscription and that sharing is impossible if a partner uses Android. Another says a "Magic Link" gives the partner a shared login — [walletgrower Copilot review 2026](https://walletgrower.com/blog/copilot-money-review-2026); [Wall Street Survivor](https://www.wallstreetsurvivor.com/rocket-money-vs-monarch/)
- Rocket Money: partner sharing is Premium, and the product is built around one user — [Wall Street Survivor](https://www.wallstreetsurvivor.com/rocket-money-vs-monarch/) (secondary)
- Tiller: shares through a shared spreadsheet. Lunch Money: "invite collaborators" — [Wall Street Survivor](https://www.wallstreetsurvivor.com/rocket-money-vs-monarch/) (secondary, few details)

**Monefy**
- There is no family wallet. Devices sync through a shared Dropbox or Google Drive, which is cloud file sync rather than a shared-budget feature — [meetmarta Monefy review](https://meetmarta.io/blog/monefy-review-automatic-expense-tracking-and-best-alternatives)

**Bank-side family products**
- **T-Bank (Russia):** a joint account (совместный счёт) can be used by **up to 10 people**. Only the opener can add or remove users or close it. Cashback is paid on it. The "Junior" kids' card is free to issue and run, a second parent or relative can be given access, and the child can open a savings "копилка" whose rate depends on the parent's plan (8% with Pro, 9% with Premium or Private) — [T-Bank family banking](https://www.tbank.ru/sphere/family-banking/); [T-Bank shared account](https://www.tbank.ru/cards/debit-cards/tinkoff-black/shared/)
- **Kaspi (Kazakhstan):** "Kaspi Gold для ребёнка" is an **additional card on the parent's account**, fully controlled by the parent, for children of about 6–16 (sources differ on the age range). It can be topped up only from another Kaspi Gold in the app, not with cash — [Kaspi Guide](https://guide.kaspi.kz/client/ru/gold_for_parent/conditions/q14901); [finratings.kz](https://finratings.kz/news/6818-kaspi-gold-dlia-rebenka-v-2025-godu-polnyi-gid-po-oformleniiu-limitam-i-pravilam/). As of Oct 2026, Kaspi had *no* spouses' joint account. The bank said it had "accepted the proposal" — [digitalbusiness.kz, 2 Oct 2026](https://digitalbusiness.kz/2026-10-02/mogut-li-suprugi-v-kazahstane-polzovatsya-odnim-schetom-chto-otvetili-banki/)
- **Revolut <18:** free with a parent Revolut account (fees apply to some actions). A "Co-Parent" feature lets two adults share visibility and control — [freenance comparison 2026](https://freenance.io/comparisons/greenlight-vs-gohenry-vs-revolut-junior-2026/); [Finder UK](https://www.finder.com/uk/banking/childrens-banking/revolut-junior-review)
- **Monzo:** search results covered only Monzo for Under 16s, which needs the parent to have a personal Monzo account — [freenance](https://freenance.io/comparisons/greenlight-vs-gohenry-vs-revolut-junior-2026/)
- **Greenlight / GoHenry:** see pricing below. GoHenry's US product is now "Acorns Early (formerly GoHenry)" — [choresplit comparison](https://choresplit.com/compare/gohenry-vs-greenlight)

### Inferences
- The Zenmoney model is the closest regional benchmark for an Azerbaijan/CIS audience: shared by default, opt-in "personal account" privacy, equal rights, and one paid seat. CoinKeeper shows the cheapest model (a shared profile) and the gaps users run into with it: no attribution and no per-member restrictions.
- An "always visible to manager" rule (YNAB) or "everything is equal" rule (Monarch) is simple, but it conflicts with the privacy needs that Honeydue was built around.
- Spendee's choice to keep budgets personal and categories owned by the owner, even inside shared wallets, shows one way to avoid conflicting edits to the category structure.

### Gaps
- No primary details were found for **Splitwise, Buddy, Toshl, 1Money, Lunch Money limits, Revolut Joint accounts, or Monzo joint accounts**. These are not covered and should not be guessed.
- The current Wallet (BudgetBakers) role names and member limits are unconfirmed because of the 403.
- Copilot's sharing model is unresolved because the sources conflict.

## 2. Typical feature set (personal vs shared view, privacy, roles, goals, allowances, notifications, settle-up)

### Takeaway
Most apps share a *container* (a wallet, budget or household) and keep budgets either fully shared or fully personal. A per-account privacy flag exists in Zenmoney and Honeydue, and per-transaction hiding in Honeydue only. Formal roles are mostly owner versus member: Actual has Admin and Basic, and Wallet reportedly has view, manage and admin. Child allowances live in bank and kids-card products, not in budgeting apps.

### Cited Findings
- Per-account three-level visibility plus hidden transactions: [CNBC Select on Honeydue](https://www.cnbc.com/select/honeydue-budgeting-app-review/)
- Personal-account flag with totals still shown in reports: [Zenmoney support](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr)
- Switching between personal and shared space: Wallet members must switch to the group's Wallet to add entries — [BudgetBakers support](https://support.budgetbakers.com/hc/en-us/articles/7149394922002-Everything-about-Group-Sharing)
- No attribution of who spent: [CoinKeeper help](https://ruhelp.coinkeeper.me/6dc02654e26540409f32ebe09fd92dd4). A shared login can let one person's session overwrite the other's, with no audit trail — [getfinny couples 2026](https://getfinny.app/blog/best-budgeting-apps-for-couples-2026) (secondary)
- Kids: the parent tops up, monitors spending and can add a second parent (T-Bank Junior, Revolut Co-Parent). Kaspi has parent-only top-ups — [T-Bank](https://www.tbank.ru/sphere/family-banking/); [freenance](https://freenance.io/comparisons/greenlight-vs-gohenry-vs-revolut-junior-2026/); [Kaspi guide](https://guide.kaspi.kz/client/ru/gold_for_parent/conditions/q14901)

### Inferences
- "Settle-up between partners" (Splitwise-style balances) is largely absent from the budgeting apps reviewed. It is a gap that sits between Splitwise and the budgeting apps (not verified for Splitwise itself).
- Spend notifications to a partner were not documented in any primary source found.

### Gaps
- I found no primary evidence about partner spend notifications, shared goals with per-person contributions, or proportional income-based splits in these apps.

## 3. Joining, leaving, member counts and seats

### Takeaway
Joining is almost always **by email invite**. Zenmoney generates a password, and CoinKeeper, Goodbudget and PocketGuard use a shared login with no invite at all. **Usually only one paid seat is needed** (YNAB, Monarch, Spendee owner, Wallet owner, Zenmoney, CoinKeeper). Only YNAB documents in detail what happens when someone leaves.

### Cited Findings
- YNAB, when a member leaves or is removed: their subscription becomes a **34-day free trial**. Budgets they own are unshared but kept in their account. Budgets shared with them are removed from their access, and **bank links they made to those budgets are unlinked**. If the account is deleted, the budgets they own are deleted — [YNAB Together terms](https://www.ynab.com/terms/ynab-together)
- Limits: YNAB 6 people; Honeydue 2; T-Bank joint account 10; Goodbudget free 2 devices / Premium 5; CoinKeeper unlimited devices on one profile — [YNAB terms](https://www.ynab.com/terms/ynab-together); [fincomparelab Honeydue](https://www.fincomparelab.com/reviews/honeydue-review/); [T-Bank](https://www.tbank.ru/sphere/family-banking/); [learnofchrist Goodbudget](https://learnofchrist.com/resources/goodbudget); [CoinKeeper help](https://ruhelp.coinkeeper.me/6dc02654e26540409f32ebe09fd92dd4)
- Only the main login (Zenmoney) or the account opener (T-Bank) can add or remove people — [Zenmoney support](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr); [T-Bank](https://www.tbank.ru/sphere/family-banking/)
- Actual: an admin can transfer budget ownership — [Actual docs](https://actualbudget.org/docs/config/multi-user/)

### Inferences
- For a breakup scenario, the safest documented pattern is YNAB's: each person keeps what they own, shared items are cut off, and bank links are severed. Shared-login apps (Goodbudget, CoinKeeper, PocketGuard) have no clean separation at all. Either person could delete everything.

### Gaps
- I found no source on what happens to a member's entries in a shared wallet after they leave in Spendee, Wallet, Money Lover or Zenmoney.

## 4. Pricing of family and household tiers

### Takeaway
Sharing is usually **included at no extra cost on the paid tier**, and sometimes requires that tier. Kids' card products charge per family each month.

### Cited Findings
- YNAB: about $109/yr for a group of up to 6 (third-party figure) — [stillwareltd](https://www.stillwareltd.com/blog/true-cost-of-ynab/); [getfinny YNAB review](https://getfinny.app/blog/ynab-review-2026)
- Monarch: Core $14.99/mo or $99.99/yr, Plus $199.99/yr. Members are free. The pricing page was checked on 9 Nov 2026 by — [candor.money](https://candor.money/monarch-money-cost)
- Honeydue: free — [CNBC Select](https://www.cnbc.com/select/honeydue-budgeting-app-review/)
- Goodbudget Premium: $10/mo or $80/yr (some sites list $6.99, $9.99 or $79.99) — [learnofchrist](https://learnofchrist.com/resources/goodbudget); [fincomparelab](https://www.fincomparelab.com/guides/goodbudget-pricing/)
- Spendee: the owner needs Plus or Premium — [Spendee Help](https://help.spendee.com/article/224-shared-wallets). Wallet: the owner needs Premium — [BudgetBakers](https://support.budgetbakers.com/hc/en-us/articles/7149394922002-Everything-about-Group-Sharing)
- CoinKeeper and Zenmoney: one subscription covers the family — [CoinKeeper](https://ruhelp.coinkeeper.me/6dc02654e26540409f32ebe09fd92dd4); [Zenmoney](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr)
- Greenlight: $5.99–$19.98/mo, up to 5 kids. GoHenry UK: £3.99, £5.99 or £9.99/mo by tier. Revolut <18 is free with a parent account (some fees) — [freenance](https://freenance.io/comparisons/greenlight-vs-gohenry-vs-revolut-junior-2026/); [choresplit](https://choresplit.com/compare/gohenry-vs-greenlight)
- T-Bank Junior: free to issue and run — [T-Bank](https://www.tbank.ru/sphere/family-banking/)

### Inferences
- The market norm is that sharing is not an extra-cost seat. Charging per partner would be unusual. Copilot (possibly per person) is the exception, and its sources conflict.

### Gaps
- Trial lengths were not verified from primary pricing pages. The only primary trial-related fact is YNAB's 34-day trial after a member leaves.
- Zenmoney and CoinKeeper prices in RUB were not captured.

## 5. Evidence of demand and outcomes (reviews, Reddit, discontinued products)

### Takeaway
No Reddit threads were retrieved; the search returned blog and vendor content only. The recurring themes are **one partner stops logging**, which breaks manual-entry apps, and **forced full transparency**, which drives dishonest logging or quitting. Discontinuations show platform risk: Mint closed on 23 Mar 2024, and Zeta reportedly closed on 9 May 2025.

### Cited Findings
- With manual entry, if one partner stops logging, the shared budget breaks or becomes inaccurate — [budgetvault](https://budgetvault.app/blog/budgeting-app-for-couples-without-bank-sync); [budgetingforcouples.com](https://budgetingforcouples.com/best-budgeting-apps-couples) (vendor or secondary)
- The "number one complaint" is said to be forced full transparency on personal spending. People who feel scrutinized stop logging honestly — [modernhusbands / Pocket Clear](https://www.modernhusbands.com/post/pocket-clear-app-sharing-money-without-sharing-a-bank-login); [macaron](https://macaron.im/blog/budget-app-for-couples-what-to-look-for) (**vendor marketing, low evidence quality**)
- Mint shut down on 23 Mar 2024. Users were moved to Credit Karma, which did not carry over budgeting, categories or bills. Sources differ on the announcement date (Nov 2023 vs Jan 2024) and on user counts (3.6M active vs about 25M) — [NerdWallet](https://www.nerdwallet.com/article/finance/mint-app-closing-what-it-means-how-to-pick-a-new-budget-service); [WalletHub](https://wallethub.com/edu/b/what-happened-to-mint/151868)
- Zeta (a couples app) reportedly closed on 9 May 2025 — single secondary source, found through the search above ([editorialge](https://editorialge.com/best-apps-for-managing-shared-finance/), unverified)
- Money Lover's shared wallets leaked member data in 2023 — [BleepingComputer](https://www.bleepingcomputer.com/news/security/money-lover-for-android-and-ios-leaked-email-addresses-transactions/)
- An app-store rating dispute is claimed for Honeydue ("Beware the Fake 3.4 Rating") — [fincomparelab](https://www.fincomparelab.com/reviews/honeydue-review/) (headline only, not verified)

### Inferences
- Shared features create new **security surfaces** (Money Lover). Member-to-member data exposure needs explicit testing.
- Apps without bank sync must lower the cost of logging for *every* member, or shared budgets decay.

### Gaps
- No direct Reddit or forum quotes, no published adoption numbers for any family feature (for example the share of YNAB subscribers using Together), and no primary source on why Zeta closed or what has changed at Honeydue recently.

## 6. Design patterns worth noting

### Takeaway
The main recurring patterns are: shared-by-default with a personal flag (Zenmoney); per-account visibility levels (Honeydue); owner-controlled container with an owner-owned category tree (Spendee); a switch between personal and group space (Wallet); and ownership with transfer plus clean unlinking on exit (YNAB, Actual).

### Cited Findings
- Personal flag and reports showing totals only for others' personal accounts — [Zenmoney support](https://support.zenmoney.ru/knowledge-bases/2/articles/9-semejnyij-uchyot-dobavlenie-polzovatelej-nastrojka-vidimosti-schetov-i-dr)
- "Shared balances + transactions / balance only / hidden" per account — [CNBC Select](https://www.cnbc.com/select/honeydue-budgeting-app-review/)
- Owner's categories govern the shared wallet; budgets are private to each person — [Spendee Help](https://help.spendee.com/article/224-shared-wallets)
- Explicit switch to the group Wallet — [BudgetBakers](https://support.budgetbakers.com/hc/en-us/articles/7149394922002-Everything-about-Group-Sharing)
- Ownership transfer and per-file access — [Actual docs](https://actualbudget.org/docs/config/multi-user/); [YNAB terms](https://www.ynab.com/terms/ynab-together)

### Inferences
- A "yours / mine / ours" model maps naturally onto Zenmoney's personal and shared accounts plus Honeydue's balance-only middle level. A "balance only" level lets a partner contribute to household net worth without exposing spending details.
- Showing *who* entered each item is a cheap fix for CoinKeeper's documented gap, and it helps the "partner stopped logging" problem become visible.

### Gaps
- No primary evidence was found for proportional (income-based) split features in the apps reviewed. This should be researched separately (Splitwise, Honeydue bill splitting).
