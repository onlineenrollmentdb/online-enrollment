// src/context/ToastContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import Toast from "../components/Toast";
import "../css/Toast.css";

const ToastContext = createContext();
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = ++idCounter;
    console.log("[DEBUG] addToast called:", { id, message, type });
    const newToast = { id, message, type };

    // Put newest toast at the top
    setToasts((prev) => [newToast, ...prev]);

    // Auto-hide after 4s
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Always rendered at root level from provider (fixed overlay) */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
