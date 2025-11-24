import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EnrollmentPage from './pages/EnrollmentPage';
import GradesPage from './pages/GradesPage';
import NotificationPage from './pages/NotificationPage';
import SignupPage from './pages/SignupPage';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboard from './admin/AdminDashboard';
import Layout from './components/Layout';

import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import SocketListener from './components/SocketListener'; // ✅ new component
import ProfilePage from './pages/ProfilePage';

function App() {
  const { user } = useAuth(); // ✅ Get current user

  return (
    <ToastProvider>
      <Router>
        <SocketListener /> {/* Handles socket + toast */}
        <Routes>
          {/* Pages without layout */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Admin dashboard with currentUser */}
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard currentUser={user} />}
          />

          {/* Pages with layout */}
          <Route path="/home" element={<Layout><HomePage /></Layout>} />
          <Route path="/enroll" element={<Layout><EnrollmentPage /></Layout>} />
          <Route path="/grades" element={<Layout><GradesPage /></Layout>} />
          <Route path="/notifications" element={<Layout><NotificationPage /></Layout>} />
          <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
