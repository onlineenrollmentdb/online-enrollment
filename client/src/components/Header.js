import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import API from "../api/api";
import logo from "../img/ctu_logo.png";
import defaultUser from "../img/default-user.png";
import "../css/Header.css";

const Header = ({ onHome, onEnroll, onGrades, onProfile, onNotifications, onLogout }) => {
  const { user: student } = useAuth(); // directly from context
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");

  // Determine active tab based on route
  useEffect(() => {
    if (!student) return;
    if (location.pathname.startsWith("/enroll")) setActiveTab("enroll");
    else if (location.pathname.startsWith("/grades")) setActiveTab("grades");
    else if (location.pathname.startsWith("/profile")) setActiveTab("profile");
    else setActiveTab("home");
  }, [location.pathname, student]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        profileRef.current && !profileRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!student) return null;

  const serverURL = process.env.REACT_APP_API.replace("/api", "");
  const profilePicture = student.profile_picture
    ? `${serverURL}${student.profile_picture}` // cache-busting
    : defaultUser;

  const getFullName = (s) =>
    s ? `${s.first_name || ""} ${s.middle_name || ""} ${s.last_name || ""}`.replace(/\s+/g, " ").trim() : "";

  const fetchNotifications = async () => {
    try {
      const res = await API.get(`/notifications/student/${student.student_id}`);
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const toggleDropdown = async () => {
    const nextState = !showDropdown;
    setShowDropdown(nextState);

    if (nextState) {
      await fetchNotifications();
      const unseen = notifications.filter((n) => !n.is_seen);
      unseen.forEach(async (notif) => {
        try { await API.put(`/notifications/${notif.notification_id}/seen`); }
        catch (err) { console.error(err); }
      });
    }
  };

  const markAsRead = async (notifId, link) => {
    try {
      await API.put(`/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => n.notification_id === notifId ? { ...n, is_read: 1 } : n)
      );
      if (link) window.location.href = link;
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const enrollmentDisabled = student.enrollment_status < 1;

  return (
    <header className="header d-flex align-items-center justify-content-between px-3">
      <div className="header-left d-flex align-items-center">
        <img src={logo} alt="Logo" className="header-logo" />
      </div>

      <div className="header-right">
        <button className={`nav-btn ${activeTab === "home" ? "active" : ""}`} onClick={onHome}>
          <i className="bi bi-house"></i>
          <span className="hide-on-mobile">Home</span>
        </button>

        <button
          className={`nav-btn ${activeTab === "enroll" ? "active" : ""} ${enrollmentDisabled ? "disabled" : ""}`}
          disabled={enrollmentDisabled}
          onClick={!enrollmentDisabled ? onEnroll : undefined}
        >
          <i className="bi bi-pencil-square"></i>
          <span className="hide-on-mobile">Enrollment</span>
        </button>

        <button className={`nav-btn ${activeTab === "grades" ? "active" : ""}`} onClick={onGrades}>
          <i className="bi bi-bar-chart"></i>
          <span className="hide-on-mobile">Grades</span>
        </button>

        <div className="notification-bell" ref={dropdownRef} onClick={toggleDropdown}>
          <i className="bi bi-bell fs-5"></i>
          {notifications.some((n) => !n.is_seen) && <span className="notification-dot"></span>}
          {showDropdown && (
            <div className="notification-dropdown">
              <div className="notif-header">
                <h6>Notifications</h6>
                <button className="view-all" onClick={onNotifications}>View All</button>
              </div>
              {notifications.length === 0 ? (
                <p className="empty">No notifications</p>
              ) : (
                <ul>
                  {notifications.map((notif) => (
                    <li
                      key={notif.notification_id}
                      className={`notif-item ${notif.is_read ? "read" : "unread"}`}
                      onClick={() => markAsRead(notif.notification_id, notif.link)}
                    >
                      <div className="notif-content">
                        {notif.title && <strong>{notif.title}</strong>}
                        <p>{notif.message}</p>
                        <small>{new Date(notif.created_at).toLocaleString()}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="profile align-items-center" ref={profileRef} onClick={() => setShowProfileDropdown((prev) => !prev)}>
          <img src={profilePicture} alt="Profile" className="avatar-img" />
          <p className="mb-2 fw-semibold small hide-on-mobile">{getFullName(student)}</p>

          {showProfileDropdown && (
            <div className="profile-dropdown">
              <button className="profile-btn" onClick={onProfile}>View Profile</button>
              <p className="mobile-profile-name">{getFullName(student)}</p>
              <p><strong>ID:</strong> {student.student_id}</p>
              <p><strong>Year:</strong> {student.year_level}</p>
              <p><strong>Section:</strong> {student.section}</p>
              <p><strong>Course:</strong> {student.program_code}</p>
              <p><strong>Status:</strong>{" "}
                <span className={`status ${student.student_status === "Regular" ? "regular" : "irregular"}`}>
                  {student.student_status}
                </span>
              </p>
              <button className="logout-btn" onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
