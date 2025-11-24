import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import API from "../../api/api";
import AdminHeaderControls from "../components/AdminHeaderControls";

const parseDBDate = (dbDate) => (dbDate ? new Date(dbDate) : new Date());
const formatMonthDay = (date) => {
  const parsedDate = parseDBDate(date);
  return parsedDate ? parsedDate.toLocaleDateString("en-US", { month: "long", day: "2-digit" }) : "";
};

export default function SettingsTab({ settings, setSettings, fetchSettings, loading, setLoading}) {
  const [editMode, setEditMode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [previewSettings, setPreviewSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showShiftModal, setShowShiftModal] = useState(false);


  const handleChange = (key, date) => {
    if (!editMode) return;
    setSettings((prev) => ({ ...prev, [key]: date }));
  };

  const renderPicker = (key, type = "date") => {
    return (
      <DatePicker
        selected={parseDBDate(settings[key])}
        onChange={(d) => handleChange(key, d)}
        dateFormat="MMMM dd"
        showPopperArrow={false}
        disabled={!editMode}
        className={editMode ? "editable-datepicker" : "readonly-datepicker"}
      />
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await API.put("/settings", {
        first_sem_start: parseDBDate(settings.first_sem_start).toISOString().split("T")[0],
        first_sem_end: parseDBDate(settings.first_sem_end).toISOString().split("T")[0],
        second_sem_start: parseDBDate(settings.second_sem_start).toISOString().split("T")[0],
        second_sem_end: parseDBDate(settings.second_sem_end).toISOString().split("T")[0],
        summer_start: parseDBDate(settings.summer_start).toISOString().split("T")[0],
        summer_end: parseDBDate(settings.summer_end).toISOString().split("T")[0],
        first_sem_enrollment_start: parseDBDate(settings.first_sem_enrollment_start).toISOString().split("T")[0],
        first_sem_enrollment_end: parseDBDate(settings.first_sem_enrollment_end).toISOString().split("T")[0],
        second_sem_enrollment_start: parseDBDate(settings.second_sem_enrollment_start).toISOString().split("T")[0],
        second_sem_enrollment_end: parseDBDate(settings.second_sem_enrollment_end).toISOString().split("T")[0],
        current_academic_year: settings.current_academic_year,
      });
      alert("Settings updated successfully!");
      setEditMode(false);
      fetchSettings();
    } catch (err) {
      console.error(err);
      alert("Error saving settings.");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };


  if (!settings) return <p>Loading settings...</p>;

  return (
    <div className="settings-container">
      <AdminHeaderControls
        searchQuery={searchTerm}
        setSearchQuery={setSearchTerm}
        settings={settings}
        tab="settings"
      />

      {/* Semesters + Actions */}
      <div className="settings-grid">
        <div className="settings-semesters">
          {["first_sem", "second_sem", "summer"].map((sem) => (
            <div key={sem} className="settings-section minimalist-section">
              <h3>
                {sem === "first_sem" ? "1st Semester" : sem === "second_sem" ? "2nd Semester" : "Summer"}
              </h3>
              <div className="settings-row" style={{ gap: "1rem" }}>
                {/* Enrollment Date */}
                {sem !== "summer" && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label><h2>Enrollment Date</h2></label>
                    {editMode ? (
                      <div style={{ display: "flex", gap: "1rem" }}>
                        {renderPicker(`${sem}_enrollment_start`, "enrollment")}
                        {renderPicker(`${sem}_enrollment_end`, "enrollment")}
                      </div>
                    ) : (
                      <h6 style={{ margin: 0 }}>
                        {formatMonthDay(settings[`${sem}_enrollment_start`])} - {formatMonthDay(settings[`${sem}_enrollment_end`])}
                      </h6>
                    )}
                  </div>
                )}
                {/* Semester Date */}
                <div style={{ marginBottom: "1rem" }}>
                  <label><h2>Semester Date</h2></label>
                  {editMode ? (
                    <div style={{ display: "flex", gap: "1rem" }}>
                      {renderPicker(`${sem}_start`, "semester")}
                      {renderPicker(`${sem}_end`, "semester")}
                    </div>
                  ) : (
                    <h6 style={{ margin: 0 }}>
                      {formatMonthDay(sem === "summer" ? settings.summer_start : settings[`${sem}_start`])} -{" "}
                      {formatMonthDay(sem === "summer" ? settings.summer_end : settings[`${sem}_end`])}
                    </h6>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions panel */}
        <div className="settings-actions" style={{ marginTop: "1rem" }}>
          <div>
            <button
              className="btn btn-primary m-2"
              onClick={() => {
                if (editMode) setShowConfirmModal(true);
                else setEditMode(true);
              }}
            >
              {editMode ? "Save Settings" : "Edit Settings"}
            </button>

            {editMode && (
              <button
                className="btn btn-secondary m-2"
                onClick={() => {
                  fetchSettings();
                  setEditMode(false);
                }}
              >
                Cancel
              </button>
            )}

            {/* Shift Semester */}
            {editMode && (
              <button
                className="btn btn-warning m-2"
                onClick={() => {
                  setPreviewSettings({ ...settings });
                  setShowShiftModal(true);
                }}
              >
                Shift Semester
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h5>Confirm Save</h5>
            <p>This action will overwrite important academic settings. Are you sure?</p>
            <div className="mt-3">
              <button className="btn btn-success me-2" onClick={handleSave}>
                Yes, Save
              </button>
              <button className="btn btn-secondary me-2 mt-2" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Semester Modal (simplified: only 1st sem start/end editable) */}
      {showShiftModal && previewSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h5>Shift 1st Semester</h5>
            <p>Update the 1st Semester start and end dates only.</p>

            <div className="mb-3">
              <label>1st Semester Start:</label>
              <DatePicker
                selected={previewSettings.first_sem_start}
                onChange={(date) => setPreviewSettings((prev) => ({ ...prev, first_sem_start: date }))}
                dateFormat="MMMM dd"
              />
            </div>

            <div className="mb-3">
              <label>1st Semester End:</label>
              <DatePicker
                selected={previewSettings.first_sem_end}
                onChange={(date) => setPreviewSettings((prev) => ({ ...prev, first_sem_end: date }))}
                dateFormat="MMMM dd"
              />
            </div>

            <div className="mt-3">
              <button
                className="btn btn-success me-2"
                onClick={() => {
                  setSettings(previewSettings);
                  setPreviewSettings(null);
                  setShowShiftModal(false);
                }}
              >
                Apply
              </button>
              <button className="btn btn-secondary me-2 mt-2" onClick={() => setShowShiftModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
