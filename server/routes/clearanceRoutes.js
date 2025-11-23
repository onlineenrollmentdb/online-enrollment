// routes/clearanceRoutes.js
const express = require("express");
const router = express.Router();
const clearanceController = require("../controllers/clearanceController");

// --------------------
// 🧾 Clearance Management
// --------------------
router.put("/update", clearanceController.updateClearance);

module.exports = router;
