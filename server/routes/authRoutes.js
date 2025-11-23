const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/check-student', authController.checkStudent);
router.post('/verify-code', authController.verifyCodeAndSetPassword);



module.exports = router;
