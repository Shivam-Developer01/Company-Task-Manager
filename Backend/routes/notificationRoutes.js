const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

/* ===========================================================
                    NOTIFICATIONS
=========================================================== */

// Get all notifications
router.get("/", auth, getMyNotifications);

// Get unread notification count
router.get("/unread-count", auth, getUnreadCount);

// Mark single notification as read
router.patch("/:id/read", auth, markAsRead);

// Mark all notifications as read
router.patch("/read-all", auth, markAllAsRead);

module.exports = router;
