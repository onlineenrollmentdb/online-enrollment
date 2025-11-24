import React, { useMemo, useState, useEffect } from "react";
import API from "../../api/api";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { differenceInDays, addDays } from "date-fns";

import { useToast } from "../../context/ToastContext";
import socket from "../../socket";

export default function DashboardTab({ students, setStudents, setActiveTab, onViewDetails, settings }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOptionsOpen, setSortOptionsOpen] = useState(false);
  const [sortField, setSortField] = useState("first_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterBy, setFilterBy] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [highlightDates, setHighlightDates] = useState([]);
  const [enrollmentMessage, setEnrollmentMessage] = useState("");

  const { addToast } = useToast();
  const studentsPerPage = 10;

  // 🔹 Filtering logic
  const filteredStudents = students.filter((s) => {
    const fullName = `${s.last_name} ${s.first_name} ${s.middle_name || ""}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      s.student_id.toString().includes(searchQuery);

    let matchesFilter = true;
    if (filterBy === "cleared") matchesFilter = s.enrollment_status === 1;
    else if (filterBy === "notCleared") matchesFilter = s.enrollment_status === 0;
    else if (filterBy === "approved") matchesFilter = s.is_approved === 1;
    else if (filterBy === "notApproved") matchesFilter = s.is_approved === 0;

    let matchesStatus = true;
    if (statusFilter === "regular") matchesStatus = s.student_status === "Regular";
    else if (statusFilter === "irregular") matchesStatus = s.student_status === "Irregular";

    return matchesSearch && matchesFilter && matchesStatus;
  });

  // 🔹 Sorting logic
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortField, sortDirection]);

  // 🔹 Pagination
  const totalPages = Math.ceil(sortedStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const paginatedStudents = sortedStudents.slice(startIndex, startIndex + studentsPerPage);

  // 🔹 Stats
  const totalStudents = students.length;
  const clearedStudents = students.filter((s) => s.enrollment_status === 1).length;
  const approvedStudents = students.filter((s) => s.is_approved).length;
  const enrolledStudents = filteredStudents.filter((s) => s.is_enrolled).length;
  const regularStudents = filteredStudents.filter((s) => s.student_status === "Regular").length;
  const irregularStudents = filteredStudents.filter((s) => s.student_status === "Irregular").length;

  const yearData = useMemo(() => {
    const levels = [1, 2, 3, 4];
    return levels.map((lvl) => ({
      year: `${lvl} Year`,
      count: students.filter((s) => s.year_level === lvl).length,
    }));
  }, [students]);

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.substring(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // 🔹 Enrollment calendar logic
  useEffect(() => {
    if (!settings) return;
    const now = new Date();

    const firstEnrollStart = parseDate(settings.first_sem_enrollment_start);
    const firstEnrollEnd = parseDate(settings.first_sem_enrollment_end);
    const firstSemEnd = parseDate(settings.first_sem_end);

    const secondEnrollStart = parseDate(settings.second_sem_enrollment_start);
    const secondEnrollEnd = parseDate(settings.second_sem_enrollment_end);
    const secondSemEnd = parseDate(settings.second_sem_end);

    const summerStart = parseDate(settings.summer_start);
    const summerEnd = parseDate(settings.summer_end);

    let start, end, message = "";

    if (now >= firstEnrollStart && now <= firstEnrollEnd) {
      message = "Enrollment ongoing for 1st Semester";
      start = firstEnrollStart;
      end = firstEnrollEnd;
    } else if (now > firstEnrollEnd && now < firstSemEnd) {
      message = "1st Semester ongoing — enrollment ended";
      start = secondEnrollStart;
      end = secondEnrollEnd;
    } else if (now >= secondEnrollStart && now <= secondEnrollEnd) {
      message = "Enrollment ongoing for 2nd Semester";
      start = secondEnrollStart;
      end = secondEnrollEnd;
    } else if (now > secondEnrollEnd && now < secondSemEnd) {
      message = "2nd Semester ongoing — enrollment ended";
      start = summerStart;
      end = summerEnd;
    } else if (now >= summerStart && now <= summerEnd) {
      message = "Enrollment ongoing for Summer Term ☀️";
      start = summerStart;
      end = summerEnd;
    } else if (now > summerEnd) {
      message = "Enrollment ended — new academic year starts soon";
      start = firstEnrollStart;
      end = firstEnrollEnd;
    } else {
      message = "Enrollment not yet started";
      start = firstEnrollStart;
      end = firstEnrollEnd;
    }

    // Highlight all enrollment days (all periods)
    const allPeriods = [
      { start: firstEnrollStart, end: firstEnrollEnd },
      { start: secondEnrollStart, end: secondEnrollEnd },
      { start: summerStart, end: summerEnd },
    ];

    const dates = allPeriods.flatMap(({ start, end }) => {
      const days = differenceInDays(end, start);
      return Array.from({ length: days + 1 }, (_, i) => addDays(start, i));
    });

    setHighlightDates(dates);
    setCalendarMonth(now); // show current month by default
    setEnrollmentMessage(message);
  }, [settings]);

  // 🔹 Academic year boundaries for navigation
  const academicStart = useMemo(() => parseDate(settings?.first_sem_start), [settings]);
  const academicEnd = useMemo(() => parseDate(settings?.summer_end), [settings]);


  // 🔹 Socket updates
  useEffect(() => {
    socket.on("studentUpdated", (updated) => {
      setStudents((prev) =>
        prev.map((s) => (s.student_id === updated.student_id ? { ...s, ...updated } : s))
      );
    });
    return () => socket.off("studentUpdated");
  }, [setStudents]);

  useEffect(() => setCurrentPage(1), [sortField, sortDirection, filterBy, statusFilter, searchQuery]);

  const handleViewDetails = (student) => {
    onViewDetails(student);
    setActiveTab("records");
  };

  const handleSortClick = (field) => {
    if (sortField === field) setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleClearance = async (student_id) => {
    try {
      await API.put("clearance/update", { student_id, is_cleared: true, academic_year: settings.current_academic_year, semester: settings.current_semester });
      setStudents((prev) =>
        prev.map((s) => (s.student_id === student_id ? { ...s, enrollment_status: 1 } : s))
      );
      socket.emit("studentUpdated", { student_id, enrollment_status: 1 });
      addToast("Student clearance updated", "success");
    } catch {
      addToast("Failed to update clearance", "error");
    }
  };

  const handleRevokeClearance = async (student_id) => {
    try {
      await API.put("clearance/update", { student_id, is_cleared: false, academic_year: settings.current_academic_year, semester: settings.current_semester });
      setStudents((prev) =>
        prev.map((s) => (s.student_id === student_id ? { ...s, enrollment_status: 0 } : s))
      );
      socket.emit("studentUpdated", { student_id, enrollment_status: 0 });
      addToast("Clearance revoked", "warning");
    } catch {
      addToast("Failed to revoke clearance", "error");
    }
  };

  return (
    <div className="dashboard mt-4">
      {/* Summary */}
      <div className="dashboard-cards">
        <div className="dashboard-card"><h3>Total Students</h3><p>{totalStudents}</p></div>
        <div className="dashboard-card"><h3>Regular</h3><p>{regularStudents}</p></div>
        <div className="dashboard-card"><h3>Irregular</h3><p>{irregularStudents}</p></div>
        <div className="dashboard-card"><h3>Cleared</h3><p>{clearedStudents}</p></div>
        <div className="dashboard-card"><h3>Approved</h3><p>{approvedStudents}</p></div>
        <div className="dashboard-card"><h3>Enrolled</h3><p>{enrolledStudents}</p></div>
      </div>

      {/* Analytics */}
      <div className="dashboard-analytics">
        <div className="dashboard-section">
          <h3>Students by Year</h3>
          <BarChart width={500} height={300} data={yearData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="var(--primary-color)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </div>

        <div className="dashboard-section">
          <h3>Enrollment Calendar</h3>
          <Calendar
            className="dashboard-calendar"
            value={calendarMonth}
            onChange={() => {}} // disables date selection
            activeStartDate={calendarMonth}
            showNavigation={true}
            next2Label={null}
            prev2Label={null}
            navigationLabel={({ date, label }) => (
              <span style={{ pointerEvents: "none" }}>{label}</span>
            )}
            onActiveStartDateChange={({ activeStartDate }) => {
              if (activeStartDate < academicStart) setCalendarMonth(academicStart);
              else if (activeStartDate > academicEnd) setCalendarMonth(academicEnd);
              else setCalendarMonth(activeStartDate);
            }}
            tileClassName={({ date, view }) =>
              view === "month" &&
              highlightDates.some((d) => d.toDateString() === date.toDateString())
                ? "highlighted-date"
                : null
            }
          />
          {enrollmentMessage && (
            <p style={{ textAlign: "center", fontWeight: 600, color: enrollmentMessage.includes("ended") ? "#dc2626" : "#2563eb", marginTop: 10 }}>
              {enrollmentMessage}
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-section">
        <div className="table-header">
          <h3>Students List</h3>
          <div className="search-bar">
            <i className="bi bi-search"></i>
            <input
              id="studentSearch"
              name="studentSearch"
              placeholder="Search by ID or Name"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

      <table className="students-table">
        <thead>
          <tr>
            <th
              onClick={() => handleSortClick("student_id")}
              style={{ cursor: "pointer" }}
            >
              Student ID{" "}
              {sortField === "student_id" && (
                <i
                  className={`bi ${
                    sortDirection === "asc"
                      ? "bi-caret-up-fill"
                      : "bi-caret-down-fill"
                  }`}
                ></i>
              )}
            </th>

            <th
              onClick={() => handleSortClick("last_name")}
              style={{ cursor: "pointer" }}
            >
              Last Name{" "}
              {sortField === "last_name" && (
                <i
                  className={`bi ${
                    sortDirection === "asc"
                      ? "bi-caret-up-fill"
                      : "bi-caret-down-fill"
                  }`}
                ></i>
              )}
            </th>

            <th
              onClick={() => handleSortClick("first_name")}
              style={{ cursor: "pointer" }}
            >
              First Name{" "}
              {sortField === "first_name" && (
                <i
                  className={`bi ${
                    sortDirection === "asc"
                      ? "bi-caret-up-fill"
                      : "bi-caret-down-fill"
                  }`}
                ></i>
              )}
            </th>

            <th
              onClick={() => handleSortClick("year_level")}
              style={{ cursor: "pointer" }}
            >
              Year{" "}
              {sortField === "year_level" && (
                <i
                  className={`bi ${
                    sortDirection === "asc"
                      ? "bi-caret-up-fill"
                      : "bi-caret-down-fill"
                  }`}
                ></i>
              )}
            </th>
            <th>Status</th>
            <th
              className="sort-container"
              onClick={(e) => {
                e.stopPropagation();
                setSortOptionsOpen((prev) => !prev);
              }}
            >
              Sort <i className="bi bi-caret-down-fill"></i>
              {sortOptionsOpen && (
                <div className="sort-dropdown" onClick={(e) => e.stopPropagation()}>
                  <strong>Sort by:</strong>
                  <select
                    id="sortField"
                    name="sortField"
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                  >
                    <option value="first_name">First Name</option>
                    <option value="last_name">Last Name</option>
                    <option value="student_id">Student ID</option>
                    <option value="year_level">Year Level</option>
                  </select>

                  <strong>Filter by:</strong>
                  <select
                    id="filterBy"
                    name="filterBy"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="cleared">Cleared</option>
                    <option value="notCleared">Not Cleared</option>
                    <option value="approved">Approved</option>
                    <option value="notApproved">Not Approved</option>
                  </select>

                  <strong>Student Status:</strong>
                  <select
                    id="statusFilter"
                    name="statusFilter"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1); // reset pagination
                    }}
                    style={{ width: "100%", marginBottom: 8 }}
                  >
                    <option value="all">All</option>
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                  </select>

                  <strong>Sort Direction:</strong>
                  <select
                    id="sortDirection"
                    name="sortDirection"
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value)}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {paginatedStudents.map((s) => (
            <tr key={s.student_id}>
              <td>{s.student_id}</td>
              <td>{s.last_name}</td>
              <td>{s.first_name}</td>
              <td>{s.year_level}</td>
              <td>{s.student_status}</td>
              <td className="actions-cell">
                <i className="bi bi-three-dots-vertical menu-icon"></i>
                <div className="actions-menu">
                  <button onClick={() => handleViewDetails(s)} data-tooltip="View">
                    <i className="bi bi-eye"></i>
                  </button>

                  {(s.enrollment_status === 0 || s.enrollment_status === null) && s.is_approved === 1 && (
                    <button onClick={() => handleClearance(s.student_id)} data-tooltip="Clear">
                      <i className="bi bi-shield-check"></i>
                    </button>
                  )}

                  {s.enrollment_status === 1 && s.is_approved && (
                    <button
                      onClick={() => handleRevokeClearance(s.student_id)}
                      data-tooltip="Revoke Clearance"
                    >
                      <i className="bi bi-shield-x"></i>
                    </button>
                  )}

                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔹 Pagination */}
      <div className="pagination">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        <span>
          {currentPage}/{totalPages || 1}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          &gt;
        </button>
      </div>
    </div>
  </div>
);

}
