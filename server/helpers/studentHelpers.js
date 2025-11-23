// helpers/studentHelpers.js
const db = require('../db');

// 🔹 Fetch all students (optionally filtered)
exports.fetchStudents = async (options = {}) => {
    const {
        onlyEnrolled = false,
        onlyApproved = false,
        onlyPending = false,
        includeProgram = true,
        includeLatestEnrollment = true
    } = options;

    let query = `
        SELECT
            s.student_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.email,
            s.year_level,
            s.student_status,
            s.is_enrolled,
            s.is_approved,
            p.program_code,
            p.program_name
    `;

    if (includeLatestEnrollment) {
        query += `,
            e.enrollment_id,
            e.academic_year,
            e.semester,
            e.enrollment_status
        `;
    }

    query += `
        FROM students s
        ${includeProgram ? 'LEFT JOIN programs p ON s.program_id = p.program_id' : ''}
        ${includeLatestEnrollment
            ? `LEFT JOIN enrollments e ON e.enrollment_id = (
                SELECT ee.enrollment_id
                FROM enrollments ee
                WHERE ee.student_id = s.student_id
                ORDER BY ee.enrollment_id DESC LIMIT 1
              )`
            : ''}
        WHERE 1=1
    `;

    if (onlyEnrolled) query += ` AND s.is_enrolled = 1`;
    if (onlyApproved) query += ` AND s.is_approved = 1`;
    if (onlyPending) query += ` AND s.is_approved = 0`;

    query += ` ORDER BY s.last_name, s.first_name`;

    const [rows] = await db.execute(query);
    return rows;
};

// 🔹 Fetch enrolled students
exports.fetchEnrolledStudents = async () => {
    const [rows] = await db.execute(`
        SELECT
            s.student_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.email,
            s.profile_picture,
            s.year_level,
            s.section,
            s.student_status,
            s.is_enrolled,
            s.is_approved,
            p.program_code,
            p.program_name,
            e.enrollment_id,
            e.academic_year,
            e.semester,
            e.enrollment_status
        FROM enrollments e
        JOIN students s ON e.student_id = s.student_id
        JOIN programs p ON s.program_id = p.program_id
        WHERE e.enrollment_status = 3
    `);
    return rows;
};
