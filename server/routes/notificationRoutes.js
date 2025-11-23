const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// Get notifications for a user
router.get("/:user_type/:user_id", notificationController.getNotifications);

// Create a notification
router.post("/", notificationController.createNotification);

// Mark as seen
router.put("/:notification_id/seen", notificationController.markAsSeen);

// Mark as read
router.put("/:notification_id/read", notificationController.markAsRead);

// Soft delete
router.delete("/:notification_id", notificationController.deleteNotification);

module.exports = router;
