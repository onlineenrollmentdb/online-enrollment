import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import API from "../api/api";
import Sidebar from "./components/Sidebar";
import DashboardTab from "./tabs/DashboardTab";
import RecordsTab from "./tabs/RecordsTab";
import SubjectsTab from "./tabs/SubjectsTab";
import FacultyTab from "./tabs/FacultyTab";
import EnrollmentTab from "./tabs/EnrollmentTab";
import SettingsTab from "./tabs/SettingsTab";
import './css/admin.css';
import './css/student.css';
import './css/faculty.css';
import './css/settings.css';

export default function AdminDashboard() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { user, role: userRole, logout, loading: authLoading } = useAuth();

  const [settings, setSettings] = useState({ current_academic_year: "", current_semester: "" });
  const [programs, setPrograms] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setProgramFilter] = useState("");
  const [filterYear, setYearFilter] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Redirect unauthorized users
  useEffect(() => {
    if (!authLoading && (!user || (userRole !== "admin" && userRole !== "faculty"))) {
      navigate("/");
    }
  }, [authLoading, user, userRole, navigate]);

  // 🔹 Memoized fetch functions
  const fetchSettings = useCallback(async () => {
    try {
      const res = await API.get("settings/");
      setSettings(res.data);
    } catch {
      addToast("Failed to fetch settings ❌", "error");
    }
  }, [addToast]);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await API.get("programs/");
      setPrograms(res.data);
    } catch {
      addToast("Failed to fetch programs ❌", "error");
    }
  }, [addToast]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await API.get("programs/departments/");
      setDepartments(res.data);
    } catch {
      addToast("Failed to fetch departments ❌", "error");
    }
  }, [addToast]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await API.get("subjects/");
      setSubjects(res.data);
    } catch {
      addToast("Failed to fetch subjects ❌", "error");
    }
  }, [addToast]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await API.get("admin/students");
      setStudents(res.data);
    } catch {
      addToast("Failed to fetch students ❌", "error");
    }
  }, [addToast]);

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await API.get("faculty/");
      setFaculty(res.data);
    } catch {
      addToast("Failed to fetch faculty ❌", "error");
    }
  }, [addToast]);

  // Fetch all initial data
  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchSettings(),
          fetchPrograms(),
          fetchDepartments(),
          fetchSubjects(),
          fetchStudents(),
          fetchFaculty(),
        ]);
      } catch {
        addToast("Failed to fetch initial data ❌", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user, fetchSettings, fetchPrograms, fetchDepartments, fetchSubjects, fetchStudents, fetchFaculty, addToast]);


  const handleSelectStudentFromDashboard = async (student) => {
    setSearchQuery(student.full_name || "");
    setSelectedStudent(student);
    try {
      const res = await API.get(`grades/student/${student.student_id}`);
      setSubjects(res.data.records);
    } catch (err) {
      addToast("Error fetching student records ❌", "error");
    }
    setActiveTab("records");
  };

  const getSafeFullName = (s) =>
    `${s.first_name || ""} ${s.middle_name || ""} ${s.last_name || ""}`.trim();

  const filteredStudents = students.filter((student) => {
    const matchesProgram = !filterProgram || student.program_id === parseInt(filterProgram);
    const matchesYear = !filterYear || student.year_level === parseInt(filterYear);
    const fullName = getSafeFullName(student).toLowerCase();
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      (student.student_id?.toString().toLowerCase() || "").includes(search) ||
      fullName.includes(search);
    return matchesProgram && matchesYear && matchesSearch;
  });

  if (authLoading || loading || !user) return <div>Loading...</div>;

  return (
    <div className="admin-dashboard">
      <div className={`admin-sidebar ${isSidebarOpen ? "show" : ""}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setSelectedStudent={setSelectedStudent}
          logout={logout}
          navigate={navigate}
          currentUser={user}
          userRole={userRole}
        />
      </div>

      <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? "✖" : "☰"}
      </button>

      <div className="middle-panel">
        {activeTab === "dashboard" && (
          <DashboardTab
            students={students}
            settings={settings}
            setStudents={setStudents}
            setActiveTab={setActiveTab}
            onViewDetails={handleSelectStudentFromDashboard}
          />
        )}

        {activeTab === "records" && userRole !== "student" && (
          <RecordsTab
            students={students}
            programs={programs}
            settings={settings}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            programFilter={filterProgram}
            setProgramFilter={setProgramFilter}
            filteredStudents={filteredStudents}
            userRole={userRole}
          />
        )}

        {activeTab === "enrollment" && userRole === "admin" && (
          <EnrollmentTab
            students={students}
            settings={settings}
            filterYear={filterYear}
            setYearFilter={setYearFilter}
          />
        )}

        {activeTab === "subjects" && (
          <SubjectsTab
            settings={settings}
            filterYear={filterYear}
            subjects={subjects}
            setSubjects={setSubjects}
            fetchSubjects={fetchSubjects}
            fetchPrograms={fetchPrograms}
            programs={programs}
            setPrograms={setPrograms}
            setYearFilter={setYearFilter}
            loading={loading}
            userRole={userRole}
          />
        )}

        {activeTab === "faculty" && userRole === "admin" && (
          <FacultyTab
            settings={settings}
            faculty={faculty}
            setFaculty={setFaculty}
            fetchFaculty={fetchFaculty}
            departments={departments}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {activeTab === "settings" && userRole === "admin" && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            fetchSettings={fetchSettings}
            loading={loading}
            setLoading={setLoading}
          />
        )}
      </div>
    </div>
  );
}
