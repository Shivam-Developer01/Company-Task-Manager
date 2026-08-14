const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const {
  BUCKETS,
  uploadFile,
  createSignedUrl,
  deleteFile,
  deleteFiles,
  transformAttachment,
  transformAttachments,
} = require("../utils/supabaseStorage");

async function runTests() {
  console.log("==================================================");
  console.log("   SUPABASE STORAGE INTEGRATION TEST SUITE");
  console.log("==================================================");

  let allPassed = true;

  try {
    // Test 1: Upload to references bucket
    console.log("\n[TEST 1] Uploading test reference file to 'references' bucket...");
    const refBuffer = Buffer.from("Test reference file content for Supabase migration", "utf-8");
    const testRefPath = `references/test-task-123/${Date.now()}-test-ref.txt`;

    const refUpload = await uploadFile({
      bucket: BUCKETS.REFERENCES,
      path: testRefPath,
      fileBuffer: refBuffer,
      mimeType: "text/plain",
    });

    console.log("✔ Reference Upload Succeeded:", refUpload);

    // Test 2: Generate Signed URL for references
    console.log("\n[TEST 2] Generating short-lived signed URL for reference file...");
    const refSignedUrl = await createSignedUrl({
      bucket: BUCKETS.REFERENCES,
      path: refUpload.storagePath,
      expiresIn: 300,
    });

    if (refSignedUrl && refSignedUrl.includes("token=")) {
      console.log("✔ Signed URL Generated Successfully!");
      console.log("  Signed URL (truncated):", refSignedUrl.substring(0, 80) + "...");
    } else {
      console.error("❌ Signed URL Generation Failed!");
      allPassed = false;
    }

    // Test 3: Upload to submissions bucket
    console.log("\n[TEST 3] Uploading test submission file to 'submissions' bucket...");
    const subBuffer = Buffer.from("Test submission file content for Supabase migration", "utf-8");
    const testSubPath = `submissions/test-task-456/${Date.now()}-test-sub.txt`;

    const subUpload = await uploadFile({
      bucket: BUCKETS.SUBMISSIONS,
      path: testSubPath,
      fileBuffer: subBuffer,
      mimeType: "text/plain",
    });

    console.log("✔ Submission Upload Succeeded:", subUpload);

    // Test 4: Transform attachment helper (Supabase vs Legacy)
    console.log("\n[TEST 4] Testing attachment URL transformation...");
    const mockSupabaseAttachment = {
      fileName: "test-ref.txt",
      originalName: "Original Reference.txt",
      fileUrl: "",
      mimeType: "text/plain",
      fileSize: 100,
      storagePath: refUpload.storagePath,
      bucket: BUCKETS.REFERENCES,
    };

    const mockLegacyAttachment = {
      fileName: "legacy.pdf",
      originalName: "Legacy File.pdf",
      fileUrl: "/uploads/references/legacy.pdf",
      mimeType: "application/pdf",
      fileSize: 200,
    };

    const transformed = await transformAttachments([mockSupabaseAttachment, mockLegacyAttachment]);

    if (transformed[0].fileUrl.includes("token=") && transformed[1].fileUrl === "/uploads/references/legacy.pdf") {
      console.log("✔ Attachment Transformation Passed! (Supabase got signed URL, Legacy preserved)");
    } else {
      console.error("❌ Attachment Transformation Failed!", transformed);
      allPassed = false;
    }

    // Test 5: Atomic Compensating Cleanup (Deletion)
    console.log("\n[TEST 5] Testing compensating file deletion/cleanup...");
    await deleteFile({ bucket: BUCKETS.REFERENCES, path: refUpload.storagePath });
    await deleteFile({ bucket: BUCKETS.SUBMISSIONS, path: subUpload.storagePath });
    console.log("✔ Compensating Cleanup Executed Successfully!");

    console.log("\n==================================================");
    if (allPassed) {
      console.log("   ALL SUPABASE INTEGRATION TESTS PASSED! ✅");
    } else {
      console.log("   SOME TESTS FAILED! ❌");
    }
    console.log("==================================================\n");
  } catch (error) {
    console.error("\n❌ TEST ERROR:", error);
    process.exit(1);
  }
}

runTests();
