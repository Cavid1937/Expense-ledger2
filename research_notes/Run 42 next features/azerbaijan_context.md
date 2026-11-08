# Azerbaijan consumer-finance context for Expense Ledger (research notes)

Prepared 2026-11-08. Method: web search only (WebSearch returns summaries; I did not open primary pages, and the tool is US-only so Azerbaijani-language sources are under-represented). Instruction file `deep-research/references/researcher.md` was NOT found at the given path, so I used a plain evidence-grading method (CONFIRMED / WEAK / UNVERIFIED). Nothing here is legal advice.

Evidence grades: CONFIRMED = reported by a news/official-adjacent source in results. WEAK = one secondary/aggregator source or old. UNVERIFIED = I found nothing.

---
## 1. Merchant list check

| Entry | Category | Verdict | Evidence / note |
|---|---|---|---|
| Bravo | Supermarket | KEEP (CONFIRMED) | "Azərbaycan Supermarket LLC (Bravo)" paid 21.2M AZN tax, 3rd among chains in 2025 (modern.az, 2025 tax list). |
| Araz | Supermarket | KEEP (CONFIRMED) | #1 by tax 2025, 46.4M AZN (modern.az); part of Veyseloglu group (veyseloglu.az). Ambiguous word: "araz" is also a river/personal name, so match on "araz market/supermarket". |
| Oba Market | Supermarket | KEEP (CONFIRMED) | #2 by tax 2025, 25.9M AZN. Note: written "OBA"; users will type "oba". |
| Bazarstore | Supermarket | KEEP (CONFIRMED) | Azersun group, expanding (turan.az; DRC consultancy note). |
| Rahat Market | Supermarket | KEEP, low confidence (WEAK) | Only an old Euromonitor mention; no current evidence found. Do not drop (still widely known) but flag "unverified current status". |
| Neptun | Supermarket | KEEP, low confidence (WEAK) | Same as Rahat: old mention only. |
| Al Market | Supermarket | ADD (WEAK) | Named as Azersun chain beside Bazarstore. |
| Spar | Supermarket | ADD (WEAK) | Mentioned together with Araz/OBA in a retail consultancy note; verify it still trades under that name. |
| Rossmann | Drugstore/cosmetics | ADD (CONFIRMED) | Entered Azerbaijan 2022 via Veyseloglu (veyseloglu.az, apa.az). |
| Wolt | Delivery | KEEP (CONFIRMED) | Operating since 2019; Aug 2023 Food Safety Agency suspension attempt, Wolt says it continues; expanded to Sheki (tech.az). Left Uzbekistan Mar 2026 (not AZ). |
| Bolt | Taxi/delivery | KEEP (CONFIRMED, partial) | Bolt Food reported in Baku/Ganja (tech.az 2023); Bolt couriers joined 2023 strike. Current Bolt Food status not confirmed. "Bolt" is also a generic word (hardware): match "bolt" with ride/food context only. |
| Yango | Taxi/delivery | KEEP (CONFIRMED) | Taxi; Yango Food since Sept 2024; Yango Group announced $100M AZ investment (trend.az Sept 2025). Also Yango Delivery. |
| Glovo | Delivery | FLAG, status UNVERIFIED | Only an undated Russian city-guide lists Glovo in Baku; no operator/news source. Glovo has exited other markets (Slovenia, Turkey). Keep as low-priority alias, do not rely on it. |
| Gapgo | Delivery | ADD (WEAK) | Listed as a Yango-partner/competitor delivery service (tech.az). |
| SOCAR | Fuel | KEEP (CONFIRMED) | SOCAR Petroleum, ~71 stations (careers page, date unknown). Also the state oil company; non-fuel purchases possible. |
| Azpetrol | Fuel | KEEP (CONFIRMED) | 97-100 stations (company news, 2023). |
| Lukoil | Fuel | KEEP, FLAG (WEAK) | Latest AZ-specific item I found is old (~58 stations). Lukoil is divesting foreign assets under sanctions; I could NOT verify whether AZ stations were sold/rebranded. Check before relying. |
| Azercell | Mobile | KEEP (CONFIRMED) | Largest operator (~45-49% share). Ownership correction: Telia/Turkcell sold to state-owned Azintelecom in 2018 (EUR 222M; telecompaper/OCCRP). Do not describe it as Telia-owned. |
| Bakcell | Mobile | KEEP (CONFIRMED) | ~25-30% share. |
| Nar | Mobile | KEEP (CONFIRMED) | Brand of Azerfon, ~20-24%. Ambiguous word ("nar" = pomegranate): match with context (e.g. "nar mobile", "nar balans"). |
| Naxtel | Mobile (Nakhchivan) | KEEP, FLAG (WEAK) | Real operator ("Naxtel 4G"), still listed by Birbank SMS banking partner page. A Wikipedia infobox claims "defunct 1 Dec 2025" - no official notice found; UNVERIFIED. Also spelled Nakhtel. |
| Aztelekom | Home internet | KEEP (CONFIRMED) | State-owned; ~70% of fixed broadband per Japanese MIC profile (June 2025). |
| Delta Telecom | ISP/wholesale | FLAG (WEAK) | Older reports: dominant international gateway selling capacity to ISPs; may not be a consumer billing brand. Low value as a merchant. |
| Super Online | Internet | UNVERIFIED | Nothing found. Cannot confirm. |
| Azeronline | Home internet | ADD (WEAK) | Private fixed ISP, mainly Baku. Others named: Ulduz Telekom, UniNet, Baktelekom (regional). |
| Azərişıq | Electricity | KEEP (CONFIRMED) | Payable via ASAN Pay. |
| Azəriqaz | Gas | KEEP (CONFIRMED) | Payable via ASAN Pay (sources call it Azerigas). |
| Azersu | Water | KEEP (UNVERIFIED payment channel) | Brand exists; I found no source on its payment channels. |
| ASAN Pay / ASAN ödəniş | Bill-payment portal | ADD (CONFIRMED) | State system, 300+ organizations, 670+ services, 10,000+ terminals, site and app; bank statement lines for utilities may read "ASAN" rather than the utility. |
| Kontakt (Kontakt Home) | Electronics | KEEP (CONFIRMED, weak) | Described as a leading local retailer (Russian-language review). |
| Baku Electronics | Electronics | KEEP (WEAK) | Only SEO-listing evidence. Spelling "Bakı Electronics". |
| Irshad | Electronics/telecom | UNVERIFIED | Nothing found. |
| Umico | E-commerce | RENAMED | Became **Birmarket** (Bir ecosystem, PASHA Holding); app moved to the new brand from 1 July 2025 (report.az, 1news.az). Keep "umico" as alias to "birmarket". |
| Trendyol | E-commerce | KEEP (CONFIRMED) | Local subsidiary registered in Baku; part of the Bir ecosystem per same sources. |
| Zeytun Pharm | Pharmacy | UNVERIFIED | Nothing found. Larger pharmacy names that did appear: Avromed (~180 drugstores, undated), AVIS pharmacy, Rossmann. Other common names (Emin Aptek, Hayat Aptek etc.) not verified - leave out until confirmed. |
| CinemaPlus | Cinema | KEEP (CONFIRMED) | Chain of Baku cinemas; counts conflict (6 vs 9 cinemas). Tickets often via iticket.az. |
| Park Cinema | Cinema | KEEP (CONFIRMED) | Described as largest national chain, since 2010; only IMAX hall at Flame Towers. |
| iTicket | Tickets | ADD (CONFIRMED) | Ticketing for both cinema chains and events. |
| BakıKart | Transport | KEEP (CONFIRMED) | Baku transport card; QR tickets in the BakıKart app; top-up through m10 and Birbank apps; metro/bus NFC bank-card payment (bus rollout "by end-2025" - completion not confirmed). Fares conflict between sources (0.40 vs 0.50 AZN). |
| m10, Birbank, Kapital | Wallet/bank | See section 2. |

Notes for the matcher: ambiguous words to guard (araz, nar, bolt, oba, bravo, rahat = "comfort", park, kontakt). Azerbaijani letters (ə, ı, ö, ü, ş, ç, ğ) and Latin/Russian spellings (e.g. "Азерсу", "Бравo", "Араз") should be normalized; ASCII fallbacks like "azerishiq", "azeriqaz" are likely in bank SMS text. I did NOT see real bank SMS/statement text, so exact merchant strings are UNVERIFIED.

---
## 2. How Azerbaijanis pay; apps; export

CONFIRMED
- Apple Pay launched Nov 2021 (Kapital Bank, ABB, Bank Respublika among first) - appleinsider, banks.az.
- Google Pay launched 23 Aug 2022; Central Bank: 4M payments worth 813.2M AZN in 2023 (trend.az). Samsung Pay was only "may start" in results.
- Kapital Bank is rebranding to **Birbank** from Q1 2025 (legal name stays Kapital Bank; branches renamed over ~2 years) - trend.az, tech.az. Part of PASHA Holding. ~10M cards mentioned (banco.az).
- m10 (PashaPay, Bir ecosystem): wallet figures conflict (3.5M registered users per PashaPay; 829k per Bir investor page; 2.5M downloads per 8B). Digital Mastercard added Dec 2025, works with Apple/Google Wallet. A bill-pay AI assistant was reported (cfotech) - date shown as Aug 2026 in results; unverified detail.
- Licensed wallet/e-money players per 2025 overview: 12 companies incl. GoldenPay, PashaPay, United Payment, Modenis, Mpay, Paysis, PulPal. Central Bank directory: PulPal LLC e-money institution, Azericard payment institution, Payriff e-money institution. Azericard integrated Apple/Google Pay tokenization (thepaypers, 2024).
- Azercell app also supports Apple Pay/Google Pay (sia.az).
- ASAN Pay is the state bill rail (see above).
- Android share (Statcounter, traffic-based, not ownership): ~78% Android / ~21% iOS on mobile, Oct 2025 - May 2026 (report.az). Android-first is justified.

Transaction export (what I could actually establish)
- SMS: Birbank/Kapital SMS Banking sends an SMS per card transaction via Azercell, Bakcell, Nar, Naxtel 4G; activated in the app, ATM or branch (birbank.az). SMS text format NOT obtained. Reading SMS would require Android SMS permission, which has Google Play policy limits - needs separate check before promising.
- Personal-app CSV/PDF export for Birbank, ABB Mobile, PASHA Bank, m10: UNVERIFIED (searches returned nothing). Only the business app Birbank Biznes states statements up to 1 year. Do not promise a "bank CSV import" format until real sample files are obtained from the owner's own accounts (owner's data only).
- Open banking: Central Bank has a 2021-2025 roadmap and 2024-2026 strategy, Berlin-Group-style API standard, and a Central-Bank API gateway for TPPs (cbar.az requirements PDF). March 2026 Salt Edge workshop on implementation. I found NO confirmed live account-information service available to a small third-party app; aggregator sites (openbankingtracker, banq.ai) conflict and are not reliable. Treat bank sync as not available for planning.
- ABB Mobile, PASHA Bank app: nothing verified beyond ABB being an Apple Pay launch partner. Their features remain UNVERIFIED.

---
## 3. Market, competitors, pain points, willingness to pay, law

Market
- ~12.2M mobile connections (GSMA via operatorwatch, start 2025). Fixed broadband is ~80% fiber (Japan MIC, June 2025).
- Cashless trend is real (Apple/Google Pay, NFC transit) but no figure for cash vs card share was obtained: UNVERIFIED.

Competitors available in Azerbaijan (CONFIRMED present in store listings via AppTail): Zenmoney, Spendee, Fleur, Expenses, Spending Tracker, Budget Expense Tracker (all global/Russian). I found NO locally built Azerbaijani expense tracker with az-language UI; this is an absence of search results, not proof (UNVERIFIED). Bank apps (Birbank, ABB) probably include simple spending views but I could not verify.
Hesab.az appears as a digital wallet (marlvel listing), not verified as a tracker.

Pain points from (small, App Store only, AppTail snapshots)
- Bank sync breaking for local banks (Zenmoney, Azerbaijan reviewers); request for future-dated entries.
- Data loss on upgrade and slowness (Spendee reviewers in AZ) - supports the local-first/backup message.
- Paywall surprise/ account blocking after app turned paid (Spendee).
- Praise: simplicity, minimal design. Some suspected fake reviews.
Limits: tiny sample, mixed dates, no Google Play data. It is observed feedback, not market demand.

Willingness to pay: NOT FOUND. No Azerbaijan-specific price or conversion data. Recommend lightweight validation (e.g. 10-15 interviews, test one-time purchase vs. subscription, check Google Play Azerbaijan billing support separately).

Legal / privacy (local-first app)
- Law "On Personal Data" No. 998-IIIQ (2010) - consent for collection/processing/cross-border transfer; registration of personal-data information systems with the competent state body before processing; cross-border transfer allowed if destination gives equivalent protection or with consent (secondary summaries: Deloitte AZ, Caspian Legal Center, DataGuidance). Latest amendment seen: Law No. 1193-VIQD of 28 June 2024 (text NOT read; content, incl. any localization rule, UNVERIFIED).
- Oct 2025 report.az: a new package on personal-data protection being developed; "from 2026 citizens to control use of data" is a stated plan from an official, not enacted law as far as I found.
- Reported fine 300-500 AZN for unregistered processing - single secondary source, UNVERIFIED.
- Whether purely personal/household processing is exempt: NOT FOUND.
- Implication (strategic opinion, not legal advice): a local-first app that keeps data on the device and sends nothing to a server has a much lower exposure than one with accounts/sync/analytics; the moment you add cloud sync, crash reporting, analytics, or AI over user data, obtain a lawyer opinion on registration, consent text, and cross-border transfer. Do not claim legal compliance in store listings without that review.
- Regulator identity for personal data: sources conflicted; verify on e-qanun.az.

---
## 4. Things I could not verify (summary)
Super Online, Irshad, Zeytun Pharm, Glovo AZ status, Lukoil AZ station status, Naxtel current status, Azersu payment channels, Rahat/Neptun current status, personal-app statement export (Birbank/ABB/PASHA/m10), bank SMS text formats, any live open-banking AIS for third parties, willingness to pay, personal-use exemption in the data law, content of the June 2024 amendment, local competitor trackers. Recommended next step: ask the owner for real (own-account) SMS/statement samples from Birbank and ABB Mobile to define import patterns; review primary law text on e-qanun.az.

## Source list (as returned by search)
report.az (data-law update; Google Pay volumes; Android share; NFC buses); trend.az (Birbank rebrand; Yango $100M; m10 card); tech.az (Birbank rebrand; Wolt Sheki; Bolt; Yango Food); banks.az (Apple/Google Pay); appleinsider.com 2021-11-02; birbank.az (SMS banking, Apple/Google Pay, NFC); modern.az (supermarket tax ranking 2025); veyseloglu.az; turan.az (Bazarstore, Naxtel, Wolt); oc-media.org & business-humanrights.org (Wolt 2023); report.az / 1news.az (Birmarket July 2025); asan.gov.az / e-gov.az (ASAN Pay); cbar.az (open banking requirements PDF; e-money directory 30.09.2024); blog.saltedge.com (Mar 2026); telecompaper / OCCRP (Azercell sale 2018); soumu.go.jp (Azerbaijan telecom, June 2025); operatorwatch.com; iticket.az, parkcinema.az; m10.az/bakikart; apptail.io (reviews); deloitte.com/az, caspianlegalcenter.az, dataguidance.com (data law).
