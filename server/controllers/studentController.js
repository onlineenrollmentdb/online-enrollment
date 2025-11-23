const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// ====================================
// 🔹 Multer configuration for uploads
// ====================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/profile_pictures");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
exports.upload = upload;

const JWT_SECRET = process.env.JWT_SECRET;

// ====================================
// 🔹 Get student info by ID
// ====================================
exports.getStudentById = async (req, res) => {
  const { student_id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT s.*, p.program_code, p.program_name
       FROM students s
       LEFT JOIN programs p ON s.program_id = p.program_id
       WHERE s.student_id = ?`,
      [student_id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Student not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch student" });
  }
};

// ====================================
// 🔹 Get academic history
// ====================================
exports.getAcademicHistory = async (req, res) => {
  const { student_id } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT
        ah.history_id,
        ah.subject_section,
        ah.semester AS subject_semester,
        ah.academic_year,
        ah.grade,
        ah.status,
        s.subject_desc,
        s.units,
        s.year_level
      FROM academic_history ah
      LEFT JOIN subjects s
        ON ah.subject_section = s.subject_section
      WHERE ah.student_id = ?
      ORDER BY s.year_level, ah.semester
      `,
      [student_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching academic history:", err);
    res.status(500).json({ error: "Failed to fetch academic history" });
  }
};

// ====================================
// 🔹 Update student info
// ====================================
exports.updateStudent = async (req, res) => {
  const { student_id } = req.params;
  const { viewMode = "profile", ...data } = req.body;

  try {
    let allowedFields = [];

    if (viewMode === "enrollment") {
      allowedFields = [
        "last_name", "first_name", "middle_name", "permanent_address",
        "contact_number", "email", "congressional_district", "region",
        "gender", "birth_date", "birthplace", "citizenship", "religion",
        "civil_status", "guardian_name", "guardian_relationship",
        "guardian_contact", "guardian_email",
      ];
    } else {
      allowedFields = [
        "last_name", "first_name", "middle_name", "permanent_address",
        "contact_number", "email", "congressional_district", "region",
        "gender", "birth_date", "birthplace", "citizenship", "religion",
        "civil_status", "father_name", "father_occupation", "father_contact",
        "mother_name", "mother_occupation", "mother_contact", "guardian_name",
        "guardian_relationship", "guardian_contact", "guardian_email",
      ];
    }

    const updates = [];
    const values = [];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (updates.length === 0)
      return res.status(400).json({ message: "No valid fields to update" });

    values.push(student_id);

    const sql = `
      UPDATE students
      SET ${updates.join(", ")}
      WHERE student_id = ?
    `;

    await db.query(sql, values);

    res.json({ message: "Student updated successfully" });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Failed to update student" });
  }
};

// ====================================
// 🔹 Forgot Password
// ====================================
exports.forgotPassword = async (req, res) => {
  const { student_id } = req.body;

  if (!student_id)
    return res.status(400).json({ error: "Student ID is required" });

  try {
    const [rows] = await db.execute(
      "SELECT * FROM students WHERE student_id = ?",
      [student_id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Student not found" });

    const student = rows[0];
    if (!student.email)
      return res.status(400).json({ error: "No email on record" });

    const resetToken = jwt.sign({ student_id: student.student_id }, JWT_SECRET, {
      expiresIn: "15m",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"CTU Enrollment System" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: "CTU Password Reset Request",
      html: `
        <p>Hello ${student.first_name},</p>
        <p>You requested to reset your password.</p>
        <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({ message: "Password reset email sent successfully." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Server error sending reset link." });
  }
};

// ====================================
// 🔹 Reset Password
// ====================================
exports.resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword)
    return res.status(400).json({ error: "All fields are required" });

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const student_id = decoded.student_id;

    const [rows] = await db.execute(
      "SELECT * FROM students WHERE student_id = ?",
      [student_id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Invalid token or user not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute("UPDATE students SET password = ? WHERE student_id = ?", [
      hashedPassword,
      student_id,
    ]);

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired. Please request again." });
    }
    res.status(401).json({ error: "Invalid or expired token." });
  }
};

// ====================================
// 🔹 Upload Profile Picture
// ====================================
exports.uploadProfilePicture = async (req, res) => {
  try {
    const studentId = req.params.student_id;
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const newFilePath = `/uploads/profile_pictures/${req.file.filename}`;

    // Fetch old picture path
    const [rows] = await db.execute(
      "SELECT profile_picture FROM students WHERE student_id = ?",
      [studentId]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Student not found." });

    const oldPicture = rows[0].profile_picture;

    // Delete old picture if exists
    if (oldPicture && oldPicture !== newFilePath) {
      const oldFilePath = path.join(__dirname, `..${oldPicture}`);
      fs.unlink(oldFilePath, (err) => {
        if (err) console.warn("⚠️ Could not delete old picture:", err.message);
      });
    }

    await db.execute(
      "UPDATE students SET profile_picture = ? WHERE student_id = ?",
      [newFilePath, studentId]
    );

    res.json({
      message: "Profile picture updated successfully.",
      filePath: newFilePath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Server error during upload." });
  }
};
