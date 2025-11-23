const db = require("../db");

// ======================
// Get Notifications (latest first)
// ======================
exports.getNotifications = async (req, res) => {
	const { user_type, user_id } = req.params;

	try {
		const [rows] = await db.query(
			`SELECT * FROM notifications
       WHERE user_type = ? AND user_id = ? AND is_deleted = 0
       ORDER BY created_at DESC
       LIMIT 50`,
			[user_type, user_id]
		);

		res.json(rows);
	} catch (err) {
		console.error("Get notifications error:", err);
		res.status(500).json({ error: "Failed to fetch notifications" });
	}
};

// ======================
// Create Notification + Emit via Socket.IO
// ======================
exports.createNotification = async (req, res) => {
	const { user_type, user_id, title, message, type, link, sender_id, sender_type } = req.body;

	if (!user_type || !user_id || !message) {
		return res
			.status(400)
			.json({ error: "user_type, user_id, and message are required" });
	}

	try {
		const [result] = await db.query(
			`INSERT INTO notifications
       (user_type, user_id, title, message, type, link, sender_id, sender_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
			[
				user_type,
				user_id,
				title,
				message,
				type || "general",
				link,
				sender_id,
				sender_type,
			]
		);

		const notification = {
			notification_id: result.insertId,
			user_type,
			user_id,
			title,
			message,
			type: type || "general",
			link,
			sender_id,
			sender_type,
			created_at: new Date(),
		};

		// ✅ Emit notification via socket
		const io = req.app.get("io");
		io.emit("new-notification", notification);

		res.json({ success: true, notification });
	} catch (err) {
		console.error("Create notification error:", err);
		res.status(500).json({ error: "Failed to create notification" });
	}
};

// ======================
// Mark as Seen
// ======================
exports.markAsSeen = async (req, res) => {
	const { notification_id } = req.params;

	try {
		await db.query(
			"UPDATE notifications SET is_seen = 1 WHERE notification_id = ?",
			[notification_id]
		);
		res.json({ success: true });
	} catch (err) {
		console.error("Mark as seen error:", err);
		res.status(500).json({ error: "Failed to update notification" });
	}
};

// ======================
// Mark as Read
// ======================
exports.markAsRead = async (req, res) => {
	const { notification_id } = req.params;

	try {
		await db.query(
			"UPDATE notifications SET is_read = 1 WHERE notification_id = ?",
			[notification_id]
		);
		res.json({ success: true });
	} catch (err) {
		console.error("Mark as read error:", err);
		res.status(500).json({ error: "Failed to update notification" });
	}
};

// ======================
// Soft Delete Notification
// ======================
exports.deleteNotification = async (req, res) => {
	const { notification_id } = req.params;

	try {
		await db.query(
			"UPDATE notifications SET is_deleted = 1 WHERE notification_id = ?",
			[notification_id]
		);
		res.json({ success: true });
	} catch (err) {
		console.error("Delete notification error:", err);
		res.status(500).json({ error: "Failed to delete notification" });
	}
};
