const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// 📌 Get User Notifications (unread only)
router.get("/", ensureAuthenticated, notificationController.getNotifications);

// 📌 Get All User Notifications (for history page)
router.get("/all", ensureAuthenticated, notificationController.getAllNotifications);

// 📌 Mark All Notifications as Read (now deletes them)
router.post("/mark-all-read", ensureAuthenticated, notificationController.markAllAsRead);

// 📌 Explicitly Delete a Notification
router.get("/unread/count", ensureAuthenticated, notificationController.getUnreadCount);

// 📌 Mark a Single Notification as Read (now deletes it)
router.post("/:id/read", ensureAuthenticated, notificationController.markAsRead);

// 📌 Explicitly Delete a Notification
router.delete("/:id", ensureAuthenticated, notificationController.deleteNotification);

// 📌 Get Notifications Data (for dropdown)
router.get("/data", ensureAuthenticated, notificationController.getNotificationData);

module.exports = router;