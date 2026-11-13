// Node port of tests/original/harness.py (Python is not installed on this machine). Same behaviour:
// builds an importable module from the REAL candidate file — its data/logic layer, a controllable clock and an
// in-memory localStorage. The candidate is only read, never written.
// Usage: node tests/harness.mjs <candidate.jsx> <out.mjs>
import fs from "fs"; import path from "path";
const cand = process.argv[2], out = process.argv[3];
if (!cand || !out) { console.error("usage: node tests/harness.mjs <candidate.jsx> <out.mjs>"); process.exit(2); }
const src = fs.readFileSync(cand, "utf8").replace(/\r\n/g, "\n");
const marker = "// ─── SVG icon system";
if (src.split(marker).length !== 2) { console.error("SVG marker not found exactly once"); process.exit(1); }
// Run 27: declarations above the marker may carry "export" so screens/*.jsx can import them; the logic bundle exports its own list below.
const data = src.split(marker)[0].replace(/^import .*$/gm, "").replace(/^export (?=async |function|const|let|class)/gm, "");
const grab = (name) => { const a = src.indexOf("function " + name + "("); if (a < 0) return ""; return src.slice(a, src.indexOf("\n}\n", a) + 3); };
let extra = "";
for (const nm of ["calcHelperCards", "nextDueDate"]) if (!data.includes("function " + nm + "(")) extra += grab(nm) + "\n";
const stub = `
const RealDate=Date;
globalThis.__NOW=new RealDate(2026,9,13,12,0,0).getTime();
class FakeDate extends RealDate{ constructor(...a){ if(a.length===0) super(globalThis.__NOW); else super(...a);} static now(){return globalThis.__NOW;} }
globalThis.Date=FakeDate;
const __store=new Map(); globalThis.__failKeys=[]; globalThis.__throwAll=false; globalThis.__throwGetKeys=[];
globalThis.localStorage={ getItem:k=>{ if(globalThis.__throwAll||globalThis.__throwGetKeys.includes(k)) throw new Error("SecurityError"); return __store.has(k)?__store.get(k):null; },
  setItem:(k,v)=>{ if(globalThis.__throwAll||globalThis.__failKeys.some(f=>k.includes(f))) throw new Error("QuotaExceededError"); __store.set(k,String(v)); },
  removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>[...__store.keys()][i], get length(){return __store.size;} };
globalThis.__store=__store;
`;
// App.jsx imports its interface text from ./i18n.js next to it. That import line is stripped above like React's, so the
// catalog is inlined here (its "export" keywords removed) to keep the logic layer runnable on its own.
const i18nPath = path.join(path.dirname(cand), "i18n.js");
const i18n = fs.existsSync(i18nPath) && /from "\.\/i18n\.js"/.test(src) ? fs.readFileSync(i18nPath, "utf8").replace(/\r\n/g, "\n").replace(/^export /gm, "") + "\n" : "";
const body = stub + i18n + data + "\n" + extra;
const names = ["migrateAndLoad","buildMerchantMemory","merchantSuggest","memKey","calcHelperCards","calcSafeToSpend","calcSpendingPace","calcBudgetStatus","calcMonthSummary","calcPatterns","calcGoalProgress","storageUsage","widgetLine","readWidgetPrefs","writeWidgetPrefs","widgetNative","bioAvailable","bioRegister","bioCheck","NATIVE_BIO","screenSecureNative","parseSharedText","shareAmount","STORAGE_LIMIT_CHARS","isEncryptedBackup","badFileReason","planRebalance","applyRebalance","creditOwed","spreadMonths","expandSpreads","collapseSpreads","cleanWorkHours","evalAmountExpr","slotCategory","knownMerchants","knownMerchantExact","KNOWN_MERCHANTS","readWorkHours","writeWorkHours","WORKHOURS_KEY","incomePerHour","hoursOfWork","encryptBackupText","decryptBackupText","cleanMoneyText","lc","norm","subKey","goalRequiredMonthly","goalScenario","walletId","WALLET_IDS","lastWallet","calcWalletSpend","cleanSubcats","addUserSubcat","removeUserSubcat","THEMES","THEME_IDS","THEME_KEY","themeId","readTheme","writeTheme","knownTheme","themeFallback","settleTheme","themeIsAuto","THEME_AUTO_KEY","THEME_MAIN","themePreview","mixHex","isSubscription","sendFeedback","cleanFeedbackText","FEEDBACK_KEY","renameUserSubcat","renameSubcatInEntries","mergeSubcats","readSubcats","writeSubcats","calcCategorySpend","calcWhatChanged","calcTxnStats","calcSpentToDate","prevMon","nMon","surplusLabel","surplusColor","normaliseTxn","addMonths","nextDueDate","strictNum","parseMoney","moneyReason","isUsableRawTxn","checkRawTxn","isValidDateStr","localDateStr","localMonthStr","parseLocalDate","daysInMonth","daysBetween","parseCSV","validateSettings","planImport","applyImport","buildBackup","buildCsv","countSuspectedDuplicates","txnFingerprint","partitionTransactions","ensureUniqueIds","summariseReasons","noteLoad","buildSchedules","scheduleOccurrences","scheduleMonthStatus","scheduleNextDue","scheduleKey","monthProgress","toMonthlyAmountHelper","fmt","detectRecurrence","calcMerchantProfile","resolveCategory","curMon","sanitizeTransactions","MAX_AMOUNT","CATEGORIES","CAT",
  // added for this phase's regression tests (exported only if the candidate defines them)
  "calcWeekdayWeekend","backupReminderDue","BACKUP_REMINDER_DAYS",
  // Run 50 (owner list, 9 Nov): rollover to a goal
  "rolloverOffer","applyRollover","readRolloverSeen","writeRolloverSeen","sinkingCandidates","parseQuickText","giftLedger","GIFT_NOT_GIFT_SUBS","catTile","catHint","statementPick","tidyPlan","applyTidy","undoTidy","TIDY_MOVES","notSpentMonth","notSpentHistory","budgetCarried","cleanBudgetCarry","mergeBalancePreview","importPlanUse","cleanContribs","goalAddMoney","goalSetTotal","goalHistory","debtLeftAfter","loanLeftAfter","buildDebtsCsv","buildWorkbookSheets","planSetup","nextPayDate","recurringSuggestions","readRecSuggestDismissed","writeRecSuggestDismissed",
  // Run 51: merge and account-removal integrity
  "planMerge","planAccountMerge","remapEntryAccounts","mergeCounts","accountRemovalPlan","removeAccountSafely","restoreRemovedAccount","readAccounts","writeAccounts","findDoubleEntries","offerUndo","setUndoHost",
  // Run 53: currency for any ledger, daily refresh
  "ledgerCode","fetchLedgerRate","lastSavedRate","warmRates",
  // Run 57: one "paid from" rule
  "PAID_KINDS","accountsMap","paidFromAccount","paidFromKind","paidFromMatch","paidFromOptions","linkCandidates","applyLink","undoLink",
  // redesign (2026-10-27): the Home ring, the Analytics trend and the Home greeting
  "pctShares","donutSlices","cumulativeByDay","greetingKey",
  // Run 10: data safety
  "storageProtection","shareBackupFile","shareViaNative","nativeShareHook",
  // Run 11: new-version check
  "appVersionOf","checkForUpdate",
  // Run 12: explicit bills
  "validateBill","convertLegacySchedules","assignToBill","BACKUP_VERSION",
  // Run 13: protection against an older app version wiping the bills
  "buildBillsMirror","planBillRestore","applyBillRestore","BILLS_MIRROR_KEY",
  // Run 17: month-end forecast, profile name
  "calcMonthEndForecast","calcCoach","forSpending","isEarnedCat","readCustomCats","refundForId","refundsNetted","cleanFx","fxToBase","fetchCbarRate","fxBaseOk","parseQuickAdd","frequentFirst","hasManualOrder","cleanPrefs","fileParts","COACH_MUTE_KEY","PAT_MUTE_KEY","readMuteList","writeMuteList","CPREF_KEY","cleanCatPrefs","readCatPrefs","writeCatPrefs","orderedCats","pickerCats","moveCat","toggleHiddenCat","searchCats","loanCashOut","debtsHealth","debtCashFlow","debtLinkRef","billPaymentsLeft","loanExtraEffect","PRIVACY_KEY","readPrivacy","writePrivacy","LOCK_KEY","LOCK_TIMEOUTS","validPin","lockSupported","readLock","writeLock","removeLock","makeLockRecord","verifyPin","lockWaitMs","lockShouldEngage","cleanProfileName","PROFILE_NAME_MAX","calcRunOutDay","cleanReimb","reimbForRef","reimbStatus","reimbOwedMap","reimbOwedTotal",
  "loanSchedule","impliedNominalPct","debtRemaining","debtCanPay","cleanDebtData","readDebts","writeDebts","mergeDebtData","tripName","tripTotals","catTotals","budgetCrossing","billsToIcs","icsEscape","bankMoney","bankDate","cleanCustomCats","applyCustomCats","addCustomCat","editCustomCat","mergeCustomCats","customCatInUse","planImportWithCats","splitTransaction","cleanAccountData","accountBalances","addAccount","editAccount","addTransfer","accountInUse","mergeAccountData","parseCsvImport","netPosition","loanRemainingCents","reminderPlan","cleanReminderPrefs","reminderMessage","REMIND_DEFAULT",
  // Run 69: "Help improve the app"
  "readLearn","writeLearn","cleanPlace","learnPreview","sendLearning","LEARN_KEY",
  // interface language (from i18n.js when present)
  "t","tn","tIn","setLang","getLang","MESSAGES","LANGS","LANG_NAMES","LOCALES","catName","subName","monthName","monthShort","fmtLongDate"];
const have = names.filter((n) => new RegExp("(function\\s+" + n + "\\b|const\\s+" + n + "\\b)").test(body));
const tail = "\nexport { " + have.join(", ") + " };\nexport const getNotice=()=>LOAD_NOTICE; export const getSaveBlocked=()=>SAVE_BLOCKED;\nexport const resetFlags=()=>{LOAD_NOTICE=null;SAVE_BLOCKED=false;if(typeof SAVE_BLOCKED_READ!=='undefined')SAVE_BLOCKED_READ=false;};\n";
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body + tail, "utf8");
console.log(`harness: ${have.length} exports from ${path.basename(cand)} -> ${out}`);
