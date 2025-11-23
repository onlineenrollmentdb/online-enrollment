const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');

// CRUD
router.get('/', facultyController.getAllFaculty);
router.post('/', facultyController.createFaculty);
router.put('/:id', facultyController.updateFaculty);
router.delete('/:id', facultyController.deleteFaculty);

// Login
router.post('/login', facultyController.loginFaculty);

module.exports = router;
