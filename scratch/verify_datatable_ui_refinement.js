const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING DATA TABLE HEADER COLORS & CRITICAL BADGE");
  console.log("=================================================");

  const frontendPath = path.join(__dirname, "../frontend/src");

  // 1. Verify Column Definition Integrity & Header Colors across 6 DataTables
  console.log("\n[TEST 1] Verifying Header Colors & Column Definitions...");

  const checkTableConfig = (filePath, expectedHeaderColor, searchTerms, label) => {
    const fullPath = path.join(frontendPath, filePath);
    const content = fs.readFileSync(fullPath, "utf8");
    console.log(`Checking ${label} (${filePath})...`);

    if (!content.includes(`headerColor="${expectedHeaderColor}"`)) {
      throw new Error(`Missing expected headerColor="${expectedHeaderColor}" in ${label}!`);
    }

    for (const term of searchTerms) {
      if (!content.includes(term)) {
        throw new Error(`Missing expected column term "${term}" in ${label}!`);
      }
    }
    console.log(`PASS: ${label} header color (${expectedHeaderColor}) and columns verified intact.`);
  };

  // 1. Users → #2563eb
  checkTableConfig(
    "pages/Employees/Employees.jsx",
    "#2563eb",
    ["User ID", "Name", "Email", "Department", "Designation", "Status", "Role", "Actions"],
    "Users Table",
  );

  // 2. Departments → #8b5cf6
  checkTableConfig(
    "pages/Departments/Departments.jsx",
    "#8b5cf6",
    ["Department", "Code", "Status", "Actions"],
    "Departments Table",
  );

  // 3. Designations → #f59e0b
  checkTableConfig(
    "pages/Designations/Designations.jsx",
    "#f59e0b",
    ["Department", "Designation", "Code", "Status", "Actions"],
    "Designations Table",
  );

  // 4. Projects → #10b981
  checkTableConfig(
    "pages/Projects/Projects.jsx",
    "#10b981",
    ["Project", "Description", "Status", "Actions"],
    "Projects Table",
  );

  // 5. Tasks → #2563eb
  checkTableConfig(
    "pages/Tasks/Tasks.jsx",
    "#2563eb",
    ["Task", "Employee", "Project", "Priority", "Due Date", "Status", "Actions"],
    "Tasks Table",
  );

  // 6. Submissions → #8b5cf6
  checkTableConfig(
    "pages/Submissions/Submissions.jsx",
    "#8b5cf6",
    ["Task", "Employee", "Priority", "Due Date", "Status", "Submitted On", "Actions"],
    "Submissions Table",
  );

  // 2. Verify Critical Badge Red Danger Styling
  console.log("\n[TEST 2] Verifying Critical Badge Red Danger Styling...");
  const tasksCss = fs.readFileSync(path.join(frontendPath, "pages/Tasks/Tasks.css"), "utf8");
  const myTasksCss = fs.readFileSync(path.join(frontendPath, "pages/MyTasks/MyTasks.css"), "utf8");
  const statusBadgeCss = fs.readFileSync(path.join(frontendPath, "components/StatusBadge/StatusBadge.css"), "utf8");

  if (!tasksCss.includes(".priority-badge.critical")) throw new Error("Missing .priority-badge.critical in Tasks.css!");
  if (!myTasksCss.includes(".priority-badge.critical")) throw new Error("Missing .priority-badge.critical in MyTasks.css!");
  if (!statusBadgeCss.includes(".status-badge.critical")) throw new Error("Missing .status-badge.critical in StatusBadge.css!");

  console.log("PASS: Critical badge red danger-style rules verified in Tasks.css, MyTasks.css, and StatusBadge.css.");

  // 3. Verify DataTable Architecture & Scrollbar Fix Remains Intact
  console.log("\n[TEST 3] Verifying DataTable CSS Variable Architecture & Scrollbar Fix...");
  const dataTableJsx = fs.readFileSync(path.join(frontendPath, "components/DataTable/DataTable.jsx"), "utf8");
  const dataTableCss = fs.readFileSync(path.join(frontendPath, "components/DataTable/DataTable.css"), "utf8");

  if (!dataTableJsx.includes('headerColor = "#2563eb"')) throw new Error("DataTable.jsx missing default headerColor prop!");
  if (!dataTableCss.includes("var(--header-bg")) throw new Error("DataTable.css missing --header-bg custom property!");
  if (dataTableCss.includes("transform: scale")) throw new Error("DataTable.css contains transform scale!");

  console.log("PASS: DataTable CSS variable architecture and scrollbar fix verified intact.");

  console.log("\n=================================================");
  console.log("ALL TABLE HEADER COLORS & CRITICAL BADGE TESTS PASSED!");
  console.log("DATA TABLE HEADER COLORS + CRITICAL STATUS BADGES: PASS");
  console.log("=================================================");
}

runVerification();
