// src/pages/VerificationPage.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import "../styles/verification.css";

export default function VerificationPage() {
  const { user } = useContext(AuthContext);

  const [docs, setDocs] = useState([{ url: "", type: "" }]);
  const [status, setStatus] = useState(user?.verificationStatus || "NOT_SUBMITTED");
  const [remarks, setRemarks] = useState(user?.verificationRemarks || null);
  const [loading, setLoading] = useState(false);

  // Load latest user status when page opens
  useEffect(() => {
    fetchMe();
  }, []);

  const fetchMe = async () => {
    try {
      const res = await api.get("/auth/me");
      setStatus(res.data.verificationStatus);
      setRemarks(res.data.verificationRemarks);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const handleSubmit = async () => {
    if (docs.some(d => !d.url || !d.type)) {
      alert("Please fill all document fields.");
      return;
    }

    setLoading(true);
    try {
      const urls = docs.map(d => d.url);
      const types = docs.map(d => d.type);

      await api.post("/api/driver/verify/submit", { urls, types });

      alert("Verification submitted successfully!");
      setStatus("PENDING");
    } catch (err) {
      console.error(err);
      alert("Error submitting verification.");
    } finally {
      setLoading(false);
    }
  };

  const addDoc = () => {
    setDocs([...docs, { url: "", type: "" }]);
  };

  const updateDoc = (index, field, value) => {
    const newDocs = [...docs];
    newDocs[index][field] = value;
    setDocs(newDocs);
  };

  return (
    <div className="verify-wrapper">
      <h2 className="verify-title">Driver Verification (KYC)</h2>

      {/* Status Box */}
      <div className={`status-box ${status.toLowerCase()}`}>
        <p>Status: <strong>{status}</strong></p>
        {status === "REJECTED" && (
          <p className="remarks">Reason: {remarks}</p>
        )}
      </div>

      {/* If approved stop UI */}
      {status === "APPROVED" && (
        <p className="success-msg">Your verification is approved 🎉</p>
      )}

      {/* If not approved — show upload form */}
      {status !== "APPROVED" && (
        <>
          <h3 className="section-title">Upload Documents</h3>

          {docs.map((doc, index) => (
            <div className="doc-card" key={index}>
              <input
                type="text"
                placeholder="Document URL"
                value={doc.url}
                onChange={(e) => updateDoc(index, "url", e.target.value)}
              />

              <select
                value={doc.type}
                onChange={(e) => updateDoc(index, "type", e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="ID_CARD">ID Card</option>
                <option value="LICENSE">Driving License</option>
                <option value="PROFILE_PHOTO">Profile Photo</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          ))}

          <button className="add-btn" onClick={addDoc}>+ Add More</button>

          <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Verification"}
          </button>
        </>
      )}
    </div>
  );
}
