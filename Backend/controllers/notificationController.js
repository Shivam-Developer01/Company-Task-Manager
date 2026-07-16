const Notification = require("../models/Notification");
const CustomError = require("../errors/CustomError");

/* ===========================================================
                    MY NOTIFICATIONS
=========================================================== */

const getMyNotifications = async (req, res) => {
  const { page = 1, limit = 15, search = "", read } = req.query;

  const query = {
    user: req.user.userId,
  };

  if (read === "true") {
    query.isRead = true;
  }

  if (read === "false") {
    query.isRead = false;
  }

  if (search) {
    query.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        message: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const notifications = await Notification.find(query)
    .populate("task", "title")
    .populate("submission", "submissionNumber")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const totalNotifications = await Notification.countDocuments(query);

  const unread = await Notification.countDocuments({
    user: req.user.userId,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    unread,
    totalNotifications,
    currentPage: Number(page),
    totalPages: Math.ceil(totalNotifications / Number(limit)),
    count: notifications.length,
    data: notifications,
  });
};

/* ===========================================================
                    UNREAD COUNT
=========================================================== */

const getUnreadCount = async (req, res) => {
  const unread = await Notification.countDocuments({
    user: req.user.userId,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    unread,
  });
};

/* ===========================================================
                    MARK AS READ
=========================================================== */

const markAsRead = async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user.userId,
  });

  if (!notification) {
    throw new CustomError("Notification not found", 404);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
  });
};

/* ===========================================================
                    MARK ALL AS READ
=========================================================== */

const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    {
      user: req.user.userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
      },
    },
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
