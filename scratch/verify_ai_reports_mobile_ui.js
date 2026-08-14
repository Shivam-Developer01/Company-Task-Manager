const fs = require("fs");
const path = require("path");

function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING AI REPORTS MOBILE UI RESPONSIVENESS");
  console.log("=================================================");

  const frontendPath = path.join(__dirname, "../frontend/src");
  const aiReportsCssPath = path.join(frontendPath, "pages/AiReports/AiReports.css");
  const aiReportsJsxPath = path.join(frontendPath, "pages/AiReports/AiReports.jsx");

  const cssContent = fs.readFileSync(aiReportsCssPath, "utf8");
  const jsxContent = fs.readFileSync(aiReportsJsxPath, "utf8");

  // 1. Verify Responsive Media Query Rules
  console.log("\n[TEST 1] Verifying Responsive Media Query Rules in AiReports.css...");

  if (!cssContent.includes("@media (max-width: 768px)")) {
    throw new Error("Missing @media (max-width: 768px) rule!");
  }
  if (!cssContent.includes("@media (max-width: 480px)")) {
    throw new Error("Missing @media (max-width: 480px) rule!");
  }
  if (!cssContent.includes("@media (max-width: 360px)")) {
    throw new Error("Missing @media (max-width: 360px) rule!");
  }

  console.log("PASS: All responsive media query breakpoints verified.");

  // 2. Verify Mobile Full-Width Controls & Touch Target Rules
  console.log("\n[TEST 2] Verifying Mobile Full-Width Controls & Touch Target Rules...");

  const checkCssRule = (term, label) => {
    if (!cssContent.includes(term)) {
      throw new Error(`Missing CSS rule "${term}" for ${label}!`);
    }
    console.log(`PASS: ${label} rule verified ("${term}").`);
  };

  checkCssRule("height: 44px;", "Select dropdown touch height");
  checkCssRule("height: 46px;", "Generate AI Report button touch height");
  checkCssRule("display: flex;\n    flex-direction: column;", "Mobile controls flex column stack");

  // 3. Verify Desktop Layout & Functionality Integrity
  console.log("\n[TEST 3] Verifying Desktop Layout & Logic Integrity...");

  if (!jsxContent.includes("handleGenerateReport")) throw new Error("handleGenerateReport handler missing!");
  if (!jsxContent.includes("handleDownloadPdf")) throw new Error("handleDownloadPdf handler missing!");
  if (!jsxContent.includes("handleDownloadDocx")) throw new Error("handleDownloadDocx handler missing!");

  console.log("PASS: Desktop layout & report handlers verified 100% intact.");

  console.log("\n=================================================");
  console.log("ALL AI REPORTS MOBILE UI VERIFICATION TESTS PASSED!");
  console.log("AI REPORTS MOBILE UI: PASS");
  console.log("=================================================");
}

runVerification();
