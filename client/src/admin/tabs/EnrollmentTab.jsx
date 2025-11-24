import React, { useState, useEffect } from "react";
import AdminHeaderControls from "../components/AdminHeaderControls";
import API from "../../api/api";
import { useToast } from "../../context/ToastContext";
import { X } from "lucide-react";
import defaultUser from "../../img/default-user.png";
import "../css/enrollment.css"

export default function EnrollmentTab({ settings, filterYear, setYearFilter }) {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [programFilter, setProgramFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const studentsPerPage = 20;
  const handleExport = async (type) => {
    if (!settings || !settings.current_academic_year || !settings.current_semester) {
      addToast("Missing academic year or semester settings ❌", "error");
      return;
    }

    try {
      const res = await API.get(`admin/enrollments/export`, {
        params: {
          year: settings.current_academic_year,
          semester: settings.current_semester,
          type,
        },
        responseType: "blob", // important to handle CSV file
      });

      // Show toast
      addToast(`Export successful and is saved in the server ✅ (${type.toUpperCase()})`, "success");

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `${today}_${type.toUpperCase()}_${settings.current_academic_year}_${settings.current_semester || ""}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      addToast("Failed to export students ❌", "error");
    }
  };





  const { addToast } = useToast();

  // ✅ Base server URL (e.g., http://localhost:5000)
  const serverURL = process.env.REACT_APP_API?.replace("/api", "") || "http://localhost:5000";

  // 🔹 Fetch enrolled students
  useEffect(() => {
    const fetchEnrolled = async () => {
      setLoading(true);
      try {
        const res = await API.get("admin/students/enrolled");
        setStudents(res.data || []);
      } catch (err) {
        console.error("Error fetching enrolled students:", err);
        addToast("Failed to load enrolled students ❌", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchEnrolled();
  }, [addToast]);

  // 🔹 Open Modal + Fetch student’s subjects
  const handleViewDetails = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await API.get(`admin/students/${student.student_id}/subjects`);
      setStudentSubjects(res.data.subjects || []);
      setSelectedStudent((prev) => ({
        ...prev,
        academic_year: res.data.academic_year,
        semester: res.data.semester,
      }));
    } catch (err) {
      console.error("Error fetching subject records:", err);
      addToast("Failed to load subject records ❌", "error");
      setStudentSubjects([]);
    }
  };

  // 🔹 Close modal
  const handleClose = () => {
    setSelectedStudent(null);
    setStudentSubjects([]);
  };

  const handleCloseOutside = (e) => {
    if (e.target.classList.contains("modal-overlay")) handleClose();
  };

  // 🔹 Stats
  const totalEnrolled = students.length;
  const regularStudents = students.filter((s) => s.student_status === "Regular").length;
  const irregularStudents = students.filter((s) => s.student_status === "Irregular").length;

  // 🔹 Filters
  const filteredStudents = students.filter((s) => {
    const fullName = `${s.last_name} ${s.first_name} ${s.middle_name || ""}`.toLowerCase();
    const matchesSearch =
      s.student_id.toString().includes(searchQuery.toLowerCase()) ||
      fullName.includes(searchQuery.toLowerCase());
    const matchesProgram = !programFilter || s.program_name === programFilter;
    const matchesYear = !filterYear || s.year_level === Number(filterYear);
    return matchesSearch && matchesProgram && matchesYear;
  });

  // 🔹 Pagination
  const indexOfLast = currentPage * studentsPerPage;
  const indexOfFirst = indexOfLast - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);


  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterYear, programFilter]);

  return (
    <div className="enrollment-tab" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header Controls */}
      <AdminHeaderControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        programFilter={programFilter}
        setProgramFilter={setProgramFilter}
        settings={settings}
        tab="enrollment"
        filterYear={filterYear}
        setYearFilter={setYearFilter}
      />

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "1.5rem" }}>
        {/* Enrollment List */}
        <div>
          <div className="dashboard-section">
            <h3>Enrollment List</h3>
            {loading ? (
              <p>Loading enrolled students...</p>
            ) : (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Year</th>
                    <th>Section</th>
                    <th>Program</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStudents.length > 0 ? (
                    currentStudents.map((s) => (
                      <tr key={s.student_id}>
                        <td>{s.student_id}</td>
                        <td>{s.last_name}, {s.first_name} {s.middle_name || ""}</td>
                        <td>{s.year_level}</td>
                        <td>{s.section || "-"}</td>
                        <td>{s.program_name || "-"}</td>
                        <td>
                          <button className="btn btn-secondary" onClick={() => handleViewDetails(s)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "12px" }}>
                        No enrolled students found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem", gap: "8px" }}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
              </div>
            )}

            {/* Export */}
            <div style={{ textAlign: "right", marginTop: "1rem", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => handleExport("regular")} className="btn btn-primary">
                Export Regular Students
              </button>
              <button onClick={() => handleExport("irregular")} className="btn btn-secondary">
                Export Irregular Students
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard-cards" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="dashboard-card"><h3>Total Enrolled</h3><p>{totalEnrolled}</p></div>
          <div className="dashboard-card"><h3>Regular</h3><p>{regularStudents}</p></div>
          <div className="dashboard-card"><h3>Irregular</h3><p>{irregularStudents}</p></div>
        </div>
      </div>

      {/* 🔹 Student Details Modal */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={handleCloseOutside}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleClose}>
              <X size={20} />
            </button>

            <h2>Enrollment Details</h2>

            <div className="student-info-grid">
              <div className="profile-picture">
                <img
                  src={
                    selectedStudent.profile_picture
                      ? `${serverURL}/${selectedStudent.profile_picture.replace(/^\/+/, "")}`
                      : defaultUser
                  }
                  alt="Profile"
                  className="profile-image"
                />
              </div>

              <div><strong>First Name:</strong> {selectedStudent.first_name}</div>
              <div><strong>Middle Name:</strong> {selectedStudent.middle_name || "-"}</div>
              <div><strong>Last Name:</strong> {selectedStudent.last_name}</div>
              <div><strong>Student ID:</strong> {selectedStudent.student_id}</div>
              <div><strong>Course:</strong> {selectedStudent.program_name}</div>
              <div><strong>Year & Section:</strong> {selectedStudent.year_level} {selectedStudent.section || "-"}</div>
              <div><strong>Status:</strong> {selectedStudent.student_status}</div>

              <div className="subjects-enrolled">
                <h4>Subjects Enrolled</h4>
                <div className="subject-records">
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Subject</th>
                          <th>Units</th>
                          <th>Section</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentSubjects.length > 0 ? (
                          studentSubjects.map((sub) => (
                            <tr key={sub.subject_code}>
                              <td>{sub.subject_code}</td>
                              <td>{sub.subject_desc}</td>
                              <td>{sub.units}</td>
                              <td>{sub.subject_section}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "10px" }}>
                              No enrolled subjects found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
