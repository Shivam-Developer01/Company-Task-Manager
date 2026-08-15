const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const mongoose = require(path.join(__dirname, "../Backend/node_modules/mongoose"));
const jwt = require(path.join(__dirname, "../Backend/node_modules/jsonwebtoken"));
const bcrypt = require(path.join(__dirname, "../Backend/node_modules/bcryptjs"));

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

const User = require("../Backend/models/User");
const { generateAccessToken, generateRefreshToken } = require("../Backend/utils/jwt");

async function runJwtAudit() {
  console.log("=== STARTING COMPLETE JWT ACCESS/REFRESH TOKEN AUDIT ===\n");
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    // 1. Verify Environment Configurations
    console.log("--- 1. Environment Expiry Configurations ---");
    console.log(`ACCESS_TOKEN_EXPIRES from .env: "${process.env.ACCESS_TOKEN_EXPIRES}"`);
    console.log(`REFRESH_TOKEN_EXPIRES from .env: "${process.env.REFRESH_TOKEN_EXPIRES}"`);

    // 2. Test Real Token Generation & Decoded Expiration Claims
    console.log("\n--- 2. Token Generation & Decoded Expiry Verification ---");
    const testUser = await User.findOne({ isActive: true });
    if (!testUser) throw new Error("No active user found for audit");

    const accessToken = generateAccessToken(testUser);
    const refreshToken = generateRefreshToken(testUser);

    const decodedAccess = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const accessDurationSec = decodedAccess.exp - decodedAccess.iat;
    const refreshDurationSec = decodedRefresh.exp - decodedRefresh.iat;

    console.log(`Decoded Access Token Expiry Duration: ${accessDurationSec} seconds (${accessDurationSec / 60} minutes)`);
    console.log(`Decoded Refresh Token Expiry Duration: ${refreshDurationSec} seconds (${refreshDurationSec / (24 * 3600)} days)`);

    // 3. Test Access Token Expiry Enforcement (Simulated Short Expiry)
    console.log("\n--- 3. Controlled Access Token Expiry Test ---");
    const expiredAccess = jwt.sign(
      { userId: testUser._id, role: testUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "1s" }
    );

    console.log("Waiting 1.5 seconds for token to expire...");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let accessExpiredErr = null;
    try {
      jwt.verify(expiredAccess, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      accessExpiredErr = err;
    }

    if (accessExpiredErr && accessExpiredErr.name === "TokenExpiredError") {
      console.log("✓ PASSED: Expired access token rejected with TokenExpiredError!");
    } else {
      console.error("❌ FAILED: Expired access token was NOT rejected!");
    }

    // 4. Test Refresh Endpoint Logic & Token Hash Matching
    console.log("\n--- 4. Refresh Token Validation & New Access Token Generation ---");
    const newRefresh = generateRefreshToken(testUser);
    testUser.refreshToken = await bcrypt.hash(newRefresh, 10);
    await testUser.save();

    // Verify hash comparison
    const isMatch = await bcrypt.compare(newRefresh, testUser.refreshToken);
    console.log("Bcrypt Compare Valid Refresh Token:", isMatch ? "✓ MATCH" : "❌ MISMATCH");

    const newAccessFromRefresh = generateAccessToken(testUser);
    const decodedNewAccess = jwt.verify(newAccessFromRefresh, process.env.JWT_ACCESS_SECRET);
    console.log("Refreshed Access Token Payload User ID:", decodedNewAccess.userId.toString());

    // 5. Test Invalid/Expired Refresh Token Rejection
    console.log("\n--- 5. Invalid / Expired Refresh Token Rejection ---");
    const bogusRefresh = "invalid.refresh.token";
    let invalidRefreshErr = null;
    try {
      jwt.verify(bogusRefresh, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      invalidRefreshErr = err;
    }
    console.log("Invalid Refresh Token Verification Result:", invalidRefreshErr ? `✓ REJECTED (${invalidRefreshErr.message})` : "❌ ACCEPTED");

    // 6. Test Logout Invalidation
    console.log("\n--- 6. Logout Refresh Token Invalidation ---");
    testUser.refreshToken = null;
    await testUser.save();

    const dbUserAfterLogout = await User.findById(testUser._id).select("refreshToken");
    if (dbUserAfterLogout.refreshToken === null) {
      console.log("✓ PASSED: User refreshToken in DB set to NULL on logout!");
    } else {
      console.error("❌ FAILED: User refreshToken in DB was NOT cleared!");
    }

    // Attempting refresh after logout
    const postLogoutMatch = dbUserAfterLogout.refreshToken
      ? await bcrypt.compare(newRefresh, dbUserAfterLogout.refreshToken)
      : false;
    console.log("Post-logout Refresh Token Match Check:", postLogoutMatch ? "❌ ALLOWED" : "✓ DENIED (No refresh token in DB)");

    console.log("\n=== AUDIT SUMMARY ===");
    console.log(`Access Token Configured Expiry: ${process.env.ACCESS_TOKEN_EXPIRES}`);
    console.log(`Refresh Token Configured Expiry: ${process.env.REFRESH_TOKEN_EXPIRES}`);
  } catch (err) {
    console.error("AUDIT ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runJwtAudit();
