const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '12h';

exports.getAllFaculty = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.*, d.department_name
      FROM faculties f
      LEFT JOIN departments d ON f.department_id = d.department_id
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching faculty:", error);
    res.status(500).json({ message: 'Error fetching faculty' });
  }
};


exports.createFaculty = async (req, res) => {
  try {
    const { first_name, last_name, email, department_id, role, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // check duplicate email
    const [existing] = await db.query(
      "SELECT faculty_id FROM faculties WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO faculties (first_name, last_name, email, department_id, role, password)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, department_id || null, role || "grader", hashedPassword]
    );

    res.json({
      message: "Faculty created successfully",
      faculty_id: result.insertId
    });

  } catch (error) {
    console.error("Error creating faculty:", error);
    res.status(500).json({ error: "Failed to create faculty" });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, department_id, role, password } = req.body;

    let sql = `
      UPDATE faculties
      SET first_name=?, last_name=?, email=?, department_id=?, role=?
    `;
    const params = [first_name, last_name, email, department_id || null, role];

    // if password is included → update it
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql += `, password=?`;
      params.push(hashedPassword);
    }

    sql += ` WHERE faculty_id=?`;
    params.push(id);

    await db.query(sql, params);

    res.json({ message: "Faculty updated successfully" });

  } catch (error) {
    console.error("Error updating faculty:", error);
    res.status(500).json({ error: "Failed to update faculty" });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM faculties WHERE faculty_id = ?", [id]);

    res.json({ message: "Faculty deleted successfully" });

  } catch (error) {
    console.error("Error deleting faculty:", error);
    res.status(500).json({ error: "Failed to delete faculty" });
  }
};


exports.loginFaculty = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const [rows] = await db.execute(
      'SELECT * FROM faculties WHERE email = ? OR faculty_id = ?',
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const faculty = rows[0];

    const match = await bcrypt.compare(password, faculty.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { faculty_id: faculty.faculty_id, email: faculty.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _, ...facultyData } = faculty;

    res.json({
      message: "Login successful",
      user: facultyData,
      token
    });

  } catch (err) {
    console.error("Faculty login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
};
