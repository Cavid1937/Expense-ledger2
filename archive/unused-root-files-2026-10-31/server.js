// server.js
// =============================================================================
// Application entry point.
// Updated: initialises the subscription billing cron job after DB confirms
// healthy — ensuring the cron never runs against an unavailable database.
// =============================================================================

const { connectDB }            = require("./src/config/database");
const logger                   = require("./src/utils/logger");
const app                      = require("./src/app");
const { initSubscriptionCron } = require("./src/jobs/subscriptions.cron"); // NEW

const PORT = parseInt(process.env.PORT, 10) || 4000;
const HOST = process.env.HOST || "0.0.0.0";

async function start() {
  try {
    // 1. Verify PostgreSQL is reachable before accepting any traffic
    await connectDB();

    // 2. Start the HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`[server] Running on http://${HOST}:${PORT}`);
      logger.info(`[server] Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`[server] API base:    /api/${process.env.API_VERSION || "v1"}`);
    });

    // 3. Start the subscription billing cron job
    //    Registered AFTER the DB is confirmed healthy so the cron never fires
    //    against an unavailable database on server startup.
    //    Skipped in test environment to keep tests deterministic.
    if (process.env.NODE_ENV !== "test") {
      initSubscriptionCron(); // NEW
    }

    // ── Graceful shutdown ──────────────────────────────────────────────────────
    function shutdown(signal) {
      logger.info(`[server] ${signal} received — starting graceful shutdown`);

      server.close(async () => {
        logger.info("[server] HTTP server closed.");

        try {
          const { db } = require("./src/config/database");
          await db.destroy();
          logger.info("[server] Database pool closed.");
        } catch (err) {
          logger.error("[server] Error closing DB pool:", err.message);
        }

        logger.info("[server] Graceful shutdown complete. Exiting.");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("[server] Graceful shutdown timed out. Forcing exit.");
        process.exit(1);
      }, 10_000).unref();
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error("[server] Unhandled Promise Rejection:", reason);
      if (process.env.NODE_ENV === "production") process.exit(1);
    });

    process.on("uncaughtException", (err) => {
      logger.error("[server] Uncaught Exception:", err);
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error("[server] Failed to start:", error.message);
    process.exit(1);
  }
}

start();
