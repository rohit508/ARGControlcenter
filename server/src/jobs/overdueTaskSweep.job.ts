import cron from "node-cron";
import { sweepOverdueTasks } from "../modules/employee-tasks/employee-tasks.service";

export function scheduleOverdueTaskSweepJob() {
  // Every 15 minutes. Kept as a named export (not run at import time) so tests never trigger it.
  // Reads/writes already compute the same transition live via getEffectiveStatus() — this sweep
  // just persists it so audit history, notifications, and stats stay accurate between requests.
  cron.schedule("*/15 * * * *", () => {
    sweepOverdueTasks().catch((err) => console.error("[overdueTaskSweep.job] failed:", err));
  });
}
