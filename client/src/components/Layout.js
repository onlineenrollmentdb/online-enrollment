import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "./Header";

const Layout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="layout-container">
      {/* Right side: Header + Page Content */}
      <div className="layout-right">
        <Header
          onLogout={handleLogout}
          onEnroll={() => navigate("/enroll")}
          onHome={() => navigate("/home")}
          onGrades={() => navigate("/grades")}
          onSchedule={() => navigate("/schedule")}
          onNotifications={() => navigate("/notifications")}
          onProfile={() => navigate("/profile")}/>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
