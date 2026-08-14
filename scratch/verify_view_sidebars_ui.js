const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING VIEW SIDEBARS UI/UX REDESIGN (6 MODULES)");
  console.log("=================================================");

  const frontendPath = path.join(__dirname, "../frontend/src");

  // 1. Verify Information Preservation across all 6 View Sidebars
  console.log("\n[TEST 1] Verifying Information Preservation across 6 View Sidebars...");

  const checkFileContent = (filePath, searchTerms, label) => {
    const fullPath = path.join(frontendPath, filePath);
    const content = fs.readFileSync(fullPath, "utf8");
    console.log(`Checking ${label} (${filePath})...`);
    for (const term of searchTerms) {
      if (!content.includes(term)) {
        throw new Error(`Missing required field/element "${term}" in ${label}!`);
      }
    }
    console.log(`PASS: ${label} information fields & actions verified 100% intact.`);
  };

  // 1. Users
  checkFileContent(
    "pages/Employees/Employees.jsx",
    ["User Details", "User ID", "Email", "Department", "Designation", "Created On", "Last Updated", "Edit User", "Reset Password"],
    "Users View Sidebar",
  );

  // 2. Departments
  checkFileContent(
    "pages/Departments/Departments.jsx",
    ["Department Details", "Name", "Code", "Created On", "Last Updated", "Edit Department"],
    "Departments View Sidebar",
  );

  // 3. Designations
  checkFileContent(
    "pages/Designations/Designations.jsx",
    ["Designation Details", "Department", "Designation", "Code", "Created On", "Updated On", "Edit Designation"],
    "Designations View Sidebar",
  );

  // 4. Projects
  checkFileContent(
    "pages/Projects/Projects.jsx",
    ["Project Details", "Total Tasks", "Open Tasks", "Closed Tasks", "Members", "Edit Project"],
    "Projects View Sidebar",
  );

  // 5. Tasks
  checkFileContent(
    "components/TaskDrawer/TaskDrawer.jsx",
    ["Task Details", "Employee", "Project", "Assigned By", "Due Date", "Checklist"],
    "Tasks View Sidebar",
  );

  // 6. Submissions
  checkFileContent(
    "components/SubmissionDrawer/SubmissionDrawer.jsx",
    ["Submission Details", "Submission", "Task & Context Information", "Assigned To"],
    "Submissions View Sidebar",
  );

  // 2. Verify SideDrawer & Drawer CSS Architecture
  console.log("\n[TEST 2] Verifying SideDrawer Architecture & Responsive CSS...");
  const sideDrawerCss = fs.readFileSync(path.join(frontendPath, "components/SideDrawer/SideDrawer.css"), "utf8");
  const taskDrawerCss = fs.readFileSync(path.join(frontendPath, "components/TaskDrawer/TaskDrawer.css"), "utf8");
  const submissionDrawerCss = fs.readFileSync(path.join(frontendPath, "components/SubmissionDrawer/SubmissionDrawer.css"), "utf8");

  if (!sideDrawerCss.includes("width: 520px;")) throw new Error("SideDrawer.css missing 520px desktop width!");
  if (!sideDrawerCss.includes("@media (max-width: 768px)")) throw new Error("SideDrawer.css missing mobile responsive media query!");
  if (!taskDrawerCss.includes("grid-template-columns: repeat(2, 1fr);")) throw new Error("TaskDrawer.css missing 2-column grid!");
  if (!submissionDrawerCss.includes("grid-template-columns: repeat(2, 1fr);")) throw new Error("SubmissionDrawer.css missing 2-column grid!");

  console.log("PASS: SideDrawer CSS architecture and responsive 2-column layouts verified.");

  console.log("\n=================================================");
  console.log("ALL VIEW SIDEBARS UI/UX REDESIGN VERIFICATION TESTS PASSED!");
  console.log("VIEW SIDEBARS UI/UX REDESIGN: PASS");
  console.log("=================================================");
}

runVerification();
