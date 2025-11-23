// helpers/notificationHelper.js
const db = require('../db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// 🔹 Universal notification sender
exports.sendNotification = async ({
    user_type,
    user_id,
    title,
    message,
    type = "general",
    link = null,
    sender_id = null,
    sender_type = "admin",
    email = null
}) => {
    if (!user_type || !user_id) return;

    await db.execute(
        `INSERT INTO notifications
            (user_type, user_id, title, message, type, link, sender_id, sender_type, is_read, is_seen, is_deleted, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, NOW())`,
        [user_type, user_id, title, message, type, link, sender_id, sender_type]
    );

    if (email) {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: title,
            text: message,
        });
    }
};
