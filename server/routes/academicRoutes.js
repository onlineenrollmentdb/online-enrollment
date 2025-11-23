const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');

router.get('/academic-history/:studentId', academicController.getAcademicHistory);

module.exports = router;
