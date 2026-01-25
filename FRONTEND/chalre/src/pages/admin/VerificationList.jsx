import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import "../../styles/verificationList.css";

export default function VerificationList() {
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("PENDING");

    useEffect(() => {
        fetchVerifications();
    }, [statusFilter]);

    const fetchVerifications = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/verifications?status=${statusFilter}`);
            setVerifications(res.data || []);
        } catch (err) {
            console.error("Failed to fetch verifications", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="verification-list">
            <div className="header">
                <h1>Driver Verifications</h1>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : verifications.length === 0 ? (
                <p>No verifications found for <strong>{statusFilter}</strong></p>
            ) : (
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Docs</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {verifications.map((item) => {
                                const statusClass = item.status
                                    ? item.status.toLowerCase()
                                    : "";

                                return (
                                    <tr key={item.userId}>
                                        <td>{item.userId}</td>
                                        <td>{item.name || "-"}</td>
                                        <td>{item.email || "-"}</td>
                                        <td>{item.phone || "-"}</td>
                                        <td>{item.documentsCount} files</td>
                                        <td>
                                            <span className={`status-badge ${statusClass}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/admin/verifications/${item.userId}`}
                                                className="view-btn"
                                            >
                                                View Details
                                            </Link>
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
