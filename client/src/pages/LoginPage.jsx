import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { useAuth } from "../context/AuthContext";
import ctuLogo from "../img/ctu_logo.png";
import userIcon from "../img/user.png";
import keyIcon from "../img/key.png";
import "../css/LoginPage.css";

const LoginPage = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, user, role } = useAuth();
  const navigate = useNavigate();

  // Redirect after login
  useEffect(() => {
    if (user && role) {
      if (role === "admin" || role === "faculty") navigate("/admin/dashboard");
      else if (role === "student") navigate("/home");
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Admin login
      try {
        const res = await API.post("/admin/login", { username: userId, password });
        login(res.data.user, "admin", res.data.token);
        return;
      } catch {}

      // Faculty login
      try {
        const res = await API.post("/faculty/login", { username: userId, password });
        login(res.data.user, "faculty", res.data.token);
        return;
      } catch {}

      // Student login
      try {
        const res = await API.post("/auth/login", { student_id: userId, password });
        login(res.data.student, "student", res.data.token);
        return;
      } catch (err) {
        setError(err.response?.data?.error || "Login failed. Check credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!userId) return alert("Enter your ID first.");
    try {
      setLoading(true);
      await API.post("/students/forgot-password", { student_id: userId });
      alert("Password reset link sent.");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="t-body">
      <form className="t-container shadow-lg" onSubmit={handleLogin}>
        <img src={ctuLogo} alt="CTU Logo" className="ctu-logo" />
        <h1 className="login-title">CTU-DB</h1>
        <h3>Online Enrollment System</h3>

        {error && <p className="error-text">{error}</p>}

        {/* 🔹 ID Input with icon */}
        <div className="input-with-icon">
          <img src={userIcon} alt="User Icon" className="input-icon" />
          <input
            type="text"
            placeholder="ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
        </div>

        {/* 🔹 Password Input with icon */}
        <div className="input-with-icon password-container">
          <img src={keyIcon} alt="Key Icon" className="input-icon" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <i onClick={() => setShowPassword((prev) => !prev)} role="button">
            {showPassword ? "Hide" : "Show"}
          </i>
        </div>

        <div className="forgot-section">
          <span>Forgot your password?</span>
          <button
            type="button"
            className="change-password-link"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            Reset it here
          </button>
        </div>

        <p className="signup-text">
          Don't have an account? <a href="/signup">Sign Up</a>
        </p>

        <button className="btn t-btn" type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
