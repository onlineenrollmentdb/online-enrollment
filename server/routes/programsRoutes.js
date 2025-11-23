// routes/programsRoutes.js
const express = require("express");
const router = express.Router();
const programsController = require("../controllers/programsController");

// --------------------
// 🏫 Departments + Programs
// --------------------
router.get("/", programsController.getPrograms);
router.get("/departments", programsController.getDepartments);
router.get("/departments-programs", programsController.getDepartmentsWithPrograms);

module.exports = router;
