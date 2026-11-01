#!/usr/bin/env python3
"""Builds an importable module from the REAL candidate file: its data/logic layer, a controllable clock and an in-memory localStorage.
Usage: python3 harness.py [candidate.jsx] [out.mjs]"""
import re,sys,os
cand=sys.argv[1] if len(sys.argv)>1 else os.environ.get("CANDIDATE","/mnt/user-data/outputs/expense-tracker.jsx")
out=sys.argv[2] if len(sys.argv)>2 else os.environ.get("HARNESS","/tmp/tools/real.mjs")
src=open(cand,encoding="utf-8").read()
marker="// ─── SVG icon system"
assert src.count(marker)==1, "SVG marker not found exactly once"
data=re.sub(r'^import .*$','',src.split(marker)[0],flags=re.M)
def grab(name):
    a=src.find("function "+name+"(")
    if a<0: return ""
    return src[a:src.find("\n}\n",a)+3]
extra=""
for nm in ["calcHelperCards","nextDueDate"]:      # defined after the icon marker in older layouts
    if ("function "+nm+"(") not in data: extra+=grab(nm)+"\n"
stub='''
const RealDate=Date;
globalThis.__NOW=new RealDate(2026,9,13,12,0,0).getTime();
class FakeDate extends RealDate{ constructor(...a){ if(a.length===0) super(globalThis.__NOW); else super(...a);} static now(){return globalThis.__NOW;} }
globalThis.Date=FakeDate;
const __store=new Map(); globalThis.__failKeys=[]; globalThis.__throwAll=false;
globalThis.localStorage={ getItem:k=>{ if(globalThis.__throwAll) throw new Error("SecurityError"); return __store.has(k)?__store.get(k):null; },
  setItem:(k,v)=>{ if(globalThis.__throwAll||globalThis.__failKeys.some(f=>k.includes(f))) throw new Error("QuotaExceededError"); __store.set(k,String(v)); },
  removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>[...__store.keys()][i], get length(){return __store.size;} };
globalThis.__store=__store;
'''
body=stub+data+"\n"+extra
names=["migrateAndLoad","buildMerchantMemory","merchantSuggest","memKey","calcHelperCards","calcSafeToSpend","calcSpendingPace","calcBudgetStatus","calcMonthSummary","calcPatterns","calcGoalProgress","calcCategorySpend","calcWhatChanged","calcTxnStats","calcSpentToDate","prevMon","nMon","surplusLabel","surplusColor","normaliseTxn","addMonths","nextDueDate","strictNum","parseMoney","moneyReason","isUsableRawTxn","checkRawTxn","isValidDateStr","localDateStr","localMonthStr","parseLocalDate","daysInMonth","daysBetween","parseCSV","validateSettings","planImport","applyImport","buildBackup","buildCsv","countSuspectedDuplicates","txnFingerprint","partitionTransactions","ensureUniqueIds","summariseReasons","noteLoad","buildSchedules","scheduleOccurrences","scheduleMonthStatus","scheduleNextDue","scheduleKey","monthProgress","toMonthlyAmountHelper","fmt","detectRecurrence","calcMerchantProfile","resolveCategory","curMon","sanitizeTransactions","MAX_AMOUNT","CATEGORIES","CAT"]
have=[n for n in names if re.search(r'(function\s+'+n+r'\b|const\s+'+n+r'\b)',body)]
tail="\nexport { "+", ".join(have)+" };\nexport const getNotice=()=>LOAD_NOTICE; export const getSaveBlocked=()=>SAVE_BLOCKED;\nexport const resetFlags=()=>{LOAD_NOTICE=null;SAVE_BLOCKED=false;};\n"
os.makedirs(os.path.dirname(out),exist_ok=True)
open(out,"w",encoding="utf-8").write(body+tail)
print(f"harness: {len(have)} exports from {os.path.basename(cand)} -> {out}")
