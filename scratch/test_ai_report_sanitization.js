const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const mongoose = require(path.join(__dirname, "../Backend/node_modules/mongoose"));

const envPath = path.join(__dirname, "../Backend/.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

require("../Backend/models/User");
require("../Backend/models/Project");
require("../Backend/models/Phase");
require("../Backend/models/Task");
require("../Backend/models/Department");
require("../Backend/models/Submission");

const User = require("../Backend/models/User");
const Project = require("../Backend/models/Project");
const Department = require("../Backend/models/Department");
const { ROLES } = require("../Backend/constants/constants");
const { buildAiContext, formatForLlm } = require("../Backend/services/ai/aiContextBuilder");
const { sanitizeOutputPayload } = require("../Backend/services/ai/aiContextPolicy");

async function runSanitizationAudit() {
  console.log("=== STARTING AI REPORT DATA SANITIZATION AUDIT ===\n");
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });
    const manager = await User.findOne({ role: ROLES.MANAGER, isActive: true });
    const emp = await User.findOne({ role: ROLES.EMPLOYEE, isActive: true });
    const project = await Project.findOne({ isArchived: false });
    const dept = await Department.findOne({});

    if (!admin || !manager || !emp) throw new Error("Seed users missing");

    console.log(`Test Subject Manager: ${manager.name} (${manager._id}), employeeId: ${manager.employeeId || 'N/A'}`);

    const reportContextsToTest = [
      { name: "Manager Performance Report", type: "MANAGER_PERFORMANCE_REPORT", viewer: { userId: admin._id.toString(), role: ROLES.ADMIN }, targetSubjectId: manager._id.toString() },
      { name: "Manager Team Report", type: "MANAGER_REPORT", viewer: { userId: manager._id.toString(), role: ROLES.MANAGER } },
      { name: "Employee Performance Report", type: "EMPLOYEE_REPORT", viewer: { userId: emp._id.toString(), role: ROLES.EMPLOYEE } },
      { name: "All Employees Report", type: "EMPLOYEE_REPORT", viewer: { userId: admin._id.toString(), role: ROLES.ADMIN }, targetSubjectId: "all_employees" },
      { name: "Department Performance Report", type: "DEPARTMENT_REPORT", viewer: { userId: admin._id.toString(), role: ROLES.ADMIN }, targetSubjectId: dept ? dept._id.toString() : null },
      { name: "Project Performance Report", type: "PROJECT_REPORT", viewer: { userId: manager._id.toString(), role: ROLES.MANAGER }, projectId: project ? project._id.toString() : null },
    ];

    let totalViolations = 0;

    for (const testCase of reportContextsToTest) {
      if (testCase.type === "PROJECT_REPORT" && !testCase.projectId) continue;

      console.log(`\n--- Auditing ${testCase.name} Context ---`);
      const contextDto = await buildAiContext({
        viewer: testCase.viewer,
        contextType: testCase.type,
        targetSubjectId: testCase.targetSubjectId,
        projectId: testCase.projectId,
      });

      const formattedPrompt = formatForLlm(contextDto);
      const jsonContextString = JSON.stringify(contextDto.sanitizedData);

      // Check for 24-character hexadecimal MongoDB ObjectIds in AI prompt payload
      const hexObjectIdRegex = /"[0-9a-fA-F]{24}"/g;
      const foundHexIds = jsonContextString.match(hexObjectIdRegex) || [];

      // Check for blacklisted keys (_id, __v, storagePath, etc.)
      const blacklistedKeysRegex = /"(_id|__v|storagePath|filepath|filePath|password|jwtSecret|apiKey)"/g;
      const foundBlacklistedKeys = jsonContextString.match(blacklistedKeysRegex) || [];

      if (foundHexIds.length > 0) {
        console.error(`❌ VIOLATION: ${foundHexIds.length} raw MongoDB ObjectId(s) exposed in AI context:`, foundHexIds.slice(0, 5));
        totalViolations += foundHexIds.length;
      } else {
        console.log(`✓ CLEAN: Zero MongoDB ObjectIds detected in AI context JSON payload.`);
      }

      if (foundBlacklistedKeys.length > 0) {
        console.error(`❌ VIOLATION: Blacklisted keys detected in AI context:`, foundBlacklistedKeys);
        totalViolations += foundBlacklistedKeys.length;
      } else {
        console.log(`✓ CLEAN: Zero blacklisted internal fields (_id, __v, paths, credentials) detected.`);
      }

      // Check Prompt Guardrail Instruction
      const hasGuardrail = formattedPrompt.includes("Never expose internal database identifiers, MongoDB ObjectIds");
      if (hasGuardrail) {
        console.log(`✓ CLEAN: Prompt guardrail instruction present in system prompt.`);
      } else {
        console.error(`❌ VIOLATION: Missing prompt guardrail instruction!`);
        totalViolations++;
      }

      // Test Output Sanitizer
      const mockAiOutput = {
        summary: `Engineering department manager (ID: ${manager._id.toString()}) performed well.`,
        details: { path: "C:\\Users\\shiva\\app\\file.txt", managerRef: manager._id.toString() },
      };

      const sanitizedOutput = sanitizeOutputPayload(mockAiOutput, contextDto.entityIdMap);
      const outputJsonStr = JSON.stringify(sanitizedOutput);

      if (outputJsonStr.includes(manager._id.toString())) {
        console.error(`❌ VIOLATION: Output sanitizer failed to clean Manager Mongo ID!`);
        totalViolations++;
      } else {
        console.log(`✓ CLEAN: Output sanitizer cleanly transformed raw Manager Mongo ID into human-readable identifier! Output snippet:`, sanitizedOutput.summary);
      }
    }

    console.log(`\n=== SANITIZATION AUDIT COMPLETE — TOTAL VIOLATIONS: ${totalViolations} ===`);
  } catch (err) {
    console.error("AUDIT SCRIPT ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runSanitizationAudit();
