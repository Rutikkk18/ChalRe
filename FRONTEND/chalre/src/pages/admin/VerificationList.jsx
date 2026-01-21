import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";

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
            setVerifications(res.data);
        } catch (err) {
            console.error("Failed to fetch verifications", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h1>Driver Verifications</h1>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : verifications.length === 0 ? (
                <p>No verifications found for status: <strong>{statusFilter}</strong></p>
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
                            {verifications.map((item) => (
                                <tr key={item.userId}>
                                    <td>{item.userId}</td>
                                    <td>{item.userName}</td>
                                    <td>{item.userEmail}</td>
                                    <td>{item.userPhone}</td>
                                    <td>{item.docCount} files</td>
                                    <td>
                                        <span className={`status-badge ${item.verificationStatus.toLowerCase()}`}>
                                            {item.verificationStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/admin/verifications/${item.userId}`} className="view-btn">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <style>{`
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .admin-table th, .admin-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .admin-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #444;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .status-badge.pending { background-color: #fff3cd; color: #856404; }
        .status-badge.approved { background-color: #d4edda; color: #155724; }
        .status-badge.rejected { background-color: #f8d7da; color: #721c24; }
        
        .view-btn {
          text-decoration: none;
          color: #007bff;
          font-weight: 500;
        }
        .view-btn:hover { text-decoration: underline; }
      `}</style>
        </div>
    );
}
