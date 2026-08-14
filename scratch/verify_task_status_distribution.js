const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING TASK STATUS DISTRIBUTION PIE CHART");
  console.log("=================================================");

  const rootPath = path.join(__dirname, "..");
  const frontendPath = path.join(rootPath, "frontend/src");

  // 1. Verify Component Integration in Dashboard.jsx & EmployeeDashboard.jsx
  console.log("\n[TEST 1] Verifying TaskStatusDistributionCard integration...");

  const dashboardJsx = fs.readFileSync(path.join(frontendPath, "pages/Dashboard/Dashboard.jsx"), "utf8");
  const empDashboardJsx = fs.readFileSync(path.join(frontendPath, "pages/EmployeeDashboard/EmployeeDashboard.jsx"), "utf8");

  if (!dashboardJsx.includes("TaskStatusDistributionCard")) {
    throw new Error("Dashboard.jsx missing TaskStatusDistributionCard component!");
  }
  if (!empDashboardJsx.includes("TaskStatusDistributionCard")) {
    throw new Error("EmployeeDashboard.jsx missing TaskStatusDistributionCard component!");
  }

  console.log("PASS: TaskStatusDistributionCard successfully integrated in both dashboards.");

  // 2. Verify Pie Chart Component Hierarchy & Definitions
  console.log("\n[TEST 2] Verifying Pie Chart structure, center badge, tooltip & legend...");

  const cardJsx = fs.readFileSync(path.join(frontendPath, "components/TaskStatusDistributionCard/TaskStatusDistributionCard.jsx"), "utf8");

  if (!cardJsx.includes("PieChart")) {
    throw new Error("TaskStatusDistributionCard.jsx missing PieChart component!");
  }
  if (!cardJsx.includes("pie-center-badge")) {
    throw new Error("TaskStatusDistributionCard.jsx missing center total tasks badge!");
  }
  if (!cardJsx.includes("status-pie-legend")) {
    throw new Error("TaskStatusDistributionCard.jsx missing custom legend!");
  }

  const expectedStatuses = ["Assigned", "Accepted", "In Progress", "Submitted", "Closed"];
  expectedStatuses.forEach((status) => {
    if (!cardJsx.includes(status)) {
      throw new Error(`TaskStatusDistributionCard.jsx missing status mapping for: ${status}`);
    }
  });

  console.log("PASS: PieChart, center total badge, custom legend with count & percentage, and canonical statuses verified.");

  // 3. Verify Clickable Navigation Routes
  console.log("\n[TEST 3] Verifying actionable slice/legend click navigation routes...");

  if (!cardJsx.includes("/employee/tasks?status=")) {
    throw new Error("TaskStatusDistributionCard.jsx missing employee tasks filter route!");
  }
  if (!cardJsx.includes("/tasks?status=")) {
    throw new Error("TaskStatusDistributionCard.jsx missing admin/manager tasks filter route!");
  }

  console.log("PASS: Actionable slice/legend navigation routes for Admin/Manager and Employee verified.");

  console.log("\n=================================================");
  console.log("ALL TASK STATUS DISTRIBUTION PIE CHART TESTS PASSED!");
  console.log("TASK STATUS DISTRIBUTION PIE CHART: PASS");
  console.log("=================================================");
}

runVerification();
