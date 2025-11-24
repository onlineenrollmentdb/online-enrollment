// src/components/Toast.js
import React from "react";

export default function Toast({ id, message, type = "info", onClose }) {
  return (
    <div className={`app-toast ${type}`} role="status" aria-live="polite">
      <div className="app-toast-message">{message}</div>
      <button
        className="close-btn"
        aria-label="Close notification"
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
      >
        ×
      </button>
    </div>
  );
}
