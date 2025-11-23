// controllers/gradesController.js
const db = require("../db");
const { sendNotification } = require("../helpers/notificationHelper");

// -----------------------------
// GET STUDENT SUBJECTS + GRADES (for Grades Tab)
// -----------------------------
exports.getStudentSubjectsWithGrades = async (req, res) => {
    const { student_id } = req.params;

    try {
        // 1️⃣ Find student's program
        const [[student]] = await db.execute(
            `SELECT program_id FROM students WHERE student_id = ?`,
            [student_id]
        );

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        const programId = student.program_id;

        // 2️⃣ Get all subjects under that program
        const [subjects] = await db.execute(
            `SELECT subject_code, subject_desc, subject_section, units, year_level, semester
             FROM subjects
             WHERE program_id = ?
             ORDER BY year_level, semester`,
            [programId]
        );

        // 3️⃣ Get student's grade history
        const [grades] = await db.execute(
            `SELECT subject_section, grade, status, academic_year, semester
             FROM academic_history
             WHERE student_id = ?`,
            [student_id]
        );

        // 4️⃣ Merge subjects + grades
        const merged = subjects.map((subj) => {
            const found = grades.find(
                (g) => g.subject_section === subj.subject_section
            );
            return {
                subject_section: subj.subject_section,
                subject_code: subj.subject_code,
                subject_desc: subj.subject_desc,
                units: subj.units,
                year_level: subj.year_level,
                semester: subj.semester,
                grade: found ? found.grade : null,
                status: found ? found.status : null,
                academic_year: found ? found.academic_year : null,
                taken_semester: found ? found.semester : null,
            };
        });

        res.json({ student_id, program_id: programId, records: merged });
    } catch (err) {
        console.error("Error fetching student grades:", err);
        res.status(500).json({ error: "Failed to fetch subjects and grades" });
    }
};

// -----------------------------
// UPDATE STUDENT GRADES
// -----------------------------
exports.updateStudentGrades = async (req, res) => {
    const { student_id } = req.params;
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: "Records must be provided as an array" });
    }

    try {
        for (const rec of records) {
            if (rec.grade === null || rec.grade === "") continue;

            const numericGrade = parseFloat(rec.grade);
            if (isNaN(numericGrade)) continue;

            let status;
            if (numericGrade === 0) status = "INC";
            else status = numericGrade <= 3.0 ? "Passed" : "Failed";

            const [[existing]] = await db.execute(
                `SELECT history_id FROM academic_history
                 WHERE student_id = ? AND subject_section = ?`,
                [student_id, rec.subject_section]
            );

            if (existing) {
                await db.execute(
                    `UPDATE academic_history
                     SET grade = ?, status = ?, academic_year = ?, semester = ?
                     WHERE history_id = ?`,
                    [
                        numericGrade,
                        status,
                        rec.academic_year || "2025-2026",
                        rec.semester || 1,
                        existing.history_id,
                    ]
                );
            } else {
                await db.execute(
                    `INSERT INTO academic_history
                        (student_id, subject_section, semester, academic_year, grade, status)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        student_id,
                        rec.subject_section,
                        rec.semester || 1,
                        rec.academic_year || "2025-2026",
                        numericGrade,
                        status,
                    ]
                );
            }
        }

        const [failed] = await db.execute(
            `SELECT COUNT(*) AS failCount
             FROM academic_history
             WHERE student_id = ? AND status = 'Failed'`,
            [student_id]
        );

        const newStatus = failed[0].failCount > 0 ? "Irregular" : "Regular";

        await db.execute(
            `UPDATE students SET student_status = ? WHERE student_id = ?`,
            [newStatus, student_id]
        );

        await sendNotification(
            "student",
            student_id,
            "Grades Updated",
            "Your grades have been updated. Please check your academic record.",
            "grade",
            "/grades"
        );

        res.json({ message: "Grades updated successfully", student_status: newStatus });
    } catch (err) {
        console.error("Error updating grades:", err);
        res.status(500).json({ error: "Failed to update grades" });
    }
};
