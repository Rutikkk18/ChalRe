import React from "react";

export default function AdminDashboard() {
    return (
        <div>
            <h1>Admin Dashboard</h1>
            <p style={{ color: "#666", marginTop: "10px" }}>
                Welcome to the ChalRe Admin Panel. select an option from the sidebar to get started.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginTop: "30px" }}>
                <div style={cardStyle}>
                    <h3>Driver Verifications</h3>
                    <p>Review pending driver documents.</p>
                </div>
                {/* Add more widgets later */}
            </div>
        </div>
    );
}

const cardStyle = {
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
    border: "1px solid #eee"
};
