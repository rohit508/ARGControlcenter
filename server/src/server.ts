import { app } from "./app";
import { env } from "./env";
import { pool } from "./db/client";
import { scheduleKpiSnapshotJob } from "./jobs/kpiSnapshot.job";
import { scheduleOverdueTaskSweepJob } from "./jobs/overdueTaskSweep.job";

const server = app.listen(env.PORT, () => {
  console.log(`ERP API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  scheduleKpiSnapshotJob();
  scheduleOverdueTaskSweepJob();
});

/**
 * Graceful shutdown: stop accepting new connections, let in-flight requests finish, then close
 * the DB handle cleanly. Without this, a container orchestrator's SIGTERM during a deploy just
 * kills in-flight requests and can leave connections dangling against Postgres — cheap insurance
 * for something that's easy to forget until it bites in production.
 */
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async (err) => {
    if (err) {
      console.error("Error during server close:", err);
      process.exit(1);
    }
    try {
      await pool.end();
    } catch (e) {
      console.error("Error closing database:", e);
    }
    console.log("Shutdown complete.");
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs (e.g. a connection that never finishes)
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});
