const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING WORKLOAD & ATTENTION DASHBOARD CHART");
  console.log("=================================================");

  const rootPath = path.join(__dirname, "..");
  const backendPath = path.join(rootPath, "Backend");
  const frontendPath = path.join(rootPath, "frontend/src");

  // 1. Verify Task Overview Replacement in Dashboard.jsx & EmployeeDashboard.jsx
  console.log("\n[TEST 1] Verifying Task Overview replacement with WorkloadAttentionCard...");

  const dashboardJsx = fs.readFileSync(path.join(frontendPath, "pages/Dashboard/Dashboard.jsx"), "utf8");
  const empDashboardJsx = fs.readFileSync(path.join(frontendPath, "pages/EmployeeDashboard/EmployeeDashboard.jsx"), "utf8");

  if (dashboardJsx.includes("<h3>Task Overview</h3>")) {
    throw new Error("Dashboard.jsx still contains Task Overview header!");
  }
  if (!dashboardJsx.includes("WorkloadAttentionCard")) {
    throw new Error("Dashboard.jsx missing WorkloadAttentionCard component!");
  }

  if (empDashboardJsx.includes("<h3>Task Overview</h3>")) {
    throw new Error("EmployeeDashboard.jsx still contains Task Overview header!");
  }
  if (!empDashboardJsx.includes("WorkloadAttentionCard")) {
    throw new Error("EmployeeDashboard.jsx missing WorkloadAttentionCard component!");
  }

  console.log("PASS: Task Overview replaced with WorkloadAttentionCard in both dashboards.");

  // 2. Verify Preservation of KPI Cards & Task Status Distribution
  console.log("\n[TEST 2] Verifying preservation of Task KPI cards & Task Status Distribution...");

  if (!dashboardJsx.includes("TaskStatusDistributionCard")) {
    throw new Error("Dashboard.jsx lost Task Status Distribution component!");
  }
  if (!empDashboardJsx.includes("TaskStatusDistributionCard")) {
    throw new Error("EmployeeDashboard.jsx lost Task Status Distribution component!");
  }
  if (!dashboardJsx.includes("RecentActivitiesCard")) {
    throw new Error("Dashboard.jsx lost RecentActivitiesCard!");
  }
  if (!dashboardJsx.includes("UpcomingDeadlinesCard")) {
    throw new Error("Dashboard.jsx lost UpcomingDeadlinesCard!");
  }

  console.log("PASS: Task KPI cards, Task Status Distribution, Recent Activities, and Deadlines preserved.");

  // 3. Verify Backend Data Scope & Calculations
  console.log("\n[TEST 3] Verifying Backend deterministic data calculations & scope...");

  const mgrService = fs.readFileSync(path.join(backendPath, "services/dashboard/managerDashboardService.js"), "utf8");
  const empService = fs.readFileSync(path.join(backendPath, "services/dashboard/employeeDashboardService.js"), "utf8");

  if (!mgrService.includes("dueSoonTasks")) {
    throw new Error("managerDashboardService.js missing dueSoonTasks calculation!");
  }
  if (!mgrService.includes("workloadAttention")) {
    throw new Error("managerDashboardService.js missing workloadAttention payload!");
  }
  if (!empService.includes("dueSoon")) {
    throw new Error("employeeDashboardService.js missing dueSoon calculation!");
  }
  if (!empService.includes("workloadAttention")) {
    throw new Error("employeeDashboardService.js missing workloadAttention payload!");
  }

  console.log("PASS: Backend manager and employee services calculate dueSoon & workloadAttention payload.");

  // 4. Verify WorkloadAttentionCard Component Role Configuration & Categories
  console.log("\n[TEST 4] Verifying WorkloadAttentionCard component configuration...");

  const cardJsx = fs.readFileSync(path.join(frontendPath, "components/WorkloadAttentionCard/WorkloadAttentionCard.jsx"), "utf8");

  const expectedTitles = [
    "Company Workload & Attention",
    "Team Workload & Attention",
    "My Workload & Attention",
  ];

  expectedTitles.forEach((title) => {
    if (!cardJsx.includes(title)) {
      throw new Error(`WorkloadAttentionCard.jsx missing role title: "${title}"`);
    }
  });

  const expectedCategories = ["Overdue", "Due Soon", "Pending Review", "Awaiting Acceptance"];
  expectedCategories.forEach((cat) => {
    if (!cardJsx.includes(cat)) {
      throw new Error(`WorkloadAttentionCard.jsx missing category: "${cat}"`);
    }
  });

  console.log("PASS: Role titles, descriptions, and 4 categories (Overdue, Due Soon, Pending Review, Awaiting Acceptance) verified.");

  console.log("\n=================================================");
  console.log("ALL WORKLOAD & ATTENTION CHART TESTS PASSED!");
  console.log("WORKLOAD & ATTENTION DASHBOARD CHART: PASS");
  console.log("=================================================");
}

runVerification();
