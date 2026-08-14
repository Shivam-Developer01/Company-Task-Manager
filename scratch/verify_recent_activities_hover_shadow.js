const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING RECENT ACTIVITIES HOVER SHADOW FIX");
  console.log("=================================================");

  const frontendPath = path.join(__dirname, "../frontend/src");
  const recentCssPath = path.join(frontendPath, "components/RecentActivitiesCard/RecentActivitiesCard.css");
  const recentJsxPath = path.join(frontendPath, "components/RecentActivitiesCard/RecentActivitiesCard.jsx");

  const cssContent = fs.readFileSync(recentCssPath, "utf8");
  const jsxContent = fs.readFileSync(recentJsxPath, "utf8");

  // 1. Verify RecentActivitiesCard CSS Hover Rules
  console.log("\n[TEST 1] Verifying RecentActivitiesCard CSS Hover Rules...");

  if (!cssContent.includes("box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);")) {
    throw new Error("Missing box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06) in RecentActivitiesCard.css!");
  }

  if (!cssContent.includes("border-color: #cbd5e1;")) {
    throw new Error("Missing border-color: #cbd5e1 in RecentActivitiesCard.css!");
  }

  if (!cssContent.includes("transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;")) {
    throw new Error("Missing complete transition rule in RecentActivitiesCard.css!");
  }

  console.log("PASS: RecentActivitiesCard hover shadow CSS rules verified.");

  // 2. Verify JSX Integrity & Component Handlers
  console.log("\n[TEST 2] Verifying RecentActivitiesCard JSX & Handlers...");

  if (!jsxContent.includes("handleRowClick")) throw new Error("handleRowClick handler missing!");
  if (!jsxContent.includes('className={`activity-item ${isClickable ? "clickable" : ""}`}')) {
    throw new Error("Clickable class logic missing!");
  }

  console.log("PASS: RecentActivitiesCard JSX & click handlers verified 100% intact.");

  console.log("\n=================================================");
  console.log("ALL RECENT ACTIVITIES HOVER SHADOW TESTS PASSED!");
  console.log("RECENT ACTIVITIES HOVER SHADOW: PASS");
  console.log("=================================================");
}

runVerification();
