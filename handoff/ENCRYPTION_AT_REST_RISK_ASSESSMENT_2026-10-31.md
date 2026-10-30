# Encryption at rest — risk assessment (assessment only, nothing implemented)

Date: 31 Oct 2026. Requested by the owner together with the decision "simple PIN + biometric unlock for this release; defer full data encryption to a separate security architecture task". Status of full encryption: **DEFERRED WITH REASON** (below). This document is a desk assessment from the source code and general knowledge of the browser platform; nothing here was measured on a phone, and the points marked *unverified* need checking before any design is committed.

## 1. What exists today (confirmed from the source)

| Item | State |
|---|---|
| Ledger | One JSON string in `localStorage["expense_ledger_v5"]`, readable text. |
| Side keys | `__subcats`, `__debts`, `__crashlog`, `__bills_mirror`, `__coachmute`, recovery copies `expense_ledger_v5__<label>_<ts>`, and (Run 19) `__lock`. Several of these hold real financial data (debts, bills mirror, recovery copies of the ledger). |
| Backups / exports | Plain JSON and CSV files. Anyone who gets the file can read it. |
| App lock (Run 19) | A screen lock. The PIN is stored only as a salted PBKDF2-SHA-256 hash (150,000 rounds). The data is **not** encrypted and the lock is not a key. |

## 2. What the PIN lock does and does not protect

Protects against: a family member, colleague or friend picking up an unlocked phone and opening the app.

Does **not** protect against: anyone who can read the browser's storage (developer tools on a computer, a phone backup tool, a malicious app or extension with the right access); anyone who copies a backup or CSV file; anyone who simply uses "Forgot your PIN?" (the lock is removable after a 10-second wait by design, so that a forgotten PIN never costs records). It is a deterrent against casual access, not a security boundary. The wording in the app says this in plain terms (More → App lock, and Privacy → "A shared phone").

## 3. What encryption at rest would add, and its real limits

It would make the stored ledger unreadable without a secret, so a copied storage folder or phone backup would be useless to a thief. It would **not** help while the app is open and unlocked (the data is in memory), nor against malware running inside the same browser profile, nor against someone who watches the PIN being typed.

## 4. Key management — the central difficulty

1. **A 4–6 digit PIN cannot be an encryption secret.** There are only 10,000 to 1,000,000 possible PINs. Anyone with a copy of the encrypted data can try every one offline; with PBKDF2 at 150,000 rounds that takes minutes to hours on an ordinary computer. A key derived from the PIN would give a false sense of safety. Real protection needs either a long passphrase (poor fit for a quick-open phone app) or a key held by hardware.
2. **Hardware-bound options (all *unverified* for the target devices):**
   - WebAuthn PRF extension: lets a fingerprint-protected credential produce a stable secret. Browser and Android support is uneven; it must be tested on the Poco F6 and typical Azerbaijani devices before relying on it.
   - A non-extractable Web Crypto key stored in IndexedDB: protects against copying the storage elsewhere, but not against code running in the same browser profile, and it is lost if site data is cleared.
3. **Data key design (if built):** a random data key encrypts the ledger; the data key is "wrapped" by a key derived from the user's secret. This allows changing the secret without re-encrypting everything.

## 5. Recovery — conflicts with the lock requirement

The owner's rule for the lock is "forgetting must never delete financial records". With real encryption the opposite is true: **if the secret is lost, the data is unrecoverable** (there is no server and no account). The only mitigations are a recovery key shown once and saved by the user (many will not save it), or a fresh backup file kept elsewhere. This must be decided with the owner as a product trade-off before any code: stronger protection costs a real chance of permanent loss for non-technical users.

## 6. Backup encryption

The lowest-risk, highest-value first step: an **optional** passphrase when exporting a backup. It touches no live data, so a mistake cannot damage the ledger. Risks: a forgotten passphrase makes that one file useless; the backup format (`BACKUP_VERSION`) and the importer need a clearly labelled encrypted variant, and the importer must say plainly "this file is encrypted" instead of "invalid file". Needs its own tests (wrong passphrase, corrupted file, round trip, older app versions refusing it politely).

## 7. Migration risks for encrypting the live data

- `expense_ledger_v5` is permanent. Changing its content from readable JSON to an encrypted envelope breaks every older app version and the Run 13 downgrade protection; the load path (`migrateAndLoad`), the recovery copies, the bills mirror, debts and the crash log would all have to understand both forms.
- A crash or full storage in the middle of switching must never leave the user with neither form. It needs: write the encrypted copy first, read it back and compare, only then switch; keep the readable copy until the check passes; and test the failure paths (storage full, tab closed mid-way, wrong secret).
- Every side key above holds data and must be covered, otherwise encryption protects little.
- Save performance: the app saves often; encrypting a few megabytes is cheap with AES-GCM but needs a unique value per write and tests with large ledgers.
- The service worker, import/export, CSV export and share-sheet paths all handle plain data and would need review.

## 8. Other open questions (*unverified*)

- Any legal requirement in Azerbaijan or the app stores about shipping encryption (standard browser cryptography is normally unproblematic, but this was not researched).
- Behaviour of site-data clearing and "storage persistence" on the main target browsers when keys are involved.
- User testing: do ordinary users accept a passphrase, a recovery key, or a hardware-bound approach?

## 9. Recommendation and suggested order

1. Keep the Run 19 PIN + fingerprint lock as the release feature, with the honest "not encryption" wording (done).
2. Next, if the owner agrees: **optional encrypted backup export** (section 6). Small, isolated, reversible.
3. Then a design spike on a hardware-bound key (PRF / non-extractable key) on real devices — *no* PIN-derived encryption.
4. Only after 3, and an owner decision on the recovery trade-off (section 5), design encrypted live storage with the staged, verified migration in section 7.

**Why deferred:** the first real step needs a product decision (what happens when the secret is lost) and device testing that cannot be done here, and a rushed implementation would put the one thing the app must never lose — the ledger — at risk.

## 10. Verification that would close this item

A written design approved by the owner; tests for round trip, wrong secret, damaged data, interrupted migration and downgrade; a real-device check on the Poco F6 and at least one iPhone; a rollback plan.
