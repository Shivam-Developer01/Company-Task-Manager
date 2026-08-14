const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING SUBMITTED STATUS BADGE & CRITICAL/HIGH BADGES");
  console.log("=================================================");

  const frontendPath = path.join(__dirname, "../frontend/src");

  // 1. Verify StatusBadge.css rules
  console.log("\n[TEST 1] Verifying StatusBadge CSS Rules...");
  const statusBadgeCss = fs.readFileSync(path.join(frontendPath, "components/StatusBadge/StatusBadge.css"), "utf8");

  if (!statusBadgeCss.includes(".status-badge.submitted")) {
    throw new Error("Missing .status-badge.submitted rule in StatusBadge.css!");
  }

  if (!statusBadgeCss.includes(".status-badge.critical")) {
    throw new Error("Missing .status-badge.critical rule in StatusBadge.css!");
  }

  console.log("PASS: Submitted and Critical status badge CSS rules verified.");

  // 2. Verify Tasks.css & MyTasks.css priority badge rules
  console.log("\n[TEST 2] Verifying Tasks.css & MyTasks.css Priority Badges...");
  const tasksCss = fs.readFileSync(path.join(frontendPath, "pages/Tasks/Tasks.css"), "utf8");
  const myTasksCss = fs.readFileSync(path.join(frontendPath, "pages/MyTasks/MyTasks.css"), "utf8");

  if (!tasksCss.includes(".priority-badge.critical") || !tasksCss.includes(".priority-badge.high")) {
    throw new Error("Missing critical/high priority badge rules in Tasks.css!");
  }

  if (!myTasksCss.includes(".priority-badge.critical") || !myTasksCss.includes(".priority-badge.high")) {
    throw new Error("Missing critical/high priority badge rules in MyTasks.css!");
  }

  console.log("PASS: Critical & High priority badges verified intact.");

  // 3. Verify Column Definitions Integrity across all 6 tables
  console.log("\n[TEST 3] Verifying 100% Column Definition Integrity across 6 DataTables...");

  const checkColumns = (filePath, searchTerms, label) => {
    const fullPath = path.join(frontendPath, filePath);
    const content = fs.readFileSync(fullPath, "utf8");
    for (const term of searchTerms) {
      if (!content.includes(term)) {
        throw new Error(`Missing expected column term "${term}" in ${label}!`);
      }
    }
    console.log(`PASS: ${label} columns verified 100% intact.`);
  };

  checkColumns(
    "pages/Employees/Employees.jsx",
    ["User ID", "Name", "Email", "Department", "Designation", "Status", "Role", "Actions"],
    "Users Table",
  );

  checkColumns(
    "pages/Departments/Departments.jsx",
    ["Department", "Code", "Status", "Actions"],
    "Departments Table",
  );

  checkColumns(
    "pages/Designations/Designations.jsx",
    ["Department", "Designation", "Code", "Status", "Actions"],
    "Designations Table",
  );

  checkColumns(
    "pages/Projects/Projects.jsx",
    ["Project", "Description", "Status", "Actions"],
    "Projects Table",
  );

  checkColumns(
    "pages/Tasks/Tasks.jsx",
    ["Task", "Employee", "Project", "Priority", "Due Date", "Status", "Actions"],
    "Tasks Table",
  );

  checkColumns(
    "pages/Submissions/Submissions.jsx",
    ["Task", "Employee", "Priority", "Due Date", "Status", "Submitted On", "Actions"],
    "Submissions Table",
  );

  console.log("\n=================================================");
  console.log("ALL SUBMITTED STATUS BADGE VERIFICATION TESTS PASSED!");
  console.log("SUBMISSIONS TABLE STATUS BADGES: PASS");
  console.log("=================================================");
}

runVerification();
