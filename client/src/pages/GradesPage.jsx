import React, { useEffect, useState } from "react";
import API from "../api/api";
import "../css/GradesPage.css";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function GradesPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    // 🔑 Example: pull logged-in student from localStorage
    const user = JSON.parse(localStorage.getItem("student"));
    if (user) {
      console.log("👤 Logged-in student:", user);
      setStudent(user);
    } else {
      console.warn("⚠️ No logged-in student found in localStorage");
    }
  }, []);

  useEffect(() => {
    if (!student) return;

    const fetchGrades = async () => {
      setLoading(true);
      try {
        console.log("📡 Fetching grades for student:", student.student_id);
        const res = await API.get(
          `/students/${student.student_id}/academic-history`
        );
        console.log("✅ Raw API response:", res.data);
        setSubjects(res.data || []);
      } catch (err) {
        console.error("❌ Error fetching grades:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [student]);

  // 📊 Stats
  const gradedSubjects = subjects.filter(
    (s) => s.grade !== null && s.grade !== ""
  );
  const avgGrade =
    gradedSubjects.length > 0
      ? (
          gradedSubjects.reduce((sum, s) => sum + parseFloat(s.grade || 0), 0) /
          gradedSubjects.length
        ).toFixed(2)
      : null;

  const total = subjects.length;
  const passed = subjects.filter((s) => s.status === "Passed").length;
  const failed = subjects.filter((s) => s.status === "Failed").length;

  // 📈 Average per year + semester
  const semesterMap = {};
  gradedSubjects.forEach((s) => {
    const key = `${s.year_level || "Unknown"}-${s.subject_semester || "?"}`;
    if (!semesterMap[key]) {
      semesterMap[key] = {
        year_level: s.year_level || "Unknown",
        semester: s.subject_semester || "?",
        grades: [],
      };
    }
    semesterMap[key].grades.push(parseFloat(s.grade));
  });

  const chartData = Object.values(semesterMap)
    .map((entry) => {
      const avg =
        entry.grades.reduce((sum, g) => sum + g, 0) / entry.grades.length;
      return {
        name: `${entry.year_level} Year ${entry.semester} Sem`,
        grade: avg,
        year_level: entry.year_level,
        semester: entry.semester,
      };
    })
    .sort((a, b) => {
      // Defensive sort
      const yearA = parseInt(a.year_level) || 0;
      const yearB = parseInt(b.year_level) || 0;
      if (yearA !== yearB) return yearA - yearB;

      const semA = (a.semester || "").toString();
      const semB = (b.semester || "").toString();
      return semA.localeCompare(semB);
    });

  // 📚 Group subjects by Year + Semester for table
  const groupedSubjects = Object.entries(
    [...subjects].reduce((groups, subj) => {
      const sem =
        subj.subject_semester === 1
          ? "1st"
          : subj.subject_semester === 2
          ? "2nd"
          : subj.subject_semester || "?";
      const key = `Year ${subj.year_level || "?"} - ${sem} Semester`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(subj);
      return groups;
    }, {})
  );

  console.log("📚 Grouped subjects for table:", groupedSubjects);

  return (
    <div className="grades-dashboard">
      <h2 className="page-title">Grades Overview</h2>

      {!student ? (
        <p>⚠️ No logged-in student detected</p>
      ) : (
        <div className="grades-grid">
          {/* Top stats */}
          <div className="grades-card avg">
            Average Grade <p>{avgGrade ?? "—"}</p>
          </div>
          <div className="grades-card total">
            Total Subjects <p>{total || "—"}</p>
          </div>
          <div className="grades-card passed">
            Passed <p>{passed || "—"}</p>
          </div>
          <div className="grades-card failed">
            Failed <p>{failed || "—"}</p>
          </div>

          {/* Graph bottom-left */}
          <div className="grades-card graph">
            <h3>Grade Trend (Per Semester)</h3>
            {chartData.length === 0 ? (
              <p>No Grades detected</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[1, 5]} reversed />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="grade"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subjects list bottom-right */}
          <div className="grades-card subjects subject-records">
            <h3>Subjects List</h3>
            {loading ? (
              <p>Loading...</p>
            ) : total === 0 ? (
              <p>No Grades detected</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Description</th>
                      <th>Units</th>
                      <th>Year</th>
                      <th>Semester</th>
                      <th>Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedSubjects.map(([group, records], idx) => {
                      const sortedRecords = records.sort((a, b) => {
                        const codeA = a.subject_section || "";
                        const codeB = b.subject_section || "";
                        return codeA.localeCompare(codeB);
                      });

                      return (
                        <React.Fragment key={group}>
                          {/* Divider between groups */}
                          {idx > 0 && (
                            <tr>
                              <td colSpan={7} className="semester-divider"></td>
                            </tr>
                          )}

                          {/* Group header row */}
                          <tr>
                            <td colSpan={7} className="group-cell">
                              {group}
                            </td>
                          </tr>

                          {/* Records */}
                          {sortedRecords.map((s, i) => (
                            <tr key={`${group}-${i}`}>
                              <td>{s.subject_section}</td>
                              <td>{s.subject_desc || "—"}</td>
                              <td>{s.units || "—"}</td>
                              <td>{s.year_level || "—"}</td>
                              <td>{s.subject_semester || "—"}</td>
                              <td>{s.grade ?? "—"}</td>
                              <td>{s.status ?? "—"}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
