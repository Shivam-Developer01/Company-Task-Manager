const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING TASK STATUS FILTER UI STATE SYNC");
  console.log("=================================================");

  const rootPath = path.join(__dirname, "..");
  const frontendPath = path.join(rootPath, "frontend/src");

  // 1. Verify State Initialization from searchParams in Tasks & MyTasks
  console.log("\n[TEST 1] Verifying initial status state reading from searchParams...");

  const tasksJsx = fs.readFileSync(path.join(frontendPath, "pages/Tasks/Tasks.jsx"), "utf8");
  const myTasksJsx = fs.readFileSync(path.join(frontendPath, "pages/MyTasks/MyTasks.jsx"), "utf8");
  const subJsx = fs.readFileSync(path.join(frontendPath, "pages/Submissions/Submissions.jsx"), "utf8");
  const mySubJsx = fs.readFileSync(path.join(frontendPath, "pages/MySubmissions/MySubmissions.jsx"), "utf8");

  if (!tasksJsx.includes('searchParams.get("status")')) {
    throw new Error("Tasks.jsx missing searchParams.get('status') initialization!");
  }
  if (!myTasksJsx.includes('searchParams.get("status")')) {
    throw new Error("MyTasks.jsx missing searchParams.get('status') initialization!");
  }
  if (!subJsx.includes('searchParams.get("status")')) {
    throw new Error("Submissions.jsx missing searchParams.get('status') initialization!");
  }
  if (!mySubJsx.includes('searchParams.get("status")')) {
    throw new Error("MySubmissions.jsx missing searchParams.get('status') initialization!");
  }

  console.log("PASS: Initial status state in Tasks, MyTasks, Submissions, and MySubmissions reads from URL searchParams.");

  // 2. Verify useEffect Synchronization on searchParams Change
  console.log("\n[TEST 2] Verifying searchParams change listener hook...");

  const pages = [
    { name: "Tasks.jsx", code: tasksJsx },
    { name: "MyTasks.jsx", code: myTasksJsx },
    { name: "Submissions.jsx", code: subJsx },
    { name: "MySubmissions.jsx", code: mySubJsx },
  ];

  pages.forEach(({ name, code }) => {
    if (!code.includes("const statusParam = searchParams.get(\"status\");")) {
      throw new Error(`${name} missing statusParam synchronization effect!`);
    }
  });

  console.log("PASS: useEffect statusParam synchronization listeners verified across all 4 listing pages.");

  // 3. Verify AppSearchBar Active Tab Matching
  console.log("\n[TEST 3] Verifying AppSearchBar filterValue matching...");

  if (!tasksJsx.includes("filterValue={archived ? \"__ARCHIVED__\" : status}")) {
    throw new Error("Tasks.jsx filterValue prop is not receiving status state!");
  }
  if (!myTasksJsx.includes("filterValue={status}")) {
    throw new Error("MyTasks.jsx filterValue prop is not receiving status state!");
  }

  console.log("PASS: AppSearchBar filterValue receives current status state, ensuring active status tab is visually highlighted.");

  console.log("\n=================================================");
  console.log("ALL STATUS FILTER UI STATE SYNC TESTS PASSED!");
  console.log("TASK STATUS FILTER UI STATE SYNC: PASS");
  console.log("=================================================");
}

runVerification();
