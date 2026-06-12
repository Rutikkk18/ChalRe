import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import "../../styles/verificationList.css"; // Reuse existing list styles

export default function DeletionRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/deletion-requests");
            setRequests(res.data || []);
        } catch (err) {
            console.error("Failed to fetch deletion requests", err);
            alert("Failed to load deletion requests.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkCompleted = async (id) => {
        if (!window.confirm("Are you sure you want to mark this deletion request as completed?")) return;

        setProcessingId(id);
        try {
            await api.patch(`/admin/deletion-requests/${id}/complete`);
            alert("Request marked as completed successfully!");
            // Refresh requests list
            await fetchRequests();
        } catch (err) {
            console.error("Failed to complete deletion request", err);
            alert("Failed to update status. Please try again.");
        } finally {
            setProcessingId(null);
        }
    };

    const getFormattedDate = (dateString) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="verification-list">
            <div className="header" style={{ marginBottom: "24px" }}>
                <h1>Account Deletion Requests</h1>
            </div>

            {loading ? (
                <p>Loading deletion requests...</p>
            ) : requests.length === 0 ? (
                <p>No deletion requests found.</p>
            ) : (
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Request Date</th>
                                <th>Completed Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((item) => {
                                const statusClass = item.status ? item.status.toLowerCase() : "";

                                return (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td>{item.userName || "-"}</td>
                                        <td>{item.email || "-"}</td>
                                        <td>{item.phone || "-"}</td>
                                        <td>{getFormattedDate(item.createdAt)}</td>
                                        <td>{getFormattedDate(item.completedAt)}</td>
                                        <td>
                                            <span 
                                                className={`status-badge ${statusClass}`}
                                                style={{
                                                    backgroundColor: item.status === "COMPLETED" ? "#D1FAE5" : "#FEF3C7",
                                                    color: item.status === "COMPLETED" ? "#065F46" : "#92400E",
                                                    border: `1px solid ${item.status === "COMPLETED" ? "#A7F3D0" : "#FDE68A"}`
                                                }}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            {item.status === "PENDING" ? (
                                                <button
                                                    onClick={() => handleMarkCompleted(item.id)}
                                                    disabled={processingId === item.id}
                                                    style={{
                                                        backgroundColor: "#16a34a",
                                                        color: "#ffffff",
                                                        border: "none",
                                                        padding: "6px 12px",
                                                        borderRadius: "4px",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        cursor: "pointer",
                                                        transition: "background-color 0.2s"
                                                    }}
                                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#15803d")}
                                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#16a34a")}
                                                >
                                                    {processingId === item.id ? "Updating..." : "Mark Completed"}
                                                </button>
                                            ) : (
                                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
