const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const validateDesignation = require("../middleware/validateDesignation");

const {
  createDesignation,
  getDesignations,
  getDesignationById,
  updateDesignation,
  toggleDesignationStatus,
} = require("../controllers/designationController");

router.get("/", auth, getDesignations);

router.get("/:id", auth, getDesignationById);

router.post(
  "/",
  auth,
  authorize("manager"),
  validateDesignation,
  createDesignation,
);

router.patch(
  "/:id",
  auth,
  authorize("manager"),
  validateDesignation,
  updateDesignation,
);

router.patch(
  "/:id/status",
  auth,
  authorize("manager"),
  toggleDesignationStatus,
);

module.exports = router;
