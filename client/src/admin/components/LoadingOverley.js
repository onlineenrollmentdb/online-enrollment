import React from "react";

export default function LoadingOverlay({ loading }) {
    if (!loading)return null;

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
            style={{
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(5px)",
                zIndex: 1050,
            }}
        >
            <div className="spinner-border text-primary" role="status" style={{ width: "4rem", height: "4rem" }}>
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );
}
