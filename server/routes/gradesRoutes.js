const express = require("express");
const router = express.Router();
const gradesController = require("../controllers/gradesController");

// GET student’s grades + subjects
router.get("/student/:student_id", gradesController.getStudentSubjectsWithGrades);

// PUT update student’s grades
router.put("/student/:student_id", gradesController.updateStudentGrades);

module.exports = router;
