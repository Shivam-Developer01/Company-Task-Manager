const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const uploadSubmission = require("../middleware/uploadSubmission");
const validateSubmission = require("../middleware/validateSubmission");

const {
  submitTask,
  getMySubmissions,
  getAllSubmissions,
  getSubmissionById,
  reviewSubmission,
} = require("../controllers/submissionController");

/* ================= EMPLOYEE ================= */

router.post(
  "/:taskId",
  auth,
  authorize("employee"),
  uploadSubmission.array("attachments", 10),
  validateSubmission,
  submitTask,
);

router.get("/my", auth, authorize("employee"), getMySubmissions);

/* ================= MANAGER ================= */

router.get("/", auth, authorize("manager"), getAllSubmissions);

router.get("/:id", auth, authorize("manager", "employee"), getSubmissionById);

router.patch("/:id/review", auth, authorize("manager"), reviewSubmission);

module.exports = router;
