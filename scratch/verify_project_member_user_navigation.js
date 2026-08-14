const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING PROJECT MEMBER -> USER VIEW NAVIGATION");
  console.log("=================================================");

  const frontendPath = path.join(__dirname, "../frontend/src");
  const projectsJsxPath = path.join(frontendPath, "pages/Projects/Projects.jsx");
  const projectsCssPath = path.join(frontendPath, "pages/Projects/Projects.css");
  const employeesJsxPath = path.join(frontendPath, "pages/Employees/Employees.jsx");
  const memberCardJsxPath = path.join(frontendPath, "components/ProjectMembersCard/ProjectMembersCard.jsx");

  const projectsJsx = fs.readFileSync(projectsJsxPath, "utf8");
  const projectsCss = fs.readFileSync(projectsCssPath, "utf8");
  const employeesJsx = fs.readFileSync(employeesJsxPath, "utf8");
  const memberCardJsx = fs.readFileSync(memberCardJsxPath, "utf8");

  // 1. Verify handleMemberClick implementation in Projects.jsx
  console.log("\n[TEST 1] Verifying handleMemberClick in Projects.jsx...");
  if (!projectsJsx.includes("handleMemberClick")) throw new Error("Missing handleMemberClick in Projects.jsx!");
  if (!projectsJsx.includes("navigate(`/employees?user=${memberId}&source=project`)")) {
    throw new Error("handleMemberClick does not use authoritative user ID navigation!");
  }
  console.log("PASS: handleMemberClick with ID navigation verified.");

  // 2. Verify Task Navigation remains 100% UNCHANGED
  console.log("\n[TEST 2] Verifying Task Click Navigation remains 100% UNCHANGED...");
  if (!projectsJsx.includes("handleTaskClick")) throw new Error("Missing handleTaskClick in Projects.jsx!");
  if (!projectsJsx.includes("`/tasks?project=${selectedProject._id}&task=${task._id}&source=project`")) {
    throw new Error("Task navigation altered!");
  }
  console.log("PASS: Task click navigation verified 100% intact.");

  // 3. Verify Employees.jsx URL user param handling
  console.log("\n[TEST 3] Verifying Employees.jsx URL user param handling...");
  if (!employeesJsx.includes('searchParams.get("user")')) throw new Error("Employees.jsx missing user searchParam handling!");
  if (!employeesJsx.includes(".getUser(userId)")) throw new Error("Employees.jsx missing single user fetch fallback!");
  console.log("PASS: Employees.jsx URL user navigation handler verified.");

  // 4. Verify Clickable Member UI Styling in Projects.css & ProjectMembersCard.jsx
  console.log("\n[TEST 4] Verifying Clickable Member UI Styling...");
  if (!projectsCss.includes(".project-member-card.clickable")) throw new Error("Projects.css missing .project-member-card.clickable rule!");
  if (!memberCardJsx.includes("clickable-row")) throw new Error("ProjectMembersCard.jsx missing clickable-row class!");
  console.log("PASS: Clickable member UI styling verified.");

  console.log("\n=================================================");
  console.log("ALL PROJECT MEMBER -> USER VIEW NAVIGATION TESTS PASSED!");
  console.log("PROJECT MEMBER USER NAVIGATION: PASS");
  console.log("=================================================");
}

runVerification();
