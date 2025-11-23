const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

// Get the latest academic settings
router.get("/", settingsController.getSettings);

// Update academic settings
router.put("/", settingsController.updateSettings);

module.exports = router;
