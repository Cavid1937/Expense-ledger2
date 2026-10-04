# Expense Ledger v8 — Complete Implementation Specification

**Status:** Ready for full-stack rebuild  
**Target:** Single cohesive financial decision system  
**Scope:** Four phased upgrades to existing App.jsx  
**Outcome:** Production-ready personal finance control panel

---

## PHASE 1: Home Screen Reorder + Safe to Spend Clarity

### Goal
Transform home from "feature dashboard" to "financial position surface."

### Current Problems
- Templates clutter the above-fold space
- Safe to Spend is a single number, not a story
- Hierarchy is data-first, not decision-first
- User must hunt for "how much can I actually spend?"

### New Home Screen Hierarchy (Top to Bottom)

```
1. FINANCIAL POSITION (Hero)
   ├─ Month name + total spent (₼X.XX)
   ├─ Mom diff badge (↓ 12% vs last month / ↑ 18% vs last month)
   └─ Three stats: Income | Spent | Savings Rate / Balance

2. SAFE TO SPEND (Primary Decision Card)
   ├─ Big number: ₼X.XX available today
   ├─ Four explicit rows:
   │  ├─ Income this month: ₼Y.YY
   │  ├─ Committed recurring (already paid): ₼Z.ZZ
   │  ├─ Future recurring (expected, not yet paid): ₼A.AA
   │  └─ Discretionary remaining: ₼B.BB
   └─ Daily allowance: ₼C.CC per day for N days remaining

3. SPENDING PACE (Secondary Card)
   ├─ Visual progress: Day X of Y
   ├─ Daily average: ₼D.DD
   └─ Projected month end: ₼E.EE (on track / over pace)

4. GOALS (Priority Section)
   ├─ Each goal card shows:
   │  ├─ Goal name + target amount
   │  ├─ Progress bar (%)
   │  ├─ Saved amount / Target amount
   │  ├─ Months to completion (if monthly target is set)
   │  └─ What-if: "If I add ₼50/mo, complete in 8mo" (inline hint)

5. BUDGETS (Category Limits)
   ├─ Show only categories with budgets set
   ├─ Status: spent / limit + % used
   ├─ Color: green (ok) / yellow (80%+) / red (over)

6. UPCOMING RECURRING (Next 7 Days)
   ├─ Show recurring transactions due in next week
   ├─ Name | Amount | Days until due
   └─ Only if recurring and isActive=true

7. RECENT ACTIVITY (Historical)
   ├─ Last 7 transactions grouped by date
   ├─ On click: transaction detail sheet

8. EMPTY STATE (If no transactions)
   └─ "Tap + to add your first transaction"

### What to Remove
- Quick-add templates from home (move to Add Transaction overlay only)
- Reduce visual clutter
- Keep only decision-critical information

### Implementation Details

**Safe to Spend Four-Line Breakdown Logic:**

```javascript
// Existing calculations, but with explicit display model:

const curInc = income this month
const committedRecurring = sum of active recurring transactions already recorded this month
const futureRecurring = sum of active recurring transactions due future days
const discretionary = curInc - committedRecurring - futureRecurring

// Display:
// Income: ₼{curInc}
// Committed (paid): ₼{committedRecurring}
// Future (expected): ₼{futureRecurring}
// Discretionary: ₼{discretionary}
// Daily: ₼{discretionary / daysRemaining}
```

**Key Distinction:**
- Committed recurring = recurring expenses already recorded this month
- Future recurring = recurring expenses that are active but not yet paid (e.g., rent due on 25th, today is 10th)
- This distinction is critical for forecasting and planning

---

## PHASE 2: What Changed — Recurring vs One-Off Classification

### Goal
Turn variance analysis from "numbers changed" into "here's why and what it means."

### Current State
- Calculates category and merchant diffs correctly
- Lacks explanation layer: is this recurring or temporary?

### New "What Changed" Card Structure

```
Header: "What Changed vs {Previous Month}"

Row 1: Total spending
├─ Diff amount: ₼+X.XX (recurring increase) or ₼−Y.YY (one-off decrease)
└─ Before: ₼Z.ZZ → After: ₼A.AA

Category Changes (Top 5):
├─ Category name | Icon
├─ Diff: ₼±X.XX [RECURRING/ONE-OFF label]
├─ Was: ₼P.PP → Now: ₼Q.QQ
└─ Context: "driven by Bravo and Café Baku" (if >1 merchant)

Merchant Changes (Top 5):
├─ Merchant name
├─ Diff: ₼±X.XX [RECURRING/ONE-OFF label]
└─ Category: {category} / {subcategory}
```

### Classification Logic

**For each category/merchant diff:**

1. **Is it recurring?**
   - Check if ANY transaction for that merchant/category has `recurring:true`
   - Yes → label "recurring"
   - No → label "one-off"

2. **If recurring, add context:**
   - "recurring" = expected pattern, likely structural
   - "one-off" = unusual, likely temporary

3. **If multiple merchants drive a category change:**
   - List top 2-3 merchants by contribution
   - "Food +12%: driven by Bravo (+₼5), Café Baku (+₼3)"

4. **Calculate contribution:**
   - Each merchant's delta vs previous period
   - Sort by absolute impact
   - Show top 3-5

### Implementation Details

```javascript
function calcWhatChanged(transactions, mon=curMon(), prv=prevMon()) {
  // Existing logic for catChanges and merchantChanges...
  
  // ADD: recurringLabel for each change
  
  const catChanges = [...].map(change => ({
    ...change,
    recurringLabel: determineRecurringLabel(
      change.catId,
      transactions,
      mon,
      prv
    )
  }));
  
  const merchantChanges = [...].map(change => ({
    ...change,
    recurringLabel: determineRecurringLabel(
      change.merchant,
      transactions,
      mon,
      prv,
      'merchant'
    )
  }));
  
  return { catChanges, merchantChanges };
}

function determineRecurringLabel(identifier, transactions, mon, prv, type='category') {
  // Check if any transaction in this period has recurring=true
  const isRecurring = transactions.some(t => 
    t.recurring === true &&
    t.recurFreq !== null &&
    t.isActive !== false &&
    (type === 'category' ? t.category === identifier : t.merchant === identifier)
  );
  
  return isRecurring ? 'recurring' : 'one-off';
}
```

### UI Changes

**What Changed Card:**
- Add badge next to each diff: `[RECURRING]` or `[ONE-OFF]`
- Color: recurring = blue/default, one-off = yellow/warning
- On hover/tap: show explanation tooltip

Example display:
```
Food +₼18.40 [RECURRING]
  Bravo: +₼12 | Café Baku: +₼6.40
  
Transport −₼3.50 [ONE-OFF]
  Reduced taxi usage this month
```

---

## PHASE 3: Merchant Profile — Frequency, Timing, Recurrence Detection

### Goal
Transform merchant memory from "category suggestion" into "merchant intelligence profile."

### Current State
- buildMerchantMemory() stores merchant → {category, subcategory}
- Merchant detail sheet shows: count, avg, total, 30-day delta
- Missing: frequency, timing, recurrence detection

### New Merchant Profile Data Model

```javascript
const merchantProfile = {
  merchant: "Bravo",
  
  // Existing
  lastCategory: "food",
  lastSubcategory: "Groceries",
  
  // Frequency
  visitCount: 12,           // total transactions
  visitCountThisMonth: 3,   // this month only
  visitCount30Days: 4,      // last 30 days
  avgDaysBetweenVisits: 7,  // average gap between purchases
  minDaysBetween: 3,        // closest two visits
  maxDaysBetween: 14,       // furthest two visits
  
  // Timing
  mostCommonDayOfWeek: "Saturday",  // mode of (Mon-Sun)
  dayOfWeekFrequency: {
    Monday: 1, Tuesday: 2, Wednesday: 3, ... Saturday: 5
  },
  mostCommonTimeOfMonth: "week-2",  // "week-1" | "week-2" | "week-3" | "week-4"
  
  // Amount
  avgSpend: 34.50,          // average per transaction
  minSpend: 8.00,           // min transaction
  maxSpend: 89.99,          // max transaction
  stdDevSpend: 15.20,       // spending variance
  totalSpend: 414.00,       // all-time
  
  // Category
  categoryConsistency: 0.95, // % transactions in primary category
  primaryCategory: "food",
  primarySubcategory: "Groceries",
  allSubcategories: ["Groceries", "Coffee", "Restaurants"],
  
  // Recurrence Detection
  isRecurring: true,        // has any recurring:true transaction
  recurringFreq: "weekly",  // detected frequency ("weekly"|"biweekly"|"monthly"|"yearly"|"irregular")
  recurringConfidence: 0.92, // 0-1 confidence score
  
  // Trend
  spendingTrend: "stable",  // "increasing" | "decreasing" | "stable"
  trendDelta: +2.5,         // % change year-over-year or period-over-period
  
  // Forecast
  estimatedNextVisit: "2026-10-11", // predicted date
  estimatedNextSpend: 35.00,        // predicted amount
}
```

### Recurrence Detection Algorithm

```javascript
function detectRecurrence(transactions, merchant) {
  const txns = transactions
    .filter(t => t.merchant === merchant && t.type === 'expense')
    .sort((a, b) => a.date.localeCompare(b.date));
  
  if (txns.length < 3) return { isRecurring: false, confidence: 0 };
  
  // Calculate gaps between transactions
  const gaps = [];
  for (let i = 1; i < txns.length; i++) {
    const d1 = new Date(txns[i-1].date);
    const d2 = new Date(txns[i].date);
    const days = Math.round((d2 - d1) / 86400000);
    gaps.push(days);
  }
  
  // Detect pattern
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const stdDev = Math.sqrt(
    gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length
  );
  
  // If std dev is low relative to mean, it's regular
  const coefficient = stdDev / avgGap;
  const confidence = Math.max(0, 1 - coefficient);
  
  // Classify frequency
  let frequency = 'irregular';
  if (avgGap >= 5 && avgGap <= 9) frequency = 'weekly';
  else if (avgGap >= 12 && avgGap <= 16) frequency = 'biweekly';
  else if (avgGap >= 25 && avgGap <= 35) frequency = 'monthly';
  else if (avgGap >= 300 && avgGap <= 400) frequency = 'yearly';
  
  return {
    isRecurring: confidence > 0.7,
    recurringFreq: frequency,
    recurringConfidence: confidence,
    avgDaysBetweenVisits: Math.round(avgGap),
  };
}
```

### Frequency & Timing Calculation

```javascript
function getMerchantProfile(transactions, merchant) {
  const txns = transactions.filter(t => t.merchant === merchant && t.type === 'expense');
  
  if (txns.length === 0) return null;
  
  const dates = txns.map(t => t.date).sort();
  
  // Visit count
  const visitCount = txns.length;
  const visitCount30 = txns.filter(t => {
    const days = (new Date() - new Date(t.date)) / 86400000;
    return days <= 30;
  }).length;
  
  // Days between visits
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    const d1 = new Date(dates[i-1]);
    const d2 = new Date(dates[i]);
    gaps.push(Math.round((d2 - d1) / 86400000));
  }
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b) / gaps.length : 0;
  
  // Day of week frequency
  const dayFreq = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  txns.forEach(t => {
    const dow = new Date(t.date + 'T00:00:00').getDay();
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow];
    dayFreq[dayName]++;
  });
  const mostCommonDay = Object.entries(dayFreq).sort((a, b) => b[1] - a[1])[0][0];
  
  // Category consistency
  const categories = txns.map(t => t.category);
  const primaryCat = categories.sort((a, b) => 
    categories.filter(x => x === a).length - categories.filter(x => x === b).length
  )[0];
  const consistency = categories.filter(c => c === primaryCat).length / categories.length;
  
  // Spending stats
  const amounts = txns.map(t => t.amount);
  const avgSpend = amounts.reduce((a, b) => a + b) / amounts.length;
  const minSpend = Math.min(...amounts);
  const maxSpend = Math.max(...amounts);
  const stdDev = Math.sqrt(
    amounts.reduce((s, a) => s + Math.pow(a - avgSpend, 2), 0) / amounts.length
  );
  
  // Recurrence
  const recurrence = detectRecurrence(transactions, merchant);
  
  return {
    merchant,
    visitCount,
    visitCount30Days: visitCount30,
    avgDaysBetweenVisits: Math.round(avgGap),
    mostCommonDayOfWeek: mostCommonDay,
    avgSpend: parseFloat(avgSpend.toFixed(2)),
    minSpend,
    maxSpend,
    stdDevSpend: parseFloat(stdDev.toFixed(2)),
    totalSpend: parseFloat(amounts.reduce((a, b) => a + b).toFixed(2)),
    categoryConsistency: consistency,
    ...recurrence,
    lastTransaction: txns[txns.length - 1],
  };
}
```

### Where to Display Merchant Profile

**1. In Ledger Page (when clicking a transaction):**
- Show existing TxnDetailSheet
- Add section at bottom: "Merchant Profile"
- Display: visits, avg spend, next likely date, frequency

**2. In Analytics (new Merchant Report):**
- List all merchants by spend
- Show top 10 merchants with full profile
- Trend: is this merchant increasing or decreasing?

**3. In Add Transaction (auto-suggest):**
- Show suggested next amount: "Usually ₼35, last time ₼32"
- Show suggested date: "Usually Saturdays (last: Oct 5)"
- Show suggested category: "Usually Groceries"

### UI for Merchant Profile Card

```
┌─ Bravo ──────────────────────┐
│ ₼34.50 avg | 12 visits total │
│                               │
│ Visits:    12 total, 3 mo     │
│ Frequency: Weekly (±2 days)   │
│ Likely day: Saturday          │
│ Category:  Food / Groceries   │
│                               │
│ Spending trend: ↓ Stable      │
│ Next visit:    ~Oct 11        │
│ Next est.:     ~₼35.00        │
└───────────────────────────────┘
```

---

## PHASE 4: Goals — Target Date, What-If, Milestone Tracking

### Goal
Make goals forward-looking and interactive, not just progress bars.

### Current State
- Goals have target, saved, monthlyTarget
- Progress shows % complete
- Missing: target date, what-if scenarios, completion forecast

### New Goal Data Model

```javascript
const goal = {
  id: "g1704067200",
  name: "Emergency Fund",
  target: 3000,
  saved: 1250,
  monthlyTarget: 250,
  
  // NEW: Timeline
  targetDate: "2026-12-31",        // desired completion date
  startDate: "2025-01-01",         // when goal was created
  
  // NEW: Forecasting
  projectedCompletionDate: "2026-10-15",  // calculated from monthlyTarget
  monthsUntilTarget: 10,                   // calculated
  isOnTrack: true,                         // is current pace beating target date?
  
  // NEW: What-If
  whatIfScenarios: [
    { name: "Current pace", monthlyTarget: 250, completionDate: "2026-10-15" },
    { name: "Add 50/mo", monthlyTarget: 300, completionDate: "2026-09-20" },
    { name: "Add 100/mo", monthlyTarget: 350, completionDate: "2026-08-25" },
    { name: "Reduce to 100/mo", monthlyTarget: 100, completionDate: "2027-11-30" },
  ],
  
  // NEW: Milestones
  milestones: [
    { name: "25%", amount: 750, completedDate: "2025-07-15", daysToReach: 196 },
    { name: "50%", amount: 1500, completedDate: null, daysToReach: null },
    { name: "75%", amount: 2250, completedDate: null, daysToReach: null },
    { name: "100%", amount: 3000, completedDate: null, daysToReach: null },
  ],
  
  // NEW: Category tracking (optional)
  linkedCategory: "finance",       // which budget contributes to this goal?
  linkedMerchant: null,            // which merchant / recurring payment?
  
  // Metadata
  priority: 1,                     // 1=high, 2=medium, 3=low
  isActive: true,
  color: "#2D6A4F",
  notes: "Emergency fund for unexpected expenses",
}
```

### Goal Forecasting Logic

```javascript
function calcGoalForecast(goal) {
  const { target, saved, monthlyTarget, targetDate } = goal;
  
  const remaining = Math.max(0, target - saved);
  const pct = Math.min(100, (saved / target) * 100);
  
  // How many months to reach target at current rate?
  let monthsNeeded = null;
  if (monthlyTarget > 0 && remaining > 0) {
    monthsNeeded = Math.ceil(remaining / monthlyTarget);
  }
  
  // Projected completion
  let projectedDate = null;
  if (monthsNeeded !== null) {
    const now = new Date();
    const projected = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, now.getDate());
    projectedDate = formatDateISO(projected);
  }
  
  // On track check
  let isOnTrack = null;
  if (targetDate && projectedDate) {
    const targetMs = new Date(targetDate).getTime();
    const projectedMs = new Date(projectedDate).getTime();
    isOnTrack = projectedMs <= targetMs;
  }
  
  // What-if scenarios
  const scenarios = [
    { name: "Current pace", monthlyTarget, completionDate: projectedDate },
    { name: "Add ₼50/mo", monthlyTarget: monthlyTarget + 50, completionDate: calcCompletionDate(remaining, monthlyTarget + 50) },
    { name: "Add ₼100/mo", monthlyTarget: monthlyTarget + 100, completionDate: calcCompletionDate(remaining, monthlyTarget + 100) },
    { name: "Add ₼150/mo", monthlyTarget: monthlyTarget + 150, completionDate: calcCompletionDate(remaining, monthlyTarget + 150) },
  ];
  
  // Milestones
  const milestones = [
    { pct: 25, amount: target * 0.25 },
    { pct: 50, amount: target * 0.50 },
    { pct: 75, amount: target * 0.75 },
    { pct: 100, amount: target },
  ].map(m => ({
    ...m,
    completed: saved >= m.amount,
  }));
  
  return {
    pct,
    remaining,
    monthsNeeded,
    projectedDate,
    isOnTrack,
    scenarios,
    milestones,
  };
}

function calcCompletionDate(remaining, monthlyTarget) {
  if (monthlyTarget <= 0 || remaining <= 0) return null;
  const monthsNeeded = Math.ceil(remaining / monthlyTarget);
  const now = new Date();
  const completed = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, now.getDate());
  return formatDateISO(completed);
}
```

### Goal Display on Home

```
┌─ Emergency Fund ───────────┐
│ ₼1,250 of ₼3,000 (42%)     │
│ ░░░░░░░░░░░░░░░            │
│                             │
│ Current: ₼250/mo            │
│ Completion: Oct 15, 2026    │
│ Status: ✓ On track         │
│                             │
│ What if I add ₼50/mo?       │
│ → Completes Sep 20, 2026    │
│ (25 days earlier)           │
└─────────────────────────────┘
```

### Goal Detail Sheet

Full breakdown:
- Name + description
- Target amount + current saved
- Target date + projected completion
- Current pace: ₼X/month
- Progress milestones (25%, 50%, 75%, 100%)
- What-if scenarios (interactive sliders or buttons)
- Edit button to adjust monthly target
- Delete button

---

## PHASE 5: Financial Patterns Engine — Deterministic Analysis

### Goal
Identify spending patterns, correlations, and anomalies from transaction history.

### Data Models

```javascript
const spendingPattern = {
  // Category patterns
  categoryPatterns: {
    food: {
      avgPerMonth: 340,
      stdDev: 45,
      isStable: true,
      trend: "stable",           // "increasing" | "decreasing" | "stable"
      trendPercent: +2.5,        // % change month-over-month
      seasonality: "none",       // "none" | "summer-high" | "winter-high" etc
      frequencyPerMonth: 23,     // how many transactions?
      topMerchants: ["Bravo", "Café Baku"],
    },
  },
  
  // Weekday vs weekend
  weekdayVsWeekend: {
    weekdayAvg: 18.50,
    weekendAvg: 24.30,
    ratio: 1.31,  // weekend spends 31% more
    isSignificant: true,
  },
  
  // Time of month patterns
  timeOfMonthPatterns: {
    "week-1": { avg: 95, count: 8 },
    "week-2": { avg: 112, count: 12 },
    "week-3": { avg: 78, count: 6 },
    "week-4": { avg: 55, count: 4 },
  },
  
  // Day of week patterns
  dayOfWeekPatterns: {
    "Monday": { avg: 28.50, count: 12 },
    "Tuesday": { avg: 22.30, count: 14 },
    "Wednesday": { avg: 19.80, count: 10 },
    "Thursday": { avg: 31.20, count: 11 },
    "Friday": { avg: 42.10, count: 15 },
    "Saturday": { avg: 55.60, count: 18 },
    "Sunday": { avg: 38.90, count: 9 },
  },
  
  // Anomaly detection
  anomalies: [
    { date: "2026-09-15", amount: 245.00, category: "shopping", reason: "3x normal", severity: "high" },
    { date: "2026-09-02", amount: 12.00, category: "food", reason: "below average", severity: "low" },
  ],
  
  // Correlation (when you spend on X, you also spend on Y)
  correlations: [
    { category1: "transport", category2: "food", correlation: 0.68, description: "Travel days often include more dining out" },
    { merchant: "Pitch 14", category: "entertain", frequency: "weekly", description: "Regular football matches" },
  ],
};
```

### Pattern Detection Algorithms

**1. Category Trend Detection**

```javascript
function detectCategoryTrend(transactions, category, months = 6) {
  const monthlyData = [];
  for (let i = 0; i < months; i++) {
    const mon = nMon(i);
    const sum = transactions
      .filter(t => t.category === category && t.date.startsWith(mon) && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    monthlyData.push({ month: mon, amount: sum });
  }
  
  // Regression to detect trend
  const n = monthlyData.length;
  const sumX = [...Array(n).keys()].reduce((s, x) => s + x, 0);
  const sumY = monthlyData.reduce((s, m) => s + m.amount, 0);
  const sumXY = monthlyData.reduce((s, m, i) => s + i * m.amount, 0);
  const sumX2 = [...Array(n).keys()].reduce((s, x) => s + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Classify
  let trend = 'stable';
  if (slope > 5) trend = 'increasing';
  if (slope < -5) trend = 'decreasing';
  
  const lastMonth = monthlyData[monthlyData.length - 1].amount;
  const prevMonth = monthlyData[monthlyData.length - 2].amount;
  const trendPercent = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;
  
  return { trend, trendPercent, slope, monthlyData };
}
```

**2. Weekday vs Weekend Pattern**

```javascript
function detectWeekdayWeekendPattern(transactions, month = curMon()) {
  const isWeekend = d => [0, 6].includes(new Date(d + 'T00:00:00').getDay());
  
  const weekday = transactions.filter(t => 
    t.type === 'expense' && t.date.startsWith(month) && !isWeekend(t.date)
  );
  const weekend = transactions.filter(t => 
    t.type === 'expense' && t.date.startsWith(month) && isWeekend(t.date)
  );
  
  const weekdayAvg = weekday.length ? weekday.reduce((s, t) => s + t.amount, 0) / weekday.length : 0;
  const weekendAvg = weekend.length ? weekend.reduce((s, t) => s + t.amount, 0) / weekend.length : 0;
  
  const ratio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 0;
  const isSignificant = Math.abs(ratio - 1) > 0.25; // 25% difference threshold
  
  return {
    weekdayAvg,
    weekendAvg,
    ratio,
    isSignificant,
    weekdayCount: weekday.length,
    weekendCount: weekend.length,
  };
}
```

**3. Day of Week Pattern**

```javascript
function detectDayOfWeekPattern(transactions, month = curMon()) {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const patterns = {};
  
  DAYS.forEach((day, dow) => {
    const txns = transactions.filter(t => 
      t.type === 'expense' &&
      t.date.startsWith(month) &&
      new Date(t.date + 'T00:00:00').getDay() === dow
    );
    
    const avg = txns.length ? txns.reduce((s, t) => s + t.amount, 0) / txns.length : 0;
    patterns[day] = { avg: parseFloat(avg.toFixed(2)), count: txns.length };
  });
  
  return patterns;
}
```

**4. Anomaly Detection**

```javascript
function detectAnomalies(transactions, month = curMon()) {
  const anomalies = [];
  
  // Per-category stats
  const catStats = {};
  transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(month))
    .forEach(t => {
      if (!catStats[t.category]) {
        const amounts = transactions
          .filter(tx => tx.category === t.category && tx.type === 'expense')
          .map(tx => tx.amount)
          .sort((a, b) => a - b);
        
        const median = amounts[Math.floor(amounts.length / 2)];
        const q1 = amounts[Math.floor(amounts.length / 4)];
        const q3 = amounts[Math.floor(3 * amounts.length / 4)];
        const iqr = q3 - q1;
        
        catStats[t.category] = { median, q1, q3, iqr };
      }
    });
  
  // Find outliers (IQR method)
  transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(month))
    .forEach(t => {
      const stats = catStats[t.category];
      if (!stats) return;
      
      const isHigh = t.amount > stats.q3 + 1.5 * stats.iqr;
      const isLow = t.amount < stats.q1 - 1.5 * stats.iqr;
      
      if (isHigh) {
        anomalies.push({
          date: t.date,
          amount: t.amount,
          category: t.category,
          merchant: t.merchant,
          reason: `${(t.amount / stats.median).toFixed(1)}x normal`,
          severity: 'high',
        });
      }
      
      if (isLow) {
        anomalies.push({
          date: t.date,
          amount: t.amount,
          category: t.category,
          merchant: t.merchant,
          reason: 'below average',
          severity: 'low',
        });
      }
    });
  
  return anomalies.slice(0, 10); // Top 10 anomalies
}
```

**5. Correlation Detection**

```javascript
function detectCorrelations(transactions, month = curMon()) {
  const correlations = [];
  
  // Category correlation: when you spend on X, do you spend on Y?
  const categoryDays = {};
  transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(month))
    .forEach(t => {
      if (!categoryDays[t.date]) categoryDays[t.date] = [];
      categoryDays[t.date].push(t.category);
    });
  
  // Find category pairs that appear together
  const pairCounts = {};
  Object.values(categoryDays).forEach(cats => {
    const unique = [...new Set(cats)];
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const pair = [unique[i], unique[j]].sort().join('-');
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      }
    }
  });
  
  // Score correlations
  const totalDays = Object.keys(categoryDays).length;
  Object.entries(pairCounts)
    .filter(([_, count]) => count >= totalDays * 0.3) // Appear together 30%+ of days
    .map(([pair, count]) => {
      const [cat1, cat2] = pair.split('-');
      return {
        category1: cat1,
        category2: cat2,
        frequency: count,
        correlation: count / totalDays,
      };
    })
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, 5)
    .forEach(c => correlations.push(c));
  
  return correlations;
}
```

### Where to Display Patterns

**1. Analytics Page (new section):**
- Spending trends by category (6-month chart)
- Weekday vs weekend pattern
- Day of week heatmap
- Anomalies this month
- Correlations

**2. Home Screen (if significant pattern found):**
- "Insight: You spend 40% more on weekends"
- "Anomaly: ₼180 on clothing (3x normal)"

**3. Merchant Detail:**
- Day of week pattern for that merchant
- Frequency consistency

---

## PHASE 6: Architecture Cleanup (Optional, Non-Blocking)

### Rationale
The single-file App.jsx works for this app's scope. Splitting is optional.

### If you decide to refactor, organize like this:

```
src/
├── App.jsx (root component, state orchestration)
├── styles/
│   └── App.css (extract CSS string to real file)
├── hooks/
│   └── useLedger.js (state + persistence logic)
├── utils/
│   ├── finance.js (calculations: calcMonthSummary, calcCategorySpend, etc)
│   ├── merchant.js (merchant logic: buildMerchantMemory, getMerchantProfile, etc)
│   ├── patterns.js (pattern detection: trends, anomalies, correlations)
│   ├── goals.js (goal forecasting)
│   ├── format.js (fmt, fmtDate, etc)
│   └── csv.js (parseCSV, export)
├── data/
│   └── categories.js (CATEGORIES, ICONS constants)
└── components/
    ├── HomePage.jsx
    ├── LedgerPage.jsx
    ├── AnalyticsPage.jsx
    ├── RecurringHub.jsx
    ├── AddEditOverlay.jsx
    ├── TxnDetailSheet.jsx
    ├── SettingsSheet.jsx
    └── (other components)
```

**Do not do this now.** The monolithic structure is fine for a solo app. Only refactor if:
- Team size grows
- App logic becomes hard to test
- You want to share logic across React Native, web, and desktop

---

## Implementation Roadmap

### Sprint 1: Home Screen Reorder + Safe to Spend Clarity
**Effort:** 2-3 hours  
**Risk:** Low  
**Impact:** High (immediate UX improvement)

Deliverables:
- New home screen hierarchy
- Four-line Safe to Spend breakdown
- Remove templates from home

### Sprint 2: What Changed + Recurring Flag
**Effort:** 1-2 hours  
**Risk:** Very low  
**Impact:** High (explanatory power)

Deliverables:
- Recurring/one-off classification
- Merchant contribution breakdown
- Updated What Changed card

### Sprint 3: Merchant Profile Intelligence
**Effort:** 3-4 hours  
**Risk:** Medium (algorithm complexity)  
**Impact:** High (enables forecasting)

Deliverables:
- getMerchantProfile() function
- Recurrence detection
- Frequency + timing analysis
- Display in transaction detail + add form

### Sprint 4: Goals Upgrade (Target Date + What-If)
**Effort:** 3-4 hours  
**Risk:** Medium  
**Impact:** High (forward-looking planning)

Deliverables:
- Goal forecasting engine
- What-if scenario calculation
- Milestone tracking
- Updated goal display + detail sheet

### Sprint 5: Financial Patterns Engine
**Effort:** 4-5 hours  
**Risk:** Medium (statistics)  
**Impact:** Medium (insights, not decisions)

Deliverables:
- Trend detection
- Weekday/weekend patterns
- Day of week heatmap
- Anomaly detection
- Correlation analysis
- New Analytics page section

### Sprint 6: Architecture Cleanup (Optional)
**Effort:** 6-8 hours  
**Risk:** High (large refactor)  
**Impact:** Low (no user-facing change)

Deliverables:
- Split App.jsx into modules
- Extract CSS to stylesheet
- Extract calculations to utils/
- Extract components

---

## Acceptance Criteria

### Phase 1: Home Reorder
- [ ] Home screen displays in new hierarchy order
- [ ] Safe to Spend shows four explicit lines (income / committed / future / discretionary)
- [ ] Templates removed from home
- [ ] All existing functionality preserved
- [ ] Mobile layout still correct

### Phase 2: What Changed
- [ ] What Changed card shows [RECURRING] or [ONE-OFF] badge for each change
- [ ] Badge is color-coded (blue for recurring, yellow for one-off)
- [ ] Merchant names are listed for category changes
- [ ] Logic correctly identifies recurring vs one-off

### Phase 3: Merchant Profile
- [ ] getMerchantProfile() returns all required fields
- [ ] Recurrence detection algorithm works on small datasets (2-3 txns)
- [ ] Frequency is correctly classified (weekly, biweekly, monthly, yearly, irregular)
- [ ] Day of week and average days between visits calculated
- [ ] Profile shown in transaction detail sheet
- [ ] Suggestions appear in add form

### Phase 4: Goals
- [ ] calcGoalForecast() returns correct projected date
- [ ] What-if scenarios show different completion dates
- [ ] Milestone progress shown
- [ ] Goal detail sheet displays all new information
- [ ] On-track indicator is correct

### Phase 5: Patterns
- [ ] Trend detection works for 6+ months of data
- [ ] Weekday/weekend pattern detected
- [ ] Day of week pattern shows highest/lowest spending days
- [ ] Anomalies correctly identified using IQR method
- [ ] Correlations found between categories/merchants

### Phase 6: Architecture (if done)
- [ ] All utilities are pure functions (no localStorage)
- [ ] Components are under 400 lines each
- [ ] CSS moved to real stylesheet
- [ ] App functionality identical to before

---

## Testing Checklist

### Data Integrity
- [ ] Import/export preserves all transaction fields
- [ ] Legacy category mapping works (old → new categories)
- [ ] CSV import handles commas, quotes, newlines correctly
- [ ] JSON backup can be fully restored

### Calculations
- [ ] Safe to Spend formula is consistent (income - commitments - target = available)
- [ ] Goal projections are accurate (+/- 1 day)
- [ ] Trend detection matches manual calculation
- [ ] What-if scenarios show linear progression

### UI/UX
- [ ] Home screen works on mobile (below 430px)
- [ ] All cards stack properly
- [ ] Safe to Spend is immediately obvious
- [ ] Goal what-if is interactive
- [ ] Merchant profile loads instantly

### Edge Cases
- [ ] App handles 0 transactions
- [ ] App handles 1000+ transactions
- [ ] Merchant with 1 transaction doesn't crash
- [ ] Goal with monthlyTarget=0 doesn't divide by zero
- [ ] Currency symbol displays correctly

---

## Success Metrics

After all phases:

1. **Decision Clarity**
   - User can answer "How much can I spend today?" in < 2 seconds
   - User can answer "When will I hit my goals?" in < 5 seconds

2. **Financial Confidence**
   - Safe to Spend is the first thing checked, not an afterthought
   - Goals feel forward-looking, not just tracking

3. **Insight Value**
   - User learns something new from "What Changed"
   - User discovers patterns they didn't know about

4. **Merchant Understanding**
   - User can see merchant frequency without opening transaction history
   - User gets better category suggestions based on merchant history

5. **Planning Capability**
   - User can adjust savings and see goal date change
   - User can set a target date and see if it's achievable

---

## Final Notes

- **Keep it deterministic.** No "AI-like" fuzzy logic. All calculations from transaction history.
- **Preserve functionality.** Every existing feature should work exactly as before.
- **Focus on clarity.** If it's not clear why a number is displayed, remove it.
- **Test on mobile.** This app is primarily used on phone.
- **Maintain data safety.** All data stays in localStorage. No cloud. No sync.

This spec is complete and implementation-ready. Each phase builds on the previous one. Start with Phase 1, validate it works, then move to Phase 2.

Good luck.
