const db = require("../db");
const { sendNotification } = require("../helpers/notificationHelper");

// ✅ Enroll a student (with total_units calculated on backend)
exports.enrollStudent = async (req, res) => {
  const { student_id, semester, academic_year, subject_sections } = req.body;

  if (!student_id || !semester || !academic_year || !Array.isArray(subject_sections) || !subject_sections.length) {
    return res.status(400).json({ error: "Missing required fields or subjects." });
  }

  try {
    console.log("[Enroll] Start request:", req.body);

    // 1️⃣ Check if student exists
    const [[student]] = await db.execute(
      `SELECT student_status FROM students WHERE student_id = ?`,
      [student_id]
    );
    if (!student) return res.status(404).json({ error: "Student not found" });

    // 2️⃣ Calculate total units from subjects
    const [unitsRows] = await db.query(
      `SELECT SUM(units) AS total_units FROM subjects WHERE subject_section IN (?)`,
      [subject_sections]
    );
    const total_units = unitsRows[0]?.total_units || 0;

    // 3️⃣ Check if enrollment exists
    const [existing] = await db.execute(
      `SELECT enrollment_id FROM enrollments
       WHERE student_id = ? AND semester = ? AND academic_year = ?`,
      [student_id, semester, academic_year]
    );

    let enrollment_id;

    if (existing.length > 0) {
      // 4️⃣ Update existing enrollment
      enrollment_id = existing[0].enrollment_id;

      await db.execute(
        `UPDATE enrollments
         SET enrollment_status = 2, total_units = ?
         WHERE enrollment_id = ?`,
        [total_units, enrollment_id]
      );

      // 5️⃣ Replace subjects
      await db.execute(`DELETE FROM enrollment_subjects WHERE enrollment_id = ?`, [enrollment_id]);
      const values = subject_sections.map(sec => [enrollment_id, sec]);
      const placeholders = values.map(() => "(?, ?)").join(", ");
      const flatValues = values.flat();
      await db.execute(
        `INSERT INTO enrollment_subjects (enrollment_id, subject_section) VALUES ${placeholders}`,
        flatValues
      );

    } else {
      // 6️⃣ Insert new enrollment
      const status = (student.student_status || "").toLowerCase() === "regular" ? 3 : 2;
      const [result] = await db.execute(
        `INSERT INTO enrollments (student_id, enrollment_status, academic_year, semester, total_units)
         VALUES (?, ?, ?, ?, ?)`,
        [student_id, status, academic_year, semester, total_units]
      );
      enrollment_id = result.insertId;

      const values = subject_sections.map(sec => [enrollment_id, sec]);
      const placeholders = values.map(() => "(?, ?)").join(", ");
      const flatValues = values.flat();
      await db.execute(
        `INSERT INTO enrollment_subjects (enrollment_id, subject_section) VALUES ${placeholders}`,
        flatValues
      );
    }

    // 7️⃣ Update student enrolled flag
    await db.execute(`UPDATE students SET is_enrolled = 1 WHERE student_id = ?`, [student_id]);

    // 8️⃣ Send notification
    await sendNotification({
      user_type: "admin",
      user_id: 0,
      title: "Enrollment",
      message: `Student ${student_id} has enrolled successfully.`,
      type: "enrollment",
      sender_id: student_id,
      sender_type: "student",
    });

    console.log(`[Enroll] Student ${student_id} enrolled. Enrollment ID: ${enrollment_id}`);

    // 9️⃣ Respond
    res.status(201).json({
      message: "Enrollment successful",
      enrollment_id,
      total_units,
      subjectsEnrolled: subject_sections,
    });

  } catch (err) {
    console.error("[Enroll] Unexpected error:", err);
    res.status(500).json({ error: "Failed to enroll student" });
  }
};


// ✅ Get student grades
exports.getStudentGrades = async (req, res) => {
	const { student_id } = req.params;
	try {
		const [rows] = await db.execute(
			`SELECT a.*, s.subject_section, s.subject_code, s.subject_desc
       FROM academic_history a
       JOIN subjects s ON a.subject_section = s.subject_section
       WHERE a.student_id = ?`,
			[student_id]
		);
		res.status(200).json(rows);
	} catch (err) {
		console.error("[Grades] Error fetching grades:", err);
		res.status(500).json({ error: "Failed to fetch grades for student ID " + student_id });
	}
};

// ✅ Fetch latest enrollment status
exports.getEnrollmentStatus = async (req, res) => {
	const { student_id } = req.params;
	try {
		const [rows] = await db.execute(
			`SELECT enrollment_status
       FROM enrollments
       WHERE student_id = ?
       ORDER BY enrollment_id DESC
       LIMIT 1`,
			[student_id]
		);

		const step = rows.length ? rows[0].enrollment_status : 0;
		res.json({ step });
	} catch (err) {
		console.error("[EnrollStatus] Error fetching enrollment status:", err);
		res.status(500).json({ error: "Failed to fetch enrollment status" });
	}
};

// ✅ Update enrollment status manually
exports.updateEnrollmentStatus = async (req, res) => {
	const { student_id } = req.params;
	const { status } = req.body;

	try {
		const [rows] = await db.execute(
			`SELECT enrollment_id FROM enrollments
			 WHERE student_id = ?
			 ORDER BY enrollment_id DESC
			 LIMIT 1`,
			[student_id]
		);

		if (!rows.length) {
			return res.status(404).json({ error: "No enrollment record found" });
		}

		const enrollment_id = rows[0].enrollment_id;

		// ✅ Update enrollment table
		await db.execute(
			`UPDATE enrollments SET enrollment_status = ? WHERE enrollment_id = ?`,
			[status, enrollment_id]
		);

		// ✅ Sync to students table
		if (parseInt(status) === 4) {
			// Finalized enrollment → mark student as enrolled
			await db.execute(
				`UPDATE students SET is_enrolled = 1 WHERE student_id = ?`,
				[student_id]
			);
		} else {
			// Optional: If not finalized, reset enrolled flag
			await db.execute(
				`UPDATE students SET is_enrolled = 0 WHERE student_id = ?`,
				[student_id]
			);
		}

		console.log(`[EnrollStatus] Student ${student_id} → status ${status}`);

		// ✅ Emit socket event on status change
		const io = req.app.get("io");
		io.emit("enrollment-status-updated", {
			student_id,
			enrollment_id,
			status,
		});

		res.status(200).json({ message: "Status updated", enrollment_id, status });
	} catch (err) {
		console.error("[EnrollStatus] Error updating enrollment:", err);
		res.status(500).json({ error: "Failed to update enrollment status" });
	}
};

// ✅ Get enrolled subjects for a student
exports.getEnrolledSubjects = async (req, res) => {
	const { student_id } = req.params;

	try {
		const [rows] = await db.execute(
			`SELECT es.enrollment_id,
					es.subject_section,
					s.subject_code,
					s.subject_desc,
					s.units,
					s.year_level,
					s.semester
			 FROM enrollment_subjects es
			 JOIN enrollments e ON es.enrollment_id = e.enrollment_id
			 JOIN subjects s ON es.subject_section = s.subject_section
			 WHERE e.student_id = ?
			 ORDER BY s.year_level, s.semester`,
			[student_id]
		);

		res.status(200).json(rows);
	} catch (err) {
		console.error("[Enroll] Error fetching enrolled subjects:", err);
		res.status(500).json({ error: "Failed to fetch enrolled subjects" });
	}
};

