import React, { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import API from "../../api/api";
import AdminHeaderControls from "../components/AdminHeaderControls";

dayjs.extend(relativeTime);

export default function FacultyTab({ settings, faculty, setFaculty, fetchFaculty, departments }) {
  const { addToast } = useToast();
  const { role: userRole } = useAuth();

  const [loading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    department_id: "",
    role: "grader",
    password: "",
  });

  // 🔹 Search & Department Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  // Filtered faculty list
  const filteredFaculty = faculty.filter((f) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${f.first_name} ${f.last_name}`.toLowerCase();
    const matchesSearch =
      f.faculty_id.toString().includes(query) || fullName.includes(query);
    const matchesDepartment =
      !departmentFilter || f.department_id === parseInt(departmentFilter);
    return matchesSearch && matchesDepartment;
  });

  const openModal = (faculty = null) => {
    setEditingFaculty(faculty);
    setForm(
      faculty
        ? {
            first_name: faculty.first_name,
            last_name: faculty.last_name,
            email: faculty.email,
            department_id: faculty.department_id || "",
            role: faculty.role,
            password: "",
          }
        : {
            first_name: "",
            last_name: "",
            email: "",
            department_id: "",
            role: "grader",
            password: "",
          }
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingFaculty(null);
  };

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      if (editingFaculty) {
        await API.put(`/faculty/${editingFaculty.faculty_id}`, form);
        addToast("Faculty updated successfully ✅", "success");
      } else {
        await API.post(`/faculty`, form);
        addToast("Faculty added successfully ✅", "success");
      }
      closeModal();
      fetchFaculty();
    } catch (err) {
      console.error("Error saving faculty:", err);
      addToast("Failed to save faculty ❌", "error");
    }
  };

  const handleDelete = async (faculty_id) => {
    if (!window.confirm("Delete this faculty?")) return;
    try {
      await API.delete(`/faculty/${faculty_id}`);
      addToast("Faculty deleted successfully 🗑️", "success");
      fetchFaculty();
    } catch {
      addToast("Failed to delete faculty ❌", "error");
    }
  };

  const getStatus = (f) => {
    if (f.is_active) return { text: "Online", className: "status-online" };
    if (!f.last_login) return { text: "Offline", className: "status-offline" };
    return {
      text: `Offline ${dayjs(f.last_login).fromNow()}`,
      className: "status-offline",
    };
  };

  if (userRole !== "admin") return <p className="access-denied">Access denied</p>;

  return (
    <div className="faculty-wrapper">
      {/* 🔹 Header Search + Department Filter */}
      <AdminHeaderControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        settings={settings}
        tab="faculty"
        departments={departments}
      />

      <div className="faculty-header">
        <h2>Faculty Management</h2>
        <button onClick={() => openModal()} className="btn-primary">
          + Add Faculty
        </button>
      </div>

      <div className="faculty-table-container">
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          <table className="faculty-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.map((f) => {
                const status = getStatus(f);
                const d = departments.find((dep) => dep.department_id === f.department_id) || {};
                return (
                  <tr key={f.faculty_id}>
                    <td>{f.faculty_id}</td>
                    <td>{`${f.first_name} ${f.last_name}`}</td>
                    <td>{f.email}</td>
                    <td>{d.department_code || "-"}</td>
                    <td className="capitalize">{f.role}</td>
                    <td>
                      <span className={`status-badge ${status.className}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="action-buttons">
                      <button className="btn-edit" onClick={() => openModal(f)}>
                        Edit
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(f.faculty_id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================= MODAL ========================= */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>{editingFaculty ? "Edit Faculty" : "Add Faculty"}</h3>
            <div className="modal-grid">
              <input
                placeholder="First Name"
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
              />
              <input
                placeholder="Last Name"
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
              />
              <input
                placeholder="Email"
                className="full"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              <select
                className="full"
                value={form.department_id}
                onChange={(e) => handleChange("department_id", e.target.value)}
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
              <select
                className="full"
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
              >
                <option value="dean">Dean</option>
                <option value="advisor">Advisor</option>
                <option value="grader">Grader</option>
              </select>
              <input
                type="password"
                placeholder={editingFaculty ? "New Password (optional)" : "Password"}
                className="full"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingFaculty ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
