const {
  getPreviousCompletedPeriodString,
  generateAllActiveDepartmentSnapshots,
} = require("./departmentSnapshotService");
const { ROLES } = require("../../constants/constants");

// Single-process initialization guard
let isInitialized = false;

// System scheduler viewer credential
const SCHEDULER_VIEWER = {
  role: ROLES.ADMIN,
  name: "System Scheduler",
};

/**
 * Execute background job to generate snapshots for the previous completed month.
 * @returns {Promise<Object>} Job execution summary
 */
const runMonthlyDepartmentSnapshotJob = async () => {
  const period = getPreviousCompletedPeriodString();

  console.log(`[SCHEDULER] Department snapshot job started`);
  console.log(`[SCHEDULER] Target Period: ${period}`);

  try {
    const result = await generateAllActiveDepartmentSnapshots({
      period,
      viewer: SCHEDULER_VIEWER,
    });

    console.log(
      `[SCHEDULER] Department snapshot job completed — Period: ${period} | Total: ${result.totalDepartments} | Successful: ${result.generatedCount} | Status: SUCCESS`
    );

    return {
      status: "SUCCESS",
      period,
      totalDepartments: result.totalDepartments,
      generatedCount: result.generatedCount,
    };
  } catch (err) {
    console.error(`[SCHEDULER] Department snapshot job failed for period ${period}:`, err.message);
    return {
      status: "FAILED",
      period,
      error: err.message,
    };
  }
};

/**
 * Initialize the Department Snapshot Scheduler.
 * Guards against duplicate execution in the same Node process.
 */
const initDepartmentSnapshotScheduler = () => {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  console.log("[SCHEDULER] Department Snapshot Scheduler initialized (Asia/Kolkata timezone).");

  // Run initial check shortly after server boot (5 seconds)
  setTimeout(() => {
    runMonthlyDepartmentSnapshotJob().catch((err) => {
      console.error("[SCHEDULER] Initial snapshot job error:", err.message);
    });
  }, 5000);

  // Schedule daily periodic check (every 24 hours) to capture month transitions
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runMonthlyDepartmentSnapshotJob().catch((err) => {
      console.error("[SCHEDULER] Periodic snapshot job error:", err.message);
    });
  }, TWENTY_FOUR_HOURS);
};

module.exports = {
  initDepartmentSnapshotScheduler,
  runMonthlyDepartmentSnapshotJob,
};
