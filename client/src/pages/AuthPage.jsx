import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const admin_user = localStorage.getItem("pending_admin_user");
        console.log("Sending for 2FA verify:", { admin_user, code });

        if (!admin_user) {
        setError("No admin session found. Please log in again.");
        setLoading(false);
        return;
        }

        try {
        const res = await API.post("/admin/2fa", { admin_user, code });

        if (res.data.success) {
            // Store token for authenticated admin
            localStorage.setItem("admin_token", res.data.token);

            // Clean up
            localStorage.removeItem("pending_admin_user");

            // Redirect to admin dashboard
            navigate("/admin/dashboard");
        } else {
            setError("Invalid 2FA code.");
        }
        } catch (err) {
        setError(err.response?.data?.error || "Verification failed");
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="t-body">
            <div className="container" style={{ maxWidth: 400, marginTop: 50 }}>
            <h3>Admin 2FA Verification</h3>
            <form onSubmit={handleVerify}>
                <input
                type="text"
                placeholder="Enter 2FA code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                style={{ width: "100%", marginBottom: 10, padding: 8 }}
                />
                <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
                </button>
            </form>
            {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
            </div>
        </div>
    );
}
