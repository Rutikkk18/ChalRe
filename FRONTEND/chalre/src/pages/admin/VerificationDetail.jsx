import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function VerificationDetail() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // For rejection remarks
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

    return (
        <div>
            <button onClick={() => navigate(-1)} style={{ marginBottom: "20px", cursor: "pointer", padding: "5px 10px" }}>
                &larr; Back
            </button>

            <h1>Verification Details</h1>

            <div className="detail-card">
                <h2>User Info</h2>
                <p><strong>Name:</strong> {data.userName}</p>
                <p><strong>Email:</strong> {data.userEmail}</p>
                <p><strong>Phone:</strong> {data.userPhone}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${data.verificationStatus.toLowerCase()}`}>{data.verificationStatus}</span></p>
                {data.verificationRemarks && <p><strong>Remarks:</strong> {data.verificationRemarks}</p>}
            </div>

            <div className="detail-card">
                <h2>Documents ({data.documents.length})</h2>
                {data.documents.length === 0 ? (
                    <p>No documents uploaded.</p>
                ) : (
                    <div className="docs-grid">
                        {data.documents.map((doc, idx) => (
                            <div key={idx} className="doc-item">
                                <p><strong>Type:</strong> {doc.docType}</p>
                                <p><small>Uploaded: {new Date(doc.uploadedAt).toLocaleString()}</small></p>

                                {/* Check if image or PDF/other */}
                                {doc.docUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                                    <img src={doc.docUrl} alt={doc.docType} className="doc-preview" />
                                ) : (
                                    <a href={doc.docUrl} target="_blank" rel="noopener noreferrer" className="doc-link">
                                        View Document (Click to Open)
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Buttons - Only show if PENDING (or if you want to allow re-review) */}
            <div className="actions">
                {data.verificationStatus === "PENDING" && !showRejectInput && (
                    <>
                        <button className="btn-approve" onClick={handleApprove} disabled={processing}>
                            {processing ? "Processing..." : "Approve Driver"}
                        </button>
                        <button className="btn-reject" onClick={() => setShowRejectInput(true)} disabled={processing}>
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
                            style={{ width: "100%", padding: "10px", margin: "10px 0" }}
                        />
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button className="btn-reject" onClick={handleReject} disabled={processing}>
                                {processing ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                            <button onClick={() => setShowRejectInput(false)} disabled={processing}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .detail-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .docs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }
        .doc-item {
          border: 1px solid #eee;
          padding: 10px;
          border-radius: 6px;
        }
        .doc-preview {
          width: 100%;
          height: 150px;
          object-fit: contain;
          margin-top: 10px;
          background: #f9f9f9;
        }
        .doc-link {
          display: block;
          margin-top: 10px;
          color: #007bff;
        }
        .actions {
          margin-top: 30px;
          display: flex;
          gap: 15px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .btn-approve {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1rem;
        }
        .btn-approve:hover { background-color: #218838; }
        
        .btn-reject {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1rem;
        }
        .btn-reject:hover { background-color: #c82333; }
        
        .reject-box {
          background: #fff3cd;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ffeeba;
          width: 100%;
          max-width: 500px;
        }
      `}</style>
        </div>
    );
}
