const express = require('express');
const router = express.Router();
const controller = require('../controllers/enrollmentsController');

router.post('/', controller.enrollStudent);
router.get('/status/:student_id', controller.getEnrollmentStatus);
router.get('/grades/:student_id', controller.getStudentGrades);

router.put('/status/:student_id', controller.updateEnrollmentStatus);
router.get("/:student_id/subjects", controller.getEnrolledSubjects);


module.exports = router;
