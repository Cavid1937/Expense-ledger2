// Run 19: app lock (PIN). Pure logic: PIN rules, salted hash (no plaintext), wrong-PIN wait table, when to lock, damaged record,
// and that the lock lives apart from the ledger and the backups. Synthetic data only.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { validPin, makeLockRecord, verifyPin, readLock, writeLock, removeLock, lockWaitMs, lockShouldEngage, LOCK_KEY, LOCK_TIMEOUTS, buildBackup } = H;
reset();

section("R19-L1. PIN rules");
ok(validPin("1234") && validPin("123456") && validPin("0000"), "4 to 6 digits are accepted (leading zeros too)");
ok(!validPin("123") && !validPin("1234567") && !validPin("12a4") && !validPin("") && !validPin("12 34") && !validPin(1234) && !validPin(null), "3 or 7 digits, letters, spaces, numbers and null are refused");
ok(LOCK_KEY === "expense_ledger_v5__lock", "the lock has its own key next to, not inside, the ledger key", LOCK_KEY);

section("R19-L2. Hash is salted and the PIN is never stored");
const rec = await makeLockRecord("4821", 5, null);
ok(!!rec && rec.v === 1 && rec.timeout === 5 && rec.fails === 0 && rec.until === 0, "a record is made with the chosen timeout", rec);
ok(!JSON.stringify(rec).includes("4821"), "the PIN does not appear in the record");
ok(await verifyPin(rec, "4821"), "the right PIN verifies");
ok(!(await verifyPin(rec, "4822")) && !(await verifyPin(rec, "")) && !(await verifyPin(rec, "48210")), "wrong, empty and too-long PINs do not");
const rec2 = await makeLockRecord("4821", 5, null);
ok(rec.salt !== rec2.salt && rec.hash !== rec2.hash, "the same PIN gives a different salt and hash each time");
ok((await makeLockRecord("12", 0)) === null, "an invalid PIN makes no record");
ok((await makeLockRecord("1234", 7)).timeout === 0, "an unknown timeout falls back to 'every time'");

section("R19-L3. Stored record: save, read, damage");
ok(readLock() === null, "no lock yet: null");
ok(writeLock(rec), "the record is saved");
const stored = localStorage.getItem(LOCK_KEY);
ok(!stored.includes("4821"), "the saved text does not contain the PIN");
const back = readLock();
ok(back && back.ok && back.rec.hash === rec.hash && back.rec.timeout === 5, "it reads back as saved");
localStorage.setItem(LOCK_KEY, "{broken");
ok(readLock().ok === false, "unreadable text is reported as damaged, not as 'no lock'");
localStorage.setItem(LOCK_KEY, JSON.stringify({ v: 1, salt: "x", hash: "y", iter: 5 }));
ok(readLock().ok === false, "a record with an unsafe iteration count is damaged");
localStorage.setItem(LOCK_KEY, JSON.stringify({ ...rec, timeout: 99, fails: -3, until: "x" }));
const odd = readLock();
ok(odd.ok && odd.rec.timeout === 0 && odd.rec.fails === 0 && odd.rec.until === 0, "odd timeout/fails/until values are cleaned to safe ones", odd);
removeLock();
ok(readLock() === null, "removing the lock gives 'no lock'");
globalThis.__throwAll = true;
ok(readLock() === null && writeLock(rec) === false, "storage that cannot be read gives 'no lock' (the app must not lock the user out); a write is reported as failed");
globalThis.__throwAll = false;

section("R19-L4. Wait after wrong PINs");
ok([0, 1, 2, 3, 4].every((n) => lockWaitMs(n) === 0), "the first four mistakes cost no wait");
ok(lockWaitMs(5) === 30000 && lockWaitMs(6) === 60000 && lockWaitMs(7) === 120000 && lockWaitMs(8) === 240000, "then 30 s, 1, 2, 4 minutes");
ok(lockWaitMs(9) === 300000 && lockWaitMs(50) === 300000, "never more than 5 minutes");

section("R19-L5. When the app locks");
ok(JSON.stringify(LOCK_TIMEOUTS) === "[0,1,5,15]", "choices: every time, 1, 5, 15 minutes");
ok(lockShouldEngage(0, "away", 0) && lockShouldEngage(0, "away", 5), "'every time': any time away locks");
ok(!lockShouldEngage(5, "away", 4 * 60000 + 59000) && lockShouldEngage(5, "away", 5 * 60000), "5 minutes: 4:59 away stays open, 5:00 locks");
ok(!lockShouldEngage(0, "idle", 999999), "'every time' does not also lock a screen that is in use");
ok(!lockShouldEngage(1, "idle", 59999) && lockShouldEngage(1, "idle", 60000), "1 minute idle: 59.9 s stays open, 60 s locks");
ok(!lockShouldEngage(5, "other", 1e9), "an unknown event never locks");

section("R19-L6. Lock is apart from the ledger and the backups");
const before = localStorage.getItem("expense_ledger_v5");
writeLock(rec);
ok(localStorage.getItem("expense_ledger_v5") === before, "setting a lock does not touch the ledger key");
const bk = JSON.stringify(buildBackup({ transactions: [T({ amount: 12 })], budgets: {}, templates: [], currency: "AZN", goals: [], safeToSpend: null, bills: [] }));
ok(!bk.includes(rec.hash) && !bk.includes(rec.salt), "a backup file does not contain the lock");
removeLock();
ok(localStorage.getItem("expense_ledger_v5") === before, "removing the lock leaves the ledger key as it was");
finish("run19lock");
