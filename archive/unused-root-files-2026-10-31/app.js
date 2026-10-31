// src/app.js
// =============================================================================
// Express application factory — final version with all five API modules.
// =============================================================================

require("dotenv").config();
require("express-async-errors");

const express     = require("express");
const helmet      = require("helmet");
const cors        = require("cors");
const compression = require("compression");
const morgan      = require("morgan");

const { errorHandler } = require("./middleware/errorHandler");
const logger           = require("./utils/logger");

// ── Route imports ──────────────────────────────────────────────────────────────
const authRoutes          = require("./modules/auth/auth.routes");
const accountsRoutes      = require("./modules/accounts/accounts.routes");
const categoriesRoutes    = require("./modules/categories/categories.routes");
const transactionsRoutes  = require("./modules/transactions/transactions.routes");
const budgetsRoutes       = require("./modules/budgets/budgets.routes");
const subscriptionsRoutes = require("./modules/subscriptions/subscriptions.routes"); // NEW

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" is not allowed`));
  },
  credentials:          true,
  allowedHeaders:       ["Content-Type", "Authorization"],
  methods:              ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200,
}));

// ── Parsing & compression ─────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// ── HTTP logging ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
  app.use(morgan(morganFormat, {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${API_PREFIX}/auth`,          authRoutes);
app.use(`${API_PREFIX}/accounts`,      accountsRoutes);
app.use(`${API_PREFIX}/categories`,    categoriesRoutes);
app.use(`${API_PREFIX}/transactions`,  transactionsRoutes);
app.use(`${API_PREFIX}/budgets`,       budgetsRoutes);
app.use(`${API_PREFIX}/subscriptions`, subscriptionsRoutes); // NEW

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: [${req.method}] ${req.originalUrl}`,
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
