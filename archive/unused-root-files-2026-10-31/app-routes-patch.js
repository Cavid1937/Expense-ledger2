// ─────────────────────────────────────────────────────────────────────────────
// ADD THESE TWO LINES to src/app.js, in the "── API routes ──" section,
// directly below the existing authRoutes mount. No other changes needed.
// ─────────────────────────────────────────────────────────────────────────────

// At the top of app.js, add these two require() calls:
const transactionsRoutes = require("./modules/transactions/transactions.routes");
const budgetsRoutes      = require("./modules/budgets/budgets.routes");

// In the "── API routes ──" section, add these two lines after authRoutes:
app.use(`${API_PREFIX}/transactions`, transactionsRoutes);
app.use(`${API_PREFIX}/budgets`,      budgetsRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// The full updated routes block in app.js should look like this:
// ─────────────────────────────────────────────────────────────────────────────

/*
const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${API_PREFIX}/auth`,         authRoutes);
app.use(`${API_PREFIX}/transactions`, transactionsRoutes);
app.use(`${API_PREFIX}/budgets`,      budgetsRoutes);
*/
