const db = require("../db");

// 🔹 Robust date parser
const makeDate = (dateInput) => {
  if (!dateInput) return null;

  // If already a Date object
  if (dateInput instanceof Date) return dateInput;

  // If string
  if (typeof dateInput === "string") {
    const cleanDate = dateInput.split(" ")[0]; // YYYY-MM-DD only
    const [year, month, day] = cleanDate.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  // If number (timestamp)
  if (typeof dateInput === "number") return new Date(dateInput);

  console.error("Unknown date format:", dateInput);
  return null;
};

// 🔹 Determine current semester
exports.determineSemester = (settings) => {
  const today = new Date();

  const firstStart = makeDate(settings.first_sem_start);
  const firstEnd = makeDate(settings.first_sem_end);
  const secondStart = makeDate(settings.second_sem_start);
  const secondEnd = makeDate(settings.second_sem_end);
  const summerStart = makeDate(settings.summer_start);
  const summerEnd = makeDate(settings.summer_end);

  if (!firstStart || !firstEnd || !secondStart || !secondEnd || !summerStart || !summerEnd) {
    console.error("One or more semester dates are invalid:", settings);
    return { current_semester: "Unknown" };
  }

  if (today >= firstStart && today <= firstEnd) return { current_semester: "1st" };
  if (today >= secondStart && today <= secondEnd) return { current_semester: "2nd" };
  if (today >= summerStart && today <= summerEnd) return { current_semester: "Summer" };
  return { current_semester: "Break" };
};

// 🔹 Get latest settings
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM settings ORDER BY setting_id DESC LIMIT 1"
    );
    if (rows.length === 0) return res.status(404).json({ error: "No settings found" });

    const settings = rows[0];
    const { current_semester } = exports.determineSemester(settings);

    res.json({ ...settings, current_semester });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// 🔹 Update settings
exports.updateSettings = async (req, res) => {
  const {
    first_sem_start,
    first_sem_end,
    first_sem_enrollment_start,
    first_sem_enrollment_end,
    second_sem_start,
    second_sem_end,
    second_sem_enrollment_start,
    second_sem_enrollment_end,
    summer_start,
    summer_end,
    current_academic_year
  } = req.body;

  if (
    !first_sem_start || !first_sem_end ||
    !first_sem_enrollment_start || !first_sem_enrollment_end ||
    !second_sem_start || !second_sem_end ||
    !second_sem_enrollment_start || !second_sem_enrollment_end ||
    !summer_start || !summer_end ||
    !current_academic_year
  ) {
    return res.status(400).json({ error: "All semester dates and school year are required" });
  }

  try {
    const [result] = await db.execute(
      `UPDATE settings
        SET first_sem_start = ?, first_sem_end = ?,
            first_sem_enrollment_start = ?, first_sem_enrollment_end = ?,
            second_sem_start = ?, second_sem_end = ?,
            second_sem_enrollment_start = ?, second_sem_enrollment_end = ?,
            summer_start = ?, summer_end = ?,
            current_academic_year = ?, updated_at = CURRENT_TIMESTAMP
        WHERE setting_id = (
          SELECT s.setting_id FROM (SELECT setting_id FROM settings ORDER BY setting_id DESC LIMIT 1) s
        )`,
      [
        first_sem_start, first_sem_end,
        first_sem_enrollment_start, first_sem_enrollment_end,
        second_sem_start, second_sem_end,
        second_sem_enrollment_start, second_sem_enrollment_end,
        summer_start, summer_end,
        current_academic_year
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "No settings found to update" });

    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// 🔹 Auto-create next school year
exports.autoCreateNextYear = async () => {
  try {
    const [rows] = await db.execute("SELECT * FROM settings ORDER BY setting_id DESC LIMIT 1");
    if (rows.length === 0) return;

    const settings = rows[0];
    const today = new Date();
    const summerEnd = makeDate(settings.summer_end);

    if (!summerEnd) {
      console.error("Invalid summer_end date in settings:", settings);
      return;
    }

    if (today > summerEnd) {
      const [startYear, endYear] = settings.current_academic_year.split("-").map(Number);
      const newAcademicYear = `${startYear + 1}-${endYear + 1}`;

      const [existing] = await db.execute(
        "SELECT * FROM settings WHERE current_academic_year = ?",
        [newAcademicYear]
      );
      if (existing.length > 0) return;

      await db.execute(
        `INSERT INTO settings (
          first_sem_enrollment_start, first_sem_enrollment_end,
          first_sem_start, first_sem_end,
          second_sem_enrollment_start, second_sem_enrollment_end,
          second_sem_start, second_sem_end,
          summer_start, summer_end,
          current_semester, current_academic_year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          settings.first_sem_enrollment_start, settings.first_sem_enrollment_end,
          settings.first_sem_start, settings.first_sem_end,
          settings.second_sem_enrollment_start, settings.second_sem_enrollment_end,
          settings.second_sem_start, settings.second_sem_end,
          settings.summer_start, settings.summer_end,
          "1st", newAcademicYear,
        ]
      );

      console.log(`✅ New settings created for ${newAcademicYear}`);
    }
  } catch (err) {
    console.error("Auto-create next year error:", err);
  }
};
