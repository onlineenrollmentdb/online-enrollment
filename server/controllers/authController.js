const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d';

// -----------------------------
// LOGIN
// -----------------------------
exports.login = async (req, res) => {
    const { student_id, password } = req.body;

    if (!student_id || !password) {
        return res.status(400).json({ error: 'Student ID and password are required' });
    }

    try {
        const [rows] = await db.execute(
            `SELECT s.*, p.program_code, p.program_name
              FROM students s
              LEFT JOIN programs p ON s.program_id = p.program_id
              WHERE s.student_id = ?`,
            [student_id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid student ID' });
        }

        const student = rows[0];

        if (!student.is_approved) {
            return res.status(403).json({ error: 'Account not yet activated, Sign up now' });
        }

        const match = await bcrypt.compare(password, student.password);
        if (!match) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        const token = jwt.sign(
            { student_id: student.student_id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const { password: _, ...studentData } = student;

        res.json({
            message: 'Login successful',
            student: studentData,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

let verificationCodes = {};
setInterval(() => {
	try {
		const now = Date.now();
		for (const [student_id, data] of Object.entries(verificationCodes)) {
			if (data.expires < now) {
				delete verificationCodes[student_id];
				console.log(`🧹 Cleared expired code for student_id ${student_id}`);
			}
		}
	} catch (err) {
		console.error('Cleanup error:', err);
	}
}, 10 * 60 * 1000); // runs every 10 minutes

// ====================================
// STEP 1: Check Student ID & Send Code
// ====================================
exports.checkStudent = async (req, res) => {
	try {
		const { student_id } = req.body;

		if (!student_id) {
			return res.status(400).json({ error: 'Student ID is required.' });
		}

		// Check student existence
		const [rows] = await db.execute('SELECT * FROM students WHERE student_id = ?', [student_id]);

		if (rows.length === 0) {
			return res.status(404).json({ error: 'Invalid student ID or student does not exist.' });
		}

		const student = rows[0];

		if (!student.email) {
			return res.status(400).json({ error: 'No email associated with this student ID.' });
		}

		if (student.is_approved === 1) {
			return res.status(400).json({ error: 'This student is already approved and active.' });
		}

		// Generate code and expiry (valid 5 minutes)
		const code = Math.floor(100000 + Math.random() * 900000).toString();
		const expires = Date.now() + 5 * 60 * 1000;

		verificationCodes[student_id] = { code, expires };

		// Send email
		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS
			}
		});

		await transporter.sendMail({
			from: `"CTU Enrollment System" <${process.env.EMAIL_USER}>`,
			to: student.email,
			subject: 'CTU Verification Code',
			text: `Hello ${student.first_name},\n\nYour verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\n- CTU Registrar`
		});

		res.json({ message: 'Verification code sent to your email.' });
	} catch (error) {
		console.error('Error in checkStudent:', error);
		res.status(500).json({ error: 'Server error while verifying student.' });
	}
};

// ====================================
// STEP 2: Verify Code & Set Password
// ====================================
exports.verifyCodeAndSetPassword = async (req, res) => {
	try {
		const { student_id, code, password, confirmPassword } = req.body;

		if (!student_id || !code || !password || !confirmPassword) {
			return res.status(400).json({ error: 'All fields are required.' });
		}

		if (password !== confirmPassword) {
			return res.status(400).json({ error: 'Passwords do not match.' });
		}

		// Check if student exists
		const [rows] = await db.execute('SELECT * FROM students WHERE student_id = ?', [student_id]);
		if (rows.length === 0) {
			return res.status(404).json({ error: 'Invalid student ID.' });
		}

		const storedCode = verificationCodes[student_id];

		// Check if code exists
		if (!storedCode) {
			return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
		}

		// Check if code expired
		if (Date.now() > storedCode.expires) {
			delete verificationCodes[student_id];
			return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
		}

		// Check if code matches
		if (storedCode.code !== code) {
			return res.status(400).json({ error: 'Invalid verification code.' });
		}

		// Update password and approve student
		const hashedPassword = await bcrypt.hash(password, 10);
		await db.execute(
			'UPDATE students SET password = ?, is_approved = 1 WHERE student_id = ?',
			[hashedPassword, student_id]
		);

		delete verificationCodes[student_id]; // Remove code after success

		res.json({ message: 'Password set successfully. Your account is now active.' });
	} catch (error) {
		console.error('Error in verifyCodeAndSetPassword:', error);
		res.status(500).json({ error: 'Server error during verification.' });
	}
};
