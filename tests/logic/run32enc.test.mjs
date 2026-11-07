// Run 32 (backlog item 9): optional passphrase-encrypted backup (AES-256-GCM, key from PBKDF2-SHA-256). Synthetic data only.
// Expected outcomes come from the design, not from the code: a right passphrase returns the exact original text; anything else returns nothing readable.
import { H, ok, section, reset, finish, T } from "./lib.mjs";
const { isEncryptedBackup, encryptBackupText, decryptBackupText, buildBackup, planImport } = H;
reset();
const FAST = 1000;                       // low iteration count only to keep the many cases quick; one case uses the real default
const PASS = "correct horse battery";
const plain = JSON.stringify({ merchant: "Bravo Supermarket Nərimanov", note: "Maaş — Зарплата 2450.75", n: 1 });
const enc = await encryptBackupText(plain, PASS, FAST);
const env = JSON.parse(enc.text || "{}");
const retag = (o) => JSON.stringify({ ...env, ...o });
const flip = (b64, i = 3) => { const u = Buffer.from(b64, "base64"); u[i] ^= 1; return u.toString("base64"); };

section("R32-E1. Round trip and what the file contains");
ok(enc.ok === true && typeof enc.text === "string", "encrypting with a passphrase of 8+ characters works", enc.reason);
const back = await decryptBackupText(enc.text, PASS);
ok(back.ok && back.text === plain, "the right passphrase returns exactly the original text (Azerbaijani, Russian and symbols included)", back);
ok(env.format === "expense-ledger-encrypted-backup" && env.version === 1 && env.kdf === "PBKDF2-SHA256" && env.cipher === "AES-256-GCM" && env.iterations === FAST, "the file states its format, version, key method, cipher and iteration count", env);
ok(!enc.text.includes("Bravo") && !enc.text.includes("Maaş") && !enc.text.includes("2450") && !enc.text.includes(PASS), "neither the data nor the passphrase appears in the file", enc.text.slice(0, 120));
const enc2 = await encryptBackupText(plain, PASS, FAST);
ok(enc2.text !== enc.text && JSON.parse(enc2.text).salt !== env.salt && JSON.parse(enc2.text).iv !== env.iv, "two encryptions of the same data differ (fresh random salt and nonce each time)");
const defaults = await encryptBackupText("x", PASS);
ok(defaults.ok && JSON.parse(defaults.text).iterations === 600000, "the default is 600,000 PBKDF2 iterations", defaults.ok && JSON.parse(defaults.text).iterations);

section("R32-E2. Recognising the file");
ok(isEncryptedBackup(enc.text) && isEncryptedBackup("﻿" + enc.text), "the encrypted file is recognised (with or without a byte-order mark)");
const plainBackup = JSON.stringify(buildBackup({ transactions: [T({ id: 5, amount: 12.5 })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] }, "2026-11-07T00:00:00.000Z"));
ok(!isEncryptedBackup(plainBackup) && !isEncryptedBackup("Date,Type\n2026-01-01,expense") && !isEncryptedBackup("not json {") && !isEncryptedBackup("") && !isEncryptedBackup(null), "a normal backup, a CSV, garbage, empty and null are not mistaken for it");
ok(!isEncryptedBackup(JSON.stringify({ note: "expense-ledger-encrypted-backup" })), "a normal file that merely mentions the name is not mistaken for it");

section("R32-E3. Wrong passphrase, altered or damaged file: nothing readable comes out");
ok((await decryptBackupText(enc.text, "correct horse batterY")).reason === "wrong", "one character different: refused as wrong");
ok((await decryptBackupText(enc.text, "")).reason === "wrong", "an empty passphrase is refused as wrong");
ok((await decryptBackupText(retag({ data: flip(env.data) }), PASS)).reason === "wrong", "one changed bit in the data: refused (tamper-evident)");
ok((await decryptBackupText(retag({ iv: flip(env.iv, 0) }), PASS)).reason === "wrong", "a changed nonce: refused");
ok((await decryptBackupText(retag({ iterations: FAST + 1 }), PASS)).reason === "wrong", "a changed iteration count: refused");
ok((await decryptBackupText(retag({ salt: flip(env.salt, 0) }), PASS)).reason === "wrong", "a changed salt: refused");
ok((await decryptBackupText(retag({ data: Buffer.from("abc").toString("base64") }), PASS)).reason === "damaged", "data cut short: reported as damaged");
ok((await decryptBackupText(retag({ salt: Buffer.from("short").toString("base64") }), PASS)).reason === "damaged", "a salt of the wrong length: damaged");
ok((await decryptBackupText(retag({ data: "!!!not base64!!!" }), PASS)).reason === "damaged", "data that is not base64: damaged");
ok((await decryptBackupText("{ broken", PASS)).reason === "damaged" && (await decryptBackupText(plainBackup, PASS)).reason === "damaged", "broken JSON and a normal backup given to the decryptor: damaged");

section("R32-E4. Unknown or unsafe parameters in a file");
ok((await decryptBackupText(retag({ version: 2 }), PASS)).reason === "newer", "a newer file version is reported as newer, not as a wrong passphrase");
ok((await decryptBackupText(retag({ kdf: "scrypt" }), PASS)).reason === "damaged" && (await decryptBackupText(retag({ cipher: "AES-128-CBC" }), PASS)).reason === "damaged", "another key method or cipher is refused");
ok((await decryptBackupText(retag({ iterations: 10 }), PASS)).reason === "damaged" && (await decryptBackupText(retag({ iterations: 6000000 }), PASS)).reason === "damaged" && (await decryptBackupText(retag({ iterations: 1000.5 }), PASS)).reason === "damaged", "an iteration count that is far too low, absurdly high (a file meant to freeze the phone) or fractional is refused");

section("R32-E5. Passphrase rules");
const short = await encryptBackupText(plain, "1234567", FAST);
ok(!short.ok && short.reason === "short" && short.text === undefined, "7 characters: refused, and no file is produced");
ok((await encryptBackupText(plain, "12345678", FAST)).ok, "exactly 8 characters: accepted");
ok((await encryptBackupText(plain, "парольфр", FAST)).ok && !(await encryptBackupText(plain, "пароль", FAST)).ok, "length counts characters, not bytes (8 Russian letters accepted, 6 refused)");
ok(!(await encryptBackupText(plain, undefined, FAST)).ok && !(await encryptBackupText(plain, 12345678, FAST)).ok, "a missing or non-text passphrase is refused");
const composed = await encryptBackupText(plain, "cafécafé", FAST);
ok((await decryptBackupText(composed.text, "cafécafé")).ok, "the same accented passphrase typed as one character or as letter + accent opens the file (Unicode-normalised)");

section("R32-E6. Whole pipeline: backup → encrypt → decrypt → the normal import check");
const txns = [T({ id: 11, amount: 12.5, date: "2026-10-01" }), T({ id: 12, type: "income", category: "salary", amount: 2450.75, date: "2026-10-02" })];
const backupText = JSON.stringify(buildBackup({ transactions: txns, budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] }, "2026-11-07T00:00:00.000Z"), null, 2);
const e3 = await encryptBackupText(backupText, PASS, FAST);
const d3 = await decryptBackupText(e3.text, PASS);
const plan = planImport(d3.text, "backup.json");
ok(d3.ok && d3.text === backupText, "the decrypted text is byte-for-byte the backup that went in");
ok(plan.ok && plan.transactions.length === 2 && plan.transactions.map((x) => x.amount).sort((a, b) => a - b).join() === "12.5,2450.75", "it then passes the normal import validation with the same two entries and amounts", plan.error);
ok(!planImport(e3.text, "x.json").ok, "the encrypted file given straight to the normal import is refused (it must be unlocked first)");

section("R32-E7. A browser without encryption support");
const real = Object.getOwnPropertyDescriptor(globalThis, "crypto");
Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
const noEnc = await encryptBackupText(plain, PASS, FAST), noDec = await decryptBackupText(enc.text, PASS);
if (real) Object.defineProperty(globalThis, "crypto", real); else delete globalThis.crypto;
ok(!noEnc.ok && noEnc.reason === "unsupported" && !noDec.ok && noDec.reason === "unsupported", "both directions report 'unsupported' instead of throwing");
ok((await decryptBackupText(enc.text, PASS)).ok, "and encryption works again once support is back (the test left the environment as it found it)");
finish("run32enc");
