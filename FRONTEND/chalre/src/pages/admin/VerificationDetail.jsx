import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../../styles/verificationList.css";

export default function VerificationDetail() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [showRejectInput, setShowRejectInput] = useState(false);
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.get(`/admin/verifications/${userId}`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch details", err);
                alert("Failed to load verification details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [userId]);

    const handleApprove = async () => {
        if (!window.confirm("Are you sure you want to APPROVE this driver?")) return;

        setProcessing(true);
        try {
            await api.post(`/admin/verifications/approve/${userId}`);
            alert("Driver Approved Successfully!");
            navigate("/admin/verifications");
        } catch (err) {
            console.error("Approval failed", err);
            alert("Failed to approve driver.");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!remarks.trim()) {
            alert("Please enter rejection remarks.");
            return;
        }

        setProcessing(true);
        try {
            await api.post(`/admin/verifications/reject/${userId}`, { remarks });
            alert("Driver Rejected.");
            navigate("/admin/verifications");
        } catch (err) {
            console.error("Rejection failed", err);
            alert("Failed to reject driver.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div>Loading details...</div>;
    if (!data) return <div>User not found.</div>;

    const statusClass = data.status
        ? data.status.toLowerCase()
        : "";

    const documents = data.documents || [];

    return (
        <div className="verification-details">
            <button className="back-btn" onClick={() => navigate(-1)}>
                ← Back
            </button>

            <h1>Verification Details</h1>

            <div className="detail-card">
                <h2>User Info</h2>
                <p><strong>Name:</strong> {data.name || "-"}</p>
                <p><strong>Email:</strong> {data.email || "-"}</p>
                <p><strong>Phone:</strong> {data.phone || "-"}</p>
                <p>
                    <strong>Status:</strong>{" "}
                    <span className={`status-badge ${statusClass}`}>
                        {data.status}
                    </span>
                </p>
                {data.remarks && (
                    <p><strong>Remarks:</strong> {data.remarks}</p>
                )}
            </div>

            <div className="detail-card">
                <h2>Documents ({documents.length})</h2>

                {documents.length === 0 ? (
                    <p>No documents uploaded.</p>
                ) : (
                    <div className="docs-grid">
                        {documents.map((doc, idx) => (
                            <div key={idx} className="doc-item">
                                <p><strong>Type:</strong> {doc.docType}</p>
                                <p className="uploaded-time">
                                    Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                                </p>

                                {/\.(jpeg|jpg|png|gif|webp)$/i.test(doc.url) ? (
                                    <img
                                        src={doc.url}
                                        alt={doc.docType}
                                        className="doc-preview"
                                    />
                                ) : (
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="doc-link"
                                    >
                                        View Document
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="actions">
                {data.status === "PENDING" && !showRejectInput && (
                    <>
                        <button
                            className="btn-approve"
                            onClick={handleApprove}
                            disabled={processing}
                        >
                            {processing ? "Processing..." : "Approve Driver"}
                        </button>

                        <button
                            className="btn-reject"
                            onClick={() => setShowRejectInput(true)}
                            disabled={processing}
                        >
                            Reject
                        </button>
                    </>
                )}

                {showRejectInput && (
                    <div className="reject-box">
                        <h4>Reason for Rejection</h4>
                        <textarea
                            rows="3"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="e.g. License image is blurry..."
                        />
                        <div className="reject-actions">
                            <button
                                className="btn-reject"
                                onClick={handleReject}
                                disabled={processing}
                            >
                                {processing ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                            <button
                                className="btn-cancel"
                                onClick={() => setShowRejectInput(false)}
                                disabled={processing}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
