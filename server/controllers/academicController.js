const db = require('../db');

exports.getAcademicHistory = async (req, res) => {
    const { studentId } = req.params;

    if (!studentId) {
        return res.status(400).json({ error: "Student ID is required" });
    }

    try {
        const [rows] = await db.execute(
            `
            SELECT
                ah.history_id,
                ah.subject_section,
                s.subject_code,
                ah.semester,
                ah.academic_year,
                ah.grade,
                ah.status
            FROM academic_history ah
            JOIN subjects s ON ah.subject_section = s.subject_section
            WHERE ah.student_id = ?
            ORDER BY ah.academic_year DESC, ah.semester DESC, ah.subject_section ASC
            `,
            [studentId]
        );

        // Format rows if needed, e.g., ensure grade/status are strings or null
        const formattedRows = rows.map(r => ({
            ...r,
            grade: r.grade !== null ? r.grade : "-",
            status: r.status || "-"
        }));

        res.json(formattedRows);
    } catch (err) {
        console.error("Error fetching academic history:", err);
        res.status(500).json({ error: "Failed to fetch academic history" });
    }
};
