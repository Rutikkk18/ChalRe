import React from "react";
import "../../styles/AdminDashboard.css";

export default function AdminDashboard() {
    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>
            <p className="admin-subtitle">
                Welcome to the ChalRe Admin Panel. select an option from the sidebar to get started.
            </p>

            <div className="admin-grid">
                <div className="admin-card">
                    <h3>Driver Verifications</h3>
                    <p>Review pending driver documents.</p>
                </div>
                {/* Add more widgets later */}
            </div>
        </div>
    );
}