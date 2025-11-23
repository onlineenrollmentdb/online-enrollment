const express = require('express');
const router = express.Router();
const subjectsController = require('../controllers/subjectsController');

// CRUD for subjects
router.get('/', subjectsController.getAllSubjects);
router.post('/', subjectsController.createSubject);
router.put('/:id', subjectsController.updateSubject);
router.delete('/:id', subjectsController.deleteSubject);

// CRUD for prerequisites
router.post('/prerequisites', subjectsController.addPrerequisite);
router.delete('/prerequisites/:id', subjectsController.deletePrerequisite);

module.exports = router;
