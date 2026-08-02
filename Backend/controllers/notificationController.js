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

  if (search.trim()) {
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

  const pageNumber = Math.max(Number(page), 1);
  const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

  const skip = (pageNumber - 1) * limitNumber;

  const notifications = await Notification.find(query)
    .populate("task", "title")
    .populate("project", "name")
    .populate("submission", "submissionNumber")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber);

  const [totalNotifications, unread] = await Promise.all([
    Notification.countDocuments(query),
    Notification.countDocuments({
      user: req.user.userId,
      isRead: false,
    }),
  ]);

  res.status(200).json({
    success: true,
    unread,
    totalNotifications,
    currentPage: pageNumber,
    totalPages: Math.ceil(totalNotifications / limitNumber),
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
