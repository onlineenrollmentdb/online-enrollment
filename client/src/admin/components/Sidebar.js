import React from "react";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({
  activeTab,
  setActiveTab,
  logout,
  navigate,
  setSelectedStudent,
}) {
  // ✅ Correctly get role from AuthContext
  const { user, role } = useAuth();
  const isAdmin = role === "admin";

  // Define the tabs
  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "records", label: "Records" },
    { key: "subjects", label: "Subjects" },

    // Only visible for admin
    ...(isAdmin ? [
      { key: "enrollment", label: "Enrollment" },
      { key: "faculty", label: "Faculty" },
      { key: "settings", label: "Settings" },
    ] : []),

  ];

  return (
    <div className="d-flex flex-column vh-100 p-3">
      <h2 className="mb-4 fs-5 fw-semibold">
        Welcome {isAdmin ? "Admin" : user?.username || "Faculty Member"}
      </h2>

      <nav className="flex-grow-1 d-flex flex-column gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`nav-link ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedStudent?.(null); // optional chaining in case it's not passed
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-top pt-3">
        <button
          className="btn w-100 text-danger fw-semibold"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
