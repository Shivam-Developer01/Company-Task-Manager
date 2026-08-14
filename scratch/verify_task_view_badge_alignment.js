const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING TASK VIEW STATUS & PRIORITY ALIGNMENT");
  console.log("=================================================");

  const frontendPath = path.join(__dirname, "../frontend/src");
  const taskDrawerJsxPath = path.join(frontendPath, "components/TaskDrawer/TaskDrawer.jsx");
  const taskDrawerCssPath = path.join(frontendPath, "components/TaskDrawer/TaskDrawer.css");
  const empTaskDrawerJsxPath = path.join(frontendPath, "components/EmployeeTaskDrawer/EmployeeTaskDrawer.jsx");
  const empTaskDrawerCssPath = path.join(frontendPath, "components/EmployeeTaskDrawer/EmployeeTaskDrawer.css");

  const taskDrawerJsx = fs.readFileSync(taskDrawerJsxPath, "utf8");
  const taskDrawerCss = fs.readFileSync(taskDrawerCssPath, "utf8");
  const empTaskDrawerJsx = fs.readFileSync(empTaskDrawerJsxPath, "utf8");
  const empTaskDrawerCss = fs.readFileSync(empTaskDrawerCssPath, "utf8");

  // 1. Verify JSX container structure
  console.log("\n[TEST 1] Verifying JSX task-d-badges container structure...");
  if (!taskDrawerJsx.includes('className="task-d-badges"')) {
    throw new Error("TaskDrawer.jsx missing task-d-badges wrapper!");
  }
  if (!empTaskDrawerJsx.includes('className="task-d-badges"')) {
    throw new Error("EmployeeTaskDrawer.jsx missing task-d-badges wrapper!");
  }
  console.log("PASS: JSX task-d-badges container wrappers verified in both drawers.");

  // 2. Verify CSS alignment rules in TaskDrawer.css & EmployeeTaskDrawer.css
  console.log("\n[TEST 2] Verifying CSS flex alignment and matching height rules...");

  [ { name: "TaskDrawer.css", css: taskDrawerCss }, { name: "EmployeeTaskDrawer.css", css: empTaskDrawerCss } ].forEach(({ name, css }) => {
    if (!css.includes(".task-d-badges")) throw new Error(`${name} missing .task-d-badges selector!`);
    if (!css.includes("display: flex;")) throw new Error(`${name} missing display: flex!`);
    if (!css.includes("align-items: center;")) throw new Error(`${name} missing align-items: center!`);
    if (!css.includes("justify-content: center;")) throw new Error(`${name} missing justify-content: center!`);
    if (!css.includes("height: 26px;")) throw new Error(`${name} missing height: 26px rule for badges!`);
    if (!css.includes("margin: 0;")) throw new Error(`${name} missing margin: 0 rule!`);
  });

  console.log("PASS: CSS flex alignment, 26px matching height, and margin reset rules verified.");

  // 3. Verify Badge Combinations Integrity
  console.log("\n[TEST 3] Verifying status & priority badge combinations integrity...");
  const statusBadgeCss = fs.readFileSync(path.join(frontendPath, "components/StatusBadge/StatusBadge.css"), "utf8");

  const statuses = ["assigned", "in_progress", "pending_review", "withdrawn", "closed"];
  const priorities = ["low", "medium", "high", "critical"];

  statuses.forEach((status) => {
    if (!statusBadgeCss.includes(`.status-badge.${status}`)) {
      throw new Error(`Missing CSS rule for status badge: ${status}`);
    }
  });

  priorities.forEach((priority) => {
    if (!taskDrawerCss.includes(`.priority-d-chip.${priority}`)) {
      throw new Error(`Missing CSS rule for priority chip: ${priority}`);
    }
  });

  console.log("PASS: All status and priority badge color classes verified intact.");

  console.log("\n=================================================");
  console.log("ALL TASK VIEW BADGE ALIGNMENT TESTS PASSED!");
  console.log("TASK VIEW STATUS & PRIORITY ALIGNMENT: PASS");
  console.log("=================================================");
}

runVerification();
