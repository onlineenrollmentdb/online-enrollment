const db = require('../db');

function safe(val) {
    return val === undefined ? null : val;
}

// Fetch all subjects with prerequisites
exports.getAllSubjects = async (req, res) => {
    const { year_level, semester } = req.query;

    let query = `
        SELECT
            s.subject_id,
            s.subject_section,
            s.subject_code,
            s.subject_desc,
            s.units,
            s.lec_hours,
            s.lab_hours,
            s.year_level,
            s.semester,
            s.program_id,
            GROUP_CONCAT(
                CASE
                    WHEN pr.prereq_subject_code = 'YEAR_STANDING'
                        THEN CONCAT(pr.type, ':YEAR_STANDING')
                    ELSE CONCAT(pr.type, ':', sp.subject_code)
                END
                ORDER BY pr.type, pr.prereq_subject_code
                SEPARATOR ','
            ) AS prerequisites
        FROM subjects s
        LEFT JOIN prerequisites pr ON s.subject_code = pr.subject_code
        LEFT JOIN subjects sp ON pr.prereq_subject_code = sp.subject_code
        WHERE 1=1
    `;

    const params = [];
    if (year_level) {
        query += ` AND s.year_level = ?`;
        params.push(year_level);
    }
    if (semester) {
        query += ` AND s.semester = ?`;
        params.push(semester);
    }

    query += ` GROUP BY s.subject_id ORDER BY s.year_level, s.semester, s.subject_section`;

    try {
        const [rows] = await db.execute(query, params);
        const formatted = rows.map(subject => ({
            ...subject,
            prerequisites: subject.prerequisites
                ? subject.prerequisites.split(',').map(p => {
                      const [type, code] = p.split(':');
                      return { type, code };
                  })
                : []
        }));
        res.status(200).json(formatted);
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
};

// Add a subject
exports.createSubject = async (req, res) => {
    const {
        subject_section,
        subject_code,
        subject_desc,
        units,
        lec_hours,
        lab_hours,
        year_level,
        semester,
        program_id,
    } = req.body;

    try {
        const [result] = await db.execute(
            `INSERT INTO subjects
            (subject_section, subject_code, subject_desc, units, lec_hours, lab_hours, year_level, semester, program_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [subject_section, subject_code, subject_desc, units, lec_hours, lab_hours, year_level, semester, program_id]
        );
        res.status(201).json({
            message: "Subject created successfully",
            subject_id: result.insertId,
        });
    } catch (err) {
        console.error("Error creating subject:", err);
        res.status(500).json({ error: "Failed to create subject" });
    }
};

// Update a subject and its prerequisites
exports.updateSubject = async (req, res) => {
    const { id } = req.params;
    const {
        subject_section,
        subject_code,
        subject_desc,
        units,
        lec_hours,
        lab_hours,
        year_level,
        semester,
        program_id,
        prerequisites = [],
    } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Validate semester
        const allowedSemesters = ["1st", "2nd", "Summer"];
        if (!allowedSemesters.includes(semester)) {
            return res.status(400).json({ error: "Invalid semester value" });
        }

        // Update subject
        const [result] = await connection.execute(
            `UPDATE subjects SET
                subject_section = ?, subject_code = ?, subject_desc = ?,
                units = ?, lec_hours = ?, lab_hours = ?,
                year_level = ?, semester = ?, program_id = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE subject_id = ?`,
            [
                safe(subject_section),
                safe(subject_code),
                safe(subject_desc),
                safe(units),
                safe(lec_hours),
                safe(lab_hours),
                safe(year_level),
                safe(semester),
                safe(program_id),
                id
            ]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Subject not found" });
        }

        // Delete old prerequisites
        await connection.execute(
            `DELETE FROM prerequisites WHERE subject_code = ?`,
            [subject_code]
        );

        // Insert new prerequisites
        if (prerequisites.length > 0) {
            const prereqValues = prerequisites.map(p => [subject_code, p.code, p.type || 'Pre']);
            await connection.query(
                `INSERT INTO prerequisites (subject_code, prereq_subject_code, type) VALUES ?`,
                [prereqValues]
            );
        }

        await connection.commit();
        res.json({ message: "Subject and prerequisites updated successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Error updating subject:", err.message);
        res.status(500).json({ error: "Failed to update subject", details: err.message });
    } finally {
        connection.release();
    }
};

// Delete a subject
exports.deleteSubject = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM subjects WHERE subject_id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Subject not found" });
        }
        res.json({ message: "Subject deleted successfully" });
    } catch (err) {
        console.error("Error deleting subject:", err);
        res.status(500).json({ error: "Failed to delete subject" });
    }
};

// Add prerequisite
exports.addPrerequisite = async (req, res) => {
    const { subject_code, prereq_subject_code, type } = req.body;
    if (!subject_code || !prereq_subject_code || !type) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    try {
        await db.execute(
            `INSERT INTO prerequisites (subject_code, prereq_subject_code, type)
             VALUES (?, ?, ?)`,
            [subject_code, prereq_subject_code, type]
        );
        res.status(201).json({ message: "Prerequisite added successfully" });
    } catch (err) {
        console.error("Error adding prerequisite:", err);
        res.status(500).json({ error: "Failed to add prerequisite" });
    }
};

// Delete prerequisite
exports.deletePrerequisite = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM prerequisites WHERE prerequisite_id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Prerequisite not found" });
        }
        res.json({ message: "Prerequisite deleted successfully" });
    } catch (err) {
        console.error("Error deleting prerequisite:", err);
        res.status(500).json({ error: "Failed to delete prerequisite" });
    }
};
