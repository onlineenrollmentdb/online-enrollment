// controllers/clearanceController.js
const db = require("../db");
const { sendNotification } = require("../helpers/notificationHelper");

/* -------------------------------------------------------------------------- */
/*                           🧾 CLEARANCE MANAGEMENT                           */
/* -------------------------------------------------------------------------- */

exports.updateClearance = async (req, res) => {
    const { student_id, is_cleared, academic_year, semester } = req.body;

    if (!student_id) {
        return res.status(400).json({ error: 'Student ID is required' });
    }

    if (typeof is_cleared !== 'boolean') {
        return res.status(400).json({ error: 'is_cleared must be a boolean' });
    }

    try {
        // ✅ 1 = cleared, 0 = not cleared
        const newStatus = is_cleared ? 1 : 0;

        // 🔍 find enrollment for this student & term
        const [existing] = await db.execute(
            `SELECT *
             FROM enrollments
             WHERE student_id = ? AND academic_year = ? AND semester = ?
             ORDER BY enrollment_id DESC
             LIMIT 1`,
            [student_id, academic_year, semester]
        );

        let enrollmentId;

        if (existing.length > 0) {
            // ✅ update existing record
            enrollmentId = existing[0].enrollment_id;
            await db.execute(
                `UPDATE enrollments
                 SET enrollment_status = ?
                 WHERE enrollment_id = ?`,
                [newStatus, enrollmentId]
            );
        } else {
            // ➕ insert new if not found
            const [insertResult] = await db.execute(
                `INSERT INTO enrollments (student_id, enrollment_status, academic_year, semester)
                 VALUES (?, ?, ?, ?)`,
                [student_id, newStatus, academic_year, semester]
            );
            enrollmentId = insertResult.insertId;
        }

        // 🔔 send notification to student
        await sendNotification(
            "student",
            student_id,
            "Clearance Status Updated",
            is_cleared
                ? "✅ Your clearance has been confirmed. You can now proceed to enrollment."
                : "❌ Your clearance has been revoked.",
            "enrollment",
            "/enroll"
        );

        // 🔄 notify all clients via Socket.IO
        const io = req.app.get("io");
        io.emit("clearanceUpdated", {
            enrollment_id: enrollmentId,
            student_id,
            enrollment_status: newStatus,
        });

        res.json({
            message: `Clearance ${is_cleared ? "confirmed" : "revoked"} successfully`,
            enrollment_id: enrollmentId,
            enrollment_status: newStatus,
        });
    } catch (error) {
        console.error("Update clearance error:", error);
        res.status(500).json({ error: "Failed to update clearance" });
    }
};
