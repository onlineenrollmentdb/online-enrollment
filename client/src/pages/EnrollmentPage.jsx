// src/pages/EnrollmentPage.js
import React, { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import API from "../api/api";
import EnrollForm from "../components/EnrollForm";
import "../css/EnrollmentPage.css";


const isProfileComplete = (student) => {
  if (!student) return false;
  const requiredFields = [
    "last_name",
    "first_name",
    "middle_name",
    "permanent_address",
    "contact_number",
    "congressional_district",
    "region",
    "email",
    "gender",
    "birth_date",
    "birthplace",
    "citizenship",
    "religion",
    "civil_status",
  ];
  return requiredFields.every(
    (field) => student[field] && student[field].toString().trim() !== ""
  );
};

const EnrollmentPage = () => {
  const { user: student } = useAuth(); // directly student
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [failedSubjects, setFailedSubjects] = useState([]);
  const [passedSubjects, setPassedSubjects] = useState([]);
  const [failCounts, setFailCounts] = useState({});
  const [firstTakenYear, setFirstTakenYear] = useState({});
  const [loading, setLoading] = useState(false);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [openPopup, setOpenPopup] = useState(null);
  const profileToastRef = useRef(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!student) navigate("/");
  }, [student, navigate]);
  // 🔹 Fetch current semester and academic year
  useEffect(() => {
    API.get("/settings")
      .then((res) => {
        setSemester(res.data.current_semester);
        setAcademicYear(res.data.current_academic_year);
      })
      .catch(() => {
        setSemester("Null");
        setAcademicYear("Null");
      });
  }, []);

  // 🔹 Fetch enrolled subjects if enrollment is locked

useEffect(() => {
  if (!student) return;

  if ([2, 3, 4].includes(student.enrollment_status)) {
    API.get(`/enrollments/${student.student_id}/subjects`)
      .then((res) => setEnrolledSubjects(res.data))
      .catch(console.error);
  }

  if (!profileToastRef.current && !isProfileComplete(student)) {
    addToast("Please complete your profile before enrolling ⚠️", "warning");
    profileToastRef.current = true; // ensures it's only called once
  }
}, [student, addToast]);

  // 🔹 Fetch subjects and grades
  useEffect(() => {
    if (!student) return;
    setLoading(true);
    Promise.all([
      API.get("/subjects"),
      API.get(`enrollments/grades/${student.student_id}`),
    ])
      .then(([subjectsRes, gradesRes]) => {
        const subjects = subjectsRes.data;
        const grades = gradesRes.data;

        const passed = grades
          .filter((g) => g.status?.toLowerCase() === "passed")
          .map((g) => g.subject_section);

        const failed = grades
          .filter((g) => g.status?.toLowerCase() === "failed")
          .map((g) => g.subject_section);

        setPassedSubjects(passed);
        setFailedSubjects(failed);

        // 🔹 Count fail attempts + first taken year
        const failCounts = {};
        const firstTakenYear = {};
        grades.forEach((g) => {
          if (g.status?.toLowerCase() === "failed") {
            const code = g.subject_section;
            const year = parseInt(g.academic_year.split("-")[0]);
            failCounts[code] = (failCounts[code] || 0) + 1;
            if (!firstTakenYear[code] || year < firstTakenYear[code]) {
              firstTakenYear[code] = year;
            }
          }
        });
        setFailCounts(failCounts);
        setFirstTakenYear(firstTakenYear);

        setAllSubjects(subjects);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [student]);

  const isIrregular = student?.student_status?.toLowerCase() === "irregular";

  if (!student) return null;

  /** 🔹 Enrollment status messages */
  const statusMessages = {
    2: "Your enrollment has already been submitted.",
    3: "Enrollment in process.",
    4: "You are now enrolled.",
  };

  const isEnrollmentLocked = [2, 3, 4].includes(student?.enrollment_status);

  /** 🔹 Check if subject can be retaken */
  const canRetake = (subjectCode) => {
    const attempts = failCounts[subjectCode] || 0;
    const firstYear = firstTakenYear[subjectCode];
    if (!firstYear) return true;
    const currentStartYear = parseInt(academicYear.split("-")[0]);
    return attempts < 3 && currentStartYear - firstYear <= 6;
  };

  /** 🔹 Year Standing */
  const checkYearStanding = () => {
    if (student.year_level === 2 && semester === "2nd") {
      const firstSemSubjects = allSubjects.filter(
        (s) => s.year_level === 2 && s.semester === "1st"
      );
      return firstSemSubjects.every((s) =>
        passedSubjects.includes(s.subject_section)
      );
    }
    return true;
  };

  /** 🔹 Subject Eligibility */
  const getEligibility = (subject) => {
    if (passedSubjects.includes(subject.subject_section)) {
      return { status: "passed" };
    }
    if (failedSubjects.includes(subject.subject_section)) {
      return canRetake(subject.subject_section)
        ? { status: "retake" }
        : {
            status: "blocked",
            reason: "Max retakes reached (3x within 6 years)",
          };
    }
    if (subject.prerequisites?.length > 0) {
      const unmet = subject.prerequisites.filter((pr) => {
        const code = typeof pr === "string" ? pr : pr.code || pr.subject_code;
        return !passedSubjects.includes(code);
      });

      if (unmet.length > 0) {
        const unmetCodes = unmet.map((pr) =>
          typeof pr === "string"
            ? pr
            : pr.code || pr.subject_code || JSON.stringify(pr)
        );
        return {
          status: "blocked",
          reason: `You need to pass the following subjects: ${unmetCodes.join(", ")}`,
        };
      }
    }
    if (!checkYearStanding()) {
      return {
        status: "blocked",
        reason: "Year Standing: Must complete previous semester subjects first",
      };
    }
    return { status: "eligible" };
  };

  /** 🔹 Checkbox handler */
  const handleCheckboxChange = (subject, checked) => {
    setSelectedSubjects((prev) =>
      checked
        ? [...prev, subject]
        : prev.filter((s) => s.subject_section !== subject.subject_section)
    );
  };

  /** 🔹 Filter subjects by status */
  const filteredSubjects = isEnrollmentLocked
    ? enrolledSubjects
    : allSubjects.filter((subj) => {
        if (isIrregular) {
          // Irregular students: show all subjects of current semester (any year)
          return subj.semester === semester;
        } else {
          // Regular students: only their year level & semester
          return (
            subj.year_level === student.year_level && subj.semester === semester
          );
        }
      });

  return (
    <div className="enrollment-grid">

      {/* 🔹 Enrollment Status Banner */}
      {student?.enrollment_status && statusMessages[student.enrollment_status] && (
        <div className="enrollment-status-banner">
          <p>{statusMessages[student.enrollment_status]}</p>
        </div>
      )}

      <div className="enrollment-subjects">
        <div className="subject-records">
          <h4>Subject Selection</h4>

          {loading ? (
            <div className="table-wrapper">Loading subjects...</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {!isEnrollmentLocked && isIrregular && <th>Select</th>}
                    <th>Code</th>
                    <th>Description</th>
                    <th>Units</th>
                    {isEnrollmentLocked && (
                      <>
                        <th>Year</th>
                        <th>Semester</th>
                      </>
                    )}
                    {isIrregular && <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    filteredSubjects.reduce((groups, subj) => {
                      const key = `Year ${subj.year_level} - ${
                        subj.semester === 1
                          ? "1st"
                          : subj.semester === 2
                          ? "2nd"
                          : subj.semester
                      } Semester`;
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(subj);
                      return groups;
                    }, {})
                  ).map(([group, records], idx) => {
                    const sortedRecords = records.sort((a, b) =>
                      (a.subject_code || "").localeCompare(b.subject_code || "")
                    );

                    return (
                      <React.Fragment key={group}>
                        {idx > 0 && (
                          <tr>
                            <td
                              colSpan={
                                isEnrollmentLocked
                                  ? 5
                                  : isIrregular
                                  ? 5
                                  : 3
                              }
                              className="semester-divider"
                            ></td>
                          </tr>
                        )}

                        <tr>
                          <td
                            colSpan={
                              isEnrollmentLocked
                                ? 5
                                : isIrregular
                                ? 5
                                : 3
                            }
                            className="group-cell"
                          >
                            {group}
                          </td>
                        </tr>
                        {sortedRecords.map((s) => {
                          const eligibility = isIrregular ? getEligibility(s) : null;
                          const isOpen = openPopup === s.subject_section;

                          const togglePopup = () => {
                            setOpenPopup(isOpen ? null : s.subject_section);
                          };

                          return (
                            <tr key={s.subject_section} className="subject-row">
                              {!isEnrollmentLocked && isIrregular && (
                                <td style={{ position: "relative" }}>
                                  {eligibility.status === "blocked" ? (
                                    <>
                                      <Info
                                        size={18}
                                        color="#f39c12"
                                        style={{ cursor: "pointer", width: "100%", margin: "10px 0" }}
                                        onClick={togglePopup}
                                      />

                                      {isOpen && (
                                        <div className="info-popup">
                                          <div className="info-popup-title">Enrollment Blocked</div>
                                          <div className="info-popup-body">{eligibility.reason}</div>
                                          <button
                                            className="close-btn"
                                            onClick={() => setOpenPopup(null)}
                                          >
                                            Close
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      disabled={eligibility.status === "passed"}
                                      checked={selectedSubjects.some(
                                        (sub) => sub.subject_section === s.subject_section
                                      )}
                                      onChange={(e) => handleCheckboxChange(s, e.target.checked)}
                                    />
                                  )}
                                </td>
                              )}

                              <td>{s.subject_code}</td>
                              <td>{s.subject_desc || "—"}</td>
                              <td style={{ textAlign: "center" }}>{s.units}</td>

                              {isEnrollmentLocked && (
                                <>
                                  <td>{s.year_level}</td>
                                  <td>{s.semester}</td>
                                </>
                              )}

                              {isIrregular && (
                                <td
                                  style={{
                                    textAlign: "center",
                                    fontWeight: 600,
                                    color:
                                      eligibility.status === "passed"
                                        ? "green"
                                        : eligibility.status === "retake"
                                        ? "red"
                                        : "#333",
                                  }}
                                >
                                  {eligibility.status.toUpperCase()}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 🔹 Enrollment Form */}
        {isProfileComplete(student) ? (
          <div className="enrollment-form">
            <EnrollForm
              selectedSubjects={
                isIrregular
                  ? selectedSubjects
                  : allSubjects.filter(
                      (s) =>
                        (s.year_level === student.year_level &&
                          s.semester === semester) ||
                        isEnrollmentLocked
                    )
              }
              studentId={student.student_id}
              semester={semester}
              academicYear={academicYear}
              disabled={isEnrollmentLocked}
              addToast={addToast}
            />
          </div>
        ) : (
          <div className="enrollment-form">
            <p style={{ color: "red", fontWeight: "bold" }}>
              Complete your profile to enable enrollment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrollmentPage;
