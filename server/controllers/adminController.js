const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fastcsv = require("fast-csv");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const dayjs = require("dayjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { sendNotification } = require("../helpers/notificationHelper");
const { fetchStudents, fetchEnrolledStudents } = require("../helpers/studentHelpers");
require("dotenv").config();

/* -------------------------------------------------------------------------- */
/*                           📧 EMAIL TRANSPORTER                              */
/* -------------------------------------------------------------------------- */

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

/* -------------------------------------------------------------------------- */
/*                             🧠 AUTHENTICATION + 2FA                         */
/* -------------------------------------------------------------------------- */

// ✅ Step 1: Login → send 2FA code
exports.login = async (req, res) => {
	try {
		const { username, password } = req.body;
		const [rows] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);

		if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

		const admin = rows[0];
		const isMatch = await bcrypt.compare(password, admin.password);
		if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

		// Generate 2FA code
		const code = crypto.randomInt(100000, 999999).toString();

		// Save code & expiry (5 minutes)
		await db.execute(
			"UPDATE admins SET two_fa_code = ?, two_fa_expires = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE admin_id = ?",
			[code, admin.admin_id]
		);

		// Send via email
		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to: admin.email,
			subject: "Your 2FA Verification Code",
			text: `Your 2FA code is: ${code}. It will expire in 5 minutes.`,
		});

		res.json({
			require2FA: true,
			message: "2FA code sent to your email.",
			admin_id: admin.admin_id,
		});
	} catch (err) {
		console.error("Admin login error:", err);
		res.status(500).json({ error: "Failed to login" });
	}
};

// ✅ Step 2: Verify 2FA code → return JWT
exports.verify2FA = async (req, res) => {
	try {
		const { admin_id, code } = req.body;

		if (!admin_id || !code)
			return res.status(400).json({ error: "Admin ID and code are required" });

		const [rows] = await db.execute(
			"SELECT * FROM admins WHERE admin_id = ? AND two_fa_code = ? AND two_fa_expires > NOW()",
			[admin_id, code]
		);

		if (!rows.length)
			return res.status(401).json({ error: "Invalid or expired 2FA code" });

		const admin = rows[0];

		// Clear used 2FA
		await db.execute(
			"UPDATE admins SET two_fa_code = NULL, two_fa_expires = NULL WHERE admin_id = ?",
			[admin_id]
		);

		// Issue JWT
		const token = jwt.sign(
			{ admin_id: admin.admin_id, username: admin.username },
			process.env.JWT_SECRET,
			{ expiresIn: "12h" }
		);

		res.json({
			message: "2FA verified successfully",
			token,
			admin: { id: admin.admin_id, username: admin.username },
		});
	} catch (err) {
		console.error("verify2FA error:", err);
		res.status(500).json({ error: "Failed to verify 2FA" });
	}
};

/* -------------------------------------------------------------------------- */
/*                             🎓 STUDENT HANDLERS                            */
/* -------------------------------------------------------------------------- */

exports.getAllStudents = async (req, res) => {
	try {
		const students = await fetchStudents();
		res.json(students);
	} catch (err) {
		console.error("getAllStudents error:", err);
		res.status(500).json({ error: "Failed to fetch students" });
	}
};

exports.getApprovedStudents = async (req, res) => {
	try {
		const students = await fetchStudents({ onlyApproved: true });
		res.json(students);
	} catch (err) {
		console.error("getApprovedStudents error:", err);
		res.status(500).json({ error: "Failed to fetch approved students" });
	}
};

exports.getPendingStudents = async (req, res) => {
	try {
		const students = await fetchStudents({ onlyPending: true });
		res.json(students);
	} catch (err) {
		console.error("getPendingStudents error:", err);
		res.status(500).json({ error: "Failed to fetch pending students" });
	}
};

exports.getEnrolledStudents = async (req, res) => {
	try {
		const students = await fetchEnrolledStudents();
		res.json(students);
	} catch (err) {
		console.error("getEnrolledStudents error:", err);
		res.status(500).json({ error: "Failed to fetch enrolled students" });
	}
};

exports.getStudentSubjects = async (req, res) => {
  const { student_id } = req.params;

  try {
    const [enrollmentRows] = await db.execute(
      `
      SELECT
        e.*
      FROM enrollments e
      WHERE e.student_id = ?
      ORDER BY e.enrollment_id DESC
      LIMIT 1
      `,
      [student_id]
    );

    if (enrollmentRows.length === 0) {
      return res.status(404).json({ message: "No enrollment found for this student." });
    }

    const enrollment = enrollmentRows[0];

    // 2️⃣ Fetch all subjects linked to this enrollment
    const [subjects] = await db.execute(
      `
      SELECT
        s.subject_code,
        s.subject_desc,
        s.units,
        es.subject_section
      FROM enrollment_subjects es
      JOIN subjects s ON es.subject_section = s.subject_section
      WHERE es.enrollment_id = ?
      `,
      [enrollment.enrollment_id]
    );

    res.json({
      academic_year: enrollment.academic_year,
      semester: enrollment.semester,
      status: enrollment.status,
      faculty_id: enrollment.faculty_id,
      subjects,
    });
  } catch (error) {
    console.error("❌ Error fetching student subjects:", error);
    res.status(500).json({ error: "Failed to fetch student subjects" });
  }
};
/* -------------------------------------------------------------------------- */
/*                              ✅ APPROVAL FLOW                              */
/* -------------------------------------------------------------------------- */

exports.approveStudent = async (req, res) => {
	const { student_id } = req.params;
	const { academic_year, semester } = req.body;
	const adminId = req.admin?.admin_id || null;

	if (!academic_year || !semester)
		return res.status(400).json({ error: "Academic year and semester required" });

	try {
		await db.execute("UPDATE students SET is_approved = 1 WHERE student_id = ?", [student_id]);

		const [existing] = await db.execute(
			`SELECT enrollment_id FROM enrollments
			 WHERE student_id = ? AND academic_year = ? AND semester = ? LIMIT 1`,
			[student_id, academic_year, semester]
		);

		if (existing.length) {
			await db.execute(
				"UPDATE enrollments SET enrollment_status = 0 WHERE enrollment_id = ?",
				[existing[0].enrollment_id]
			);
		} else {
			await db.execute(
				"INSERT INTO enrollments (student_id, enrollment_status, academic_year, semester) VALUES (?, 0, ?, ?)",
				[student_id, academic_year, semester]
			);
		}

		const [[student]] = await db.execute(
			"SELECT email, first_name FROM students WHERE student_id = ?",
			[student_id]
		);

		await sendNotification({
			user_type: "student",
			user_id: student_id,
			title: "Enrollment Approved",
			message: `Hello ${student.first_name}, your enrollment has been approved. Please proceed to enroll.`,
			type: "enrollment",
			link: "/enroll",
			sender_id: adminId,
			email: student.email,
		});

		res.json({ message: "Student approved and notified successfully." });
	} catch (err) {
		console.error("approveStudent error:", err);
		res.status(500).json({ error: "Failed to approve student" });
	}
};

/* -------------------------------------------------------------------------- */
/*                          ✅ ENROLLMENT MANAGEMENT                          */
/* -------------------------------------------------------------------------- */

exports.confirmEnrollment = async (req, res) => {
	const { enrollment_id } = req.params;

	try {
		await db.execute(
			"UPDATE enrollments SET enrollment_status = 3 WHERE enrollment_id = ?",
			[enrollment_id]
		);

		const [[row]] = await db.execute(
			`SELECT s.email, s.student_id
			 FROM enrollments e
			 JOIN students s ON s.student_id = e.student_id
			 WHERE e.enrollment_id = ?`,
			[enrollment_id]
		);

		await db.execute("UPDATE students SET is_enrolled = 1 WHERE student_id = ?", [
			row.student_id,
		]);

		await sendNotification({
			user_type: "student",
			user_id: row.student_id,
			title: "Enrollment Confirmed",
			message: "Your enrollment request has been confirmed.",
			type: "enrollment",
			link: "/enrollment",
			email: row.email,
		});

		res.json({ message: "Enrollment confirmed successfully." });
	} catch (err) {
		console.error("confirmEnrollment error:", err);
		res.status(500).json({ error: "Failed to confirm enrollment" });
	}
};

exports.revokeEnrollment = async (req, res) => {
	const { enrollment_id } = req.params;

	try {
		await db.execute(
			"UPDATE enrollments SET enrollment_status = 1 WHERE enrollment_id = ?",
			[enrollment_id]
		);

		const [[row]] = await db.execute(
			`SELECT s.email, s.student_id
			 FROM enrollments e
			 JOIN students s ON s.student_id = e.student_id
			 WHERE e.enrollment_id = ?`,
			[enrollment_id]
		);

		await db.execute("UPDATE students SET is_enrolled = 0 WHERE student_id = ?", [
			row.student_id,
		]);

		await sendNotification({
			user_type: "student",
			user_id: row.student_id,
			title: "Enrollment Revoked",
			message: "Your enrollment has been revoked by the administrator.",
			type: "enrollment",
			link: "/enrollment",
			email: row.email,
		});

		res.json({ message: "Enrollment revoked successfully." });
	} catch (err) {
		console.error("revokeEnrollment error:", err);
		res.status(500).json({ error: "Failed to revoke enrollment" });
	}
};

/* -------------------------------------------------------------------------- */
/*                            ⚙️ STUDENT MANAGEMENT                           */
/* -------------------------------------------------------------------------- */

exports.deleteStudent = async (req, res) => {
	const { student_id } = req.params;
	try {
		await db.execute("DELETE FROM students WHERE student_id = ?", [student_id]);
		res.json({ message: "Student deleted successfully" });
	} catch (err) {
		console.error("deleteStudent error:", err);
		res.status(500).json({ error: "Failed to delete student" });
	}
};

exports.updateStudent = async (req, res) => {
	const { student_id } = req.params;
	const { first_name, middle_name, last_name, email, year_level, student_status, program_id } =
		req.body;

	try {
		await db.execute(
			`UPDATE students
			 SET first_name=?, middle_name=?, last_name=?, email=?, year_level=?, student_status=?, program_id=?
			 WHERE student_id=?`,
			[first_name, middle_name, last_name, email, year_level, student_status, program_id, student_id]
		);
		res.json({ message: "Student updated successfully" });
	} catch (err) {
		console.error("updateStudent error:", err);
		res.status(500).json({ error: "Failed to update student" });
	}
};


// -----------------------------
// 📤 EXPORT ENROLLED STUDENTS TO CSV (FILTERED)
// -----------------------------
exports.exportEnrolledStudentsCSV = async (req, res) => {
  const { year, semester, type } = req.query;

  if (!year) return res.status(400).json({ error: "Year is required" });
  if (!semester && type === "regular")
    return res.status(400).json({ error: "Semester is required for regular students" });

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const today = dayjs().format("YYYYMMDD");
    const filename = `${today}_${type.toUpperCase()}_${year}_${semester || ""}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const csvStream = fastcsv.format({ headers: true });
    csvStream.pipe(res);

    // Fetch students with enrollments
    let studentsQuery = `
      SELECT s.student_id,
             s.first_name,
             s.middle_name,
             s.last_name,
             s.year_level,
             s.section,
             p.program_name,
             e.enrollment_id,
             e.total_units
      FROM students s
      JOIN programs p ON s.program_id = p.program_id
      JOIN enrollments e ON s.student_id = e.student_id
      WHERE e.enrollment_status = 3
        AND e.academic_year = ?
        AND s.student_status = ?`;

    const params = [year, type === "regular" ? "Regular" : "Irregular"];
    if (type === "regular") {
      studentsQuery += " AND e.semester = ?";
      params.push(semester);
    }

    const [students] = await connection.execute(studentsQuery, params);

    const enrollmentIdsToUpdate = [];

    for (const student of students) {
      const row = {
        student_id: student.student_id,
        full_name: `${student.last_name}, ${student.first_name} ${student.middle_name || ""}`,
        year_level: student.year_level,
        section: student.section || "-",
        program_name: student.program_name,
        total_units: student.total_units || 0,
      };

      if (type === "irregular") {
        const [subjects] = await connection.execute(
          `SELECT s.subject_code
           FROM enrollment_subjects es
           JOIN subjects s ON es.subject_section = s.subject_section
           WHERE es.enrollment_id = ?
           ORDER BY es.subject_section ASC
           LIMIT 10`,
          [student.enrollment_id]
        );

        for (let i = 0; i < 10; i++) {
          row[`s${i + 1}`] = subjects[i]?.subject_code || "-";
        }
      }

      csvStream.write(row);
      enrollmentIdsToUpdate.push(student.enrollment_id);
    }

    // Finish CSV stream
    csvStream.end();

    // After stream finishes, update enrollment_status in batches
    csvStream.on("finish", async () => {
      try {
        const BATCH_SIZE = 100;
        for (let i = 0; i < enrollmentIdsToUpdate.length; i += BATCH_SIZE) {
          const batch = enrollmentIdsToUpdate.slice(i, i + BATCH_SIZE);
          if (batch.length === 0) continue;

          const placeholders = batch.map(() => "?").join(", ");
          await connection.execute(
            `UPDATE enrollments SET enrollment_status = 4 WHERE enrollment_id IN (${placeholders})`,
            batch
          );
        }

        await connection.commit();
      } catch (err) {
        await connection.rollback();
        console.error("Transaction error after CSV stream:", err);
      } finally {
        connection.release();
      }
    });

  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("❌ exportEnrolledStudentsCSV error:", err);

    // Only send JSON if headers not sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to export enrolled students" });
    }
  }
};

// POST /api/admin/login
exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        // 1) Try admin table (admin_user)
        const [admins] = await db.execute('SELECT admin_id, admin_user, admin_pass FROM admin WHERE admin_user = ?', [username]);

        if (admins.length > 0) {
            const admin = admins[0];
            const isMatch = await bcrypt.compare(password, admin.admin_pass);
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

            const userRole = 'admin';
            const payload = { id: admin.admin_id, role: userRole, user: admin.admin_user };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            return res.json({ token, userRole, user: { id: admin.admin_id, username: admin.admin_user } });
        }

        // 2) Try faculties table (use email as login identifier)
        const [facRows] = await db.execute('SELECT faculty_id, email, password, first_name, last_name FROM faculties WHERE email = ?', [username]);

        if (facRows.length > 0) {
            const fac = facRows[0];
            if (!fac.password) {
                // If faculty accounts do not have password column populated, return clear error
                return res.status(401).json({ error: 'Faculty account requires password setup' });
            }
            const isMatch = await bcrypt.compare(password, fac.password);
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

            const userRole = 'faculty';
            const payload = { id: fac.faculty_id, role: userRole, user: fac.email };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            return res.json({
                token,
                userRole,
                user: { id: fac.faculty_id, email: fac.email, name: `${fac.first_name} ${fac.last_name}` }
            });
        }

        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};




