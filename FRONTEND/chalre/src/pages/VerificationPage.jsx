import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import "../styles/verification.css";

export default function VerificationPage() {
  const { user } = useContext(AuthContext);

  const [docs, setDocs] = useState([
    { file: null, type: "" }
  ]);

  const [status, setStatus] = useState(user?.verificationStatus || "NOT_SUBMITTED");
  const [remarks, setRemarks] = useState(user?.verificationRemarks || null);
  const [loading, setLoading] = useState(false);

  // 🔄 Load latest user verification status
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

  // ➕ Add more document inputs
  const addDoc = () => {
    setDocs([...docs, { file: null, type: "" }]);
  };

  // 📝 Update document data
  const updateDoc = (index, field, value) => {
    const newDocs = [...docs];
    newDocs[index][field] = value;
    setDocs(newDocs);
  };

  // 🚀 Submit verification
  const handleSubmit = async () => {
    if (docs.some(d => !d.file || !d.type)) {
      alert("Please select file and type for all documents.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      docs.forEach((doc) => {
        formData.append("files", doc.file);
        formData.append("types", doc.type);
      });

      await api.post(
        "/driver/verify/submit",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      alert("Verification submitted successfully!");
      setStatus("PENDING");
    } catch (err) {
      console.error(err);
      alert("Error submitting verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-wrapper">
      <h2 className="verify-title">Driver Verification (KYC)</h2>

      {/* STATUS BOX */}
      <div className={`status-box ${status.toLowerCase()}`}>
        <p>Status: <strong>{status}</strong></p>
        {status === "REJECTED" && (
          <p className="remarks">Reason: {remarks}</p>
        )}
      </div>

      {/* APPROVED MESSAGE */}
      {status === "APPROVED" && (
        <p className="success-msg">Your verification is approved 🎉</p>
      )}

     {/* UPLOAD FORM - Allow for NOT_SUBMITTED, PENDING, and REJECTED */}
{(status === "NOT_SUBMITTED" || status === "PENDING" || status === "REJECTED") && (
  <>
    <h3 className="section-title">
      {status === "REJECTED" ? "Re-upload Documents" : "Upload Documents"}
    </h3>

    {/* 🔥 ADD THIS: Show rejection reason prominently */}
    {status === "REJECTED" && remarks && (
      <div className="rejection-notice">
        <strong>⚠️ Rejection Reason:</strong>
        <p>{remarks}</p>
        <p className="help-text">Please fix the issues mentioned above and re-submit your documents.</p>
      </div>
    )}

    {docs.map((doc, index) => (
      <div className="doc-card" key={index}>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) =>
            updateDoc(index, "file", e.target.files[0])
          }
        />

        <select
          value={doc.type}
          onChange={(e) =>
            updateDoc(index, "type", e.target.value)
          }
        >
          <option value="">Select Type</option>
          <option value="ID_CARD">ID Card</option>
          <option value="LICENSE">Driving License</option>
          <option value="PROFILE_PHOTO">Profile Photo</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
    ))}

    <button className="add-btn" onClick={addDoc}>
      + Add More
    </button>

    <button
      className="submit-btn"
      onClick={handleSubmit}
      disabled={loading}
    >
      {loading ? "Submitting..." : status === "REJECTED" ? "Re-submit Verification" : "Submit Verification"}
    </button>
  </>
)}

{/* SHOW MESSAGE FOR PENDING STATUS */}
{status === "PENDING" && (
  <div className="pending-notice">
    <p>⏳ Your documents are under review. You'll be notified once admin reviews them.</p>
  </div>
)}
    </div>
  );
}
