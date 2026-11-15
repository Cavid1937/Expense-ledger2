# Bank formats the app has learned

This file is the single place to check before changing the statement reader (`statement.js`) or the notification reader.

- Every entry describes **layout only**: columns, codes and quirks.
- Real names, card or account numbers, phone numbers, amounts and balances must never be written here, in tests or in commits.
- Real files stay private: they are read once, in a scratch folder outside the repo, and then left there.
- Each bank below has a test built from **invented** data, so a later change that breaks a bank fails the tests.

To add a bank:
1. Read its file privately.
2. Write its layout here.
3. Add an invented-data test in `tests/logic/` and its check count to `tests/expected-counts.json`.
4. Run `node tests\run-logic.mjs`.
5. Compare the reader's totals with the statement's own totals and running balance.

---

## Birbank (Kapital Bank) — PDF statement, learned 2026-11-15 (Run 91)

**Reader:** `columnParse()` and `describeRow()` in `statement.js`. **Test:** `tests/logic/run91birbank.test.mjs`.

### Page 1 summary block
- Each label sits in one cell and its number in the next cell.
- Labels:
  - `Dövrün əvvəlinə balans` (opening balance)
  - `Dövr üzrə mədaxil məbləği` (money in for the period)
  - `Dövr üzrə məxaric məbləği` (money out for the period)
  - `Dövrün sonuna balans` (closing balance)
  - `Bloklanmış mədaxil/məxaric məbləği` (on hold; ignored)
  - `Cari balans` (current balance)
- It also holds the card number, account number and holder's name. These are never read into the app.

### Table
- Heading row, **on page 1 only**: `Tarix | Məxaric | Mədaxil | Balans | Təsvir | Kartın son 4 rəqəmi`.
- Every page uses the same x positions for the columns. Values are printed under their heading.
- Rows are listed **newest first**.
- Dates are `yyyy-mm-dd`. Amounts look like `5.30`; the empty side is a plain `0`.
- The balance can be negative, for example on an overdraft.

### Descriptions wrap
- Wrapped lines sit about 7 units above and below the dated line. A three-line description uses about +14, 0 and −13.
- Rows are about 42 units apart.
- A wrapped line belongs to the nearest row when it is closer than half that gap.
- A description can continue across a page break. A fragment at the top of a page belongs to the last row of the previous page; a fragment at the foot of a page belongs to the first row of the next page.

### Lines to ignore
- The last page ends with a signature line in the left margin, outside the description column. It is ignored.

### Description shapes and how the reader names them

The general shape is `CODE/NAME,ADDRESS,CITY,AZ/TAIL`. The merchant is NAME. The city is the part before `,AZ`; Baku is not repeated in the note. In the tail, `P 10` marks a purchase and `P 32` / `P 33` mark transfers out and in.

| Shape | Reader's name | Kind |
|---|---|---|
| `BirBank5/www.birbank.az,…/<card mask>` | Birbank transfer | transfer (card to card, both directions) |
| `BirBank_IPSOUT/…`, `IPSCARDTOPUP_EXT/…` | IPS transfer | transfer (instant payment system) |
| `BirBank50/…` (money in) | Birbank incoming | transfer in. **Inferred** from round sums; the bank does not say. |
| `BIRBANK_BK/Birbank, BakıKart…` | BakıKart | transport card top-up. It must not count as an app transfer. |
| `…VID=nnn;VENDORVAL=…;P=1-…; CMS_ID=…;` | Payment service nnn | payment, category not guessed. VENDORVAL can be a phone number. VENDORVAL, P= and CMS_ID are removed. |
| `…KAPS,ONLINE KIOSK…;CASH_IN_CHARGE=…` | Cash-in kiosk | transfer in (cash deposit) |
| `PASHAPAY_M10/KAPS,…m10 w2c…` | m10 | wallet to card |
| `A0…/KAPS,<address>,…/A 10` (money out) | ATM | cash withdrawal. **Inferred**: the tail `A 10` means a cash machine; the amounts are round. |
| `DigDeposit/…` | Deposit | transfer to or from the person's own deposit |
| `BKMR…/TP METRO,…`, `BKBS…/TP BUS,…` | TP METRO / TP BUS | transport (metro, bus) |
| `nnnn/P2P SEND- LEO APP,…` | as printed | person-to-person transfer |

### Known mismatch
In the statement this was learned from, the summary's money-out figure was larger than the sum of the rows, and its closing balance differed from the newest row's balance by the same amount.
- The rows themselves chain exactly: opening + in − out = newest balance.
- So the summary counts spending that the table does not list.
- The import sheet now shows a warning when the summary and the rows disagree (`st.summaryDiff`).

### Not known yet
- What `BirBankA2C` is (small money in; read as a Birbank transfer).
- Which service each `VID` number stands for.
- Whether foreign-currency card payments show the original amount.

---

## ABB — PDF statement, learned 2026-11 (Run 52)

**Reader:** `ABB_ROW` / `abbRow()` in `statement.js`. **Test:** `tests/logic/run52statement.test.mjs`.

- Each row is `yyyy-mm-dd <description> <amount> <amount> <balance>`.
- The description holds `~`-separated fields with an 8-digit code and a currency (`~NNNNNNNN~AZN~`), which is how the bank is recognised.
- Wrapped rows: the card mask can be split across the wrap (`4127..` + `2416~`); the two pieces are joined into one field.
- The ABB Excel export: read only the sheet and the shared strings. The zip has a damaged size entry that breaks some libraries.

## Unibank — PDF statement, learned 2026-11 (Run 52)

**Reader:** `UNI_ROW` / `uniRow()` in `statement.js`. **Test:** `tests/logic/run52statement.test.mjs`.

- Each row is `dd-mm-yyyy | hh:mm <posted date> <in or -> <out or -> <description / original amount CUR>`.
- A row without a posted date is still pending.
- The text after the last ` / ` is the original amount and currency.

## Leobank — push notifications (samples 2026-11-08; reader is APK-only)

- Three lines: `<emoji> <amount> ₼` / merchant / `Balans <balance after> ₼`.
- The amount has no sign, so the direction comes from the balance difference.
- A break in the balance chain means a notification was missed.

## ABB — in-app and push notifications (samples 2026-11-08)

- Format: `Payment: -0.90₼` / counterparty / `Card: **NNNN` / `Balance: X₼`.
- The amount has an explicit sign. The balances chain.

## Any other bank

The generic reader handles tables in several cases:
- **Heading row** naming a date column and at least two money columns: column mode, the same as Birbank.
- **No heading:** money columns are worked out from the numbers, and a running balance decides which column adds and which takes away.
- **Excel or CSV:** columns are matched by their headings, with a "match the columns" step when the app cannot work them out.
