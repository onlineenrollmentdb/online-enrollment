const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

// ✅ Auth-related routes first
router.post("/forgot-password", studentController.forgotPassword);
router.post("/reset-password", studentController.resetPassword);

// ✅ Upload profile picture route
router.post(
  "/:student_id/upload-picture",
  studentController.upload.single("profile_picture"),
  studentController.uploadProfilePicture
);

// ✅ Student academic & profile routes
router.get("/:student_id/academic-history", studentController.getAcademicHistory);
router.get("/:student_id", studentController.getStudentById);
router.put("/:student_id", studentController.updateStudent);

module.exports = router;
