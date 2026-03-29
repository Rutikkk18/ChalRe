import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminDashboard.css";

export default function AdminDashboard() {
    const navigate = useNavigate();

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>
            <p className="admin-subtitle">
                Welcome to the ChalRe Admin Panel. Select an option below to get started.
            </p>

            <div className="admin-grid">
                <div
                    className="admin-card"
                    onClick={() => navigate("/admin/verifications")}
                    style={{ cursor: "pointer" }}
                >
                    <h3>🪪 Driver Verifications</h3>
                    <p>Review pending driver documents and approve or reject.</p>
                </div>

                <div
                    className="admin-card"
                    onClick={() => navigate("/admin/payouts")}
                    style={{ cursor: "pointer" }}
                >
                    <h3>💸 Payout Tracker</h3>
                    <p>Track confirmed rides and manage driver payments manually.</p>
                </div>
            </div>
        </div>
    );
}