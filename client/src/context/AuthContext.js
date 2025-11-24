import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext();

/**
 * AuthProvider manages authentication state and persistence.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // main user object
  const [role, setRole] = useState(null);   // "student", "faculty", "admin"
  const [token, setToken] = useState(null); // JWT token
  const [loading, setLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedRole = localStorage.getItem("userRole");
      const storedToken = localStorage.getItem("token");
      const storedStudent = localStorage.getItem("student");

      if (storedUser && storedRole) {
        setUser(JSON.parse(storedUser));
        setRole(storedRole);
        setToken(storedToken || null);
      } else if (storedStudent) {
        setUser(JSON.parse(storedStudent));
        setRole("student");
      }
    } catch (err) {
      console.error("Failed to load user from localStorage:", err);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  /** Login function */
  const login = useCallback((userData, userRole = "student", jwtToken = null) => {
    setUser(userData);
    setRole(userRole);
    setToken(jwtToken);

    try {
      if (userRole === "student") {
        localStorage.setItem("student", JSON.stringify(userData));
        localStorage.removeItem("user");
        localStorage.removeItem("userRole");
        localStorage.removeItem("token");
      } else {
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("userRole", userRole);
        if (jwtToken) localStorage.setItem("token", jwtToken);
        localStorage.removeItem("student");
      }
    } catch (err) {
      console.error("Failed to save user to localStorage:", err);
    }
  }, []);

  /** Logout function */
  const logout = useCallback(() => {
    setUser(null);
    setRole(null);
    setToken(null);
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      localStorage.removeItem("token");
      localStorage.removeItem("student");
    } catch (err) {
      console.error("Failed to clear localStorage on logout:", err);
    }
  }, []);

  /** Update user dynamically (for profile picture or field changes) */
  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    try {
      if (role === "student") {
        localStorage.setItem("student", JSON.stringify(updatedUser));
      } else if (role) {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Failed to update user in localStorage:", err);
    }
  }, [role]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        login,
        logout,
        updateUser, // expose updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** Custom hook to access AuthContext */
export const useAuth = () => useContext(AuthContext);
