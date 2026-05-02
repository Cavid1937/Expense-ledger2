// knexfile.js
// =============================================================================
// Knex configuration file. Used by both the app (src/config/database.js) and
// the Knex CLI (for running migrations and seeds).
//
// Usage:
//   npx knex migrate:latest          (uses "development" by default)
//   NODE_ENV=production knex migrate:latest
// =============================================================================

require("dotenv").config();

/** @type {import('knex').Knex.Config} */
const baseConfig = {
  client: "pg", // PostgreSQL via the "pg" npm package

  migrations: {
    directory: "./migrations",   // Where migration files live
    tableName: "knex_migrations", // Table Knex uses to track applied migrations
    extension: "js",
  },

  seeds: {
    directory: "./seeds",
  },

  // Wrap identifiers (table/column names) in double-quotes.
  // This preserves casing and prevents conflicts with SQL reserved words.
  wrapIdentifier: (value, origImpl) => origImpl(value),

  // Convert snake_case DB columns → camelCase in JS automatically.
  // e.g. "password_hash" from DB becomes "passwordHash" in code.
  // NOTE: We intentionally DISABLE this here so column names stay explicit
  // and match our migration files exactly. This avoids subtle mapping bugs.
  postProcessResponse: null,
  wrapIdentifier: null,
};

module.exports = {
  // ── Development ─────────────────────────────────────────────────────────────
  development: {
    ...baseConfig,
    connection: process.env.DATABASE_URL || {
      host:     process.env.DB_HOST     || "127.0.0.1",
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || "expense_ledger",
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD || "password",
    },
    pool: {
      min: 2,
      max: 10,
    },
    // Log all SQL queries to console in development
    debug: false, // set to true to see raw SQL
  },

  // ── Test ────────────────────────────────────────────────────────────────────
  test: {
    ...baseConfig,
    connection: process.env.TEST_DATABASE_URL || {
      host:     "127.0.0.1",
      port:     5432,
      database: "expense_ledger_test",
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD || "password",
    },
    pool: { min: 1, max: 5 },
  },

  // ── Production ──────────────────────────────────────────────────────────────
  production: {
    ...baseConfig,
    connection: {
      connectionString: process.env.DATABASE_URL,
      // Required for managed databases (e.g. AWS RDS, Supabase, Railway)
      // that enforce SSL connections.
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min:                 parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max:                 parseInt(process.env.DB_POOL_MAX, 10) || 10,
      // How long (ms) a client can sit idle before being released
      idleTimeoutMillis:   30_000,
      // How long (ms) to wait for a connection before throwing
      acquireTimeoutMillis: 60_000,
    },
    // Never log SQL in production (security + noise)
    debug: false,
  },
};
