import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { Trash2, AlertTriangle, Clock } from "lucide-react";
import "../styles/TermsAndConditions.css"; // Reuse general document styles

export default function AccountDeletion() {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get("/deletion-requests/me");
      setRequest(res.data || null);
    } catch (err) {
      console.error("Failed to load deletion request status", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await api.post("/deletion-requests");
      setRequest(res.data);
      setShowConfirmModal(false);
      alert("Your account deletion request has been submitted and is under review.");
    } catch (err) {
      const msg = err.response?.status === 409
        ? "You already have a pending deletion request."
        : "Failed to submit request. Please try again.";
      setErrorMessage(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getFormattedDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "50px", textAlign: "center", minHeight: "60vh" }}>
        <p>Loading deletion request status...</p>
      </div>
    );
  }

  return (
    <div className="tc-wrap" style={{ maxWidth: "800px", margin: "40px auto", padding: "20px" }}>
      <header className="tc-header" style={{ marginBottom: "30px", textAlign: "center" }}>
        <span className="tc-badge" style={{ background: "#fee2e2", color: "#dc3545", borderColor: "#fecaca" }}>
          Account Support
        </span>
        <h1 className="tc-title" style={{ fontSize: "2.5rem", color: "#1f2937", margin: "15px 0" }}>
          Request Account Deletion
        </h1>
      </header>

      <main className="tc-sections">
        {request && request.status === "PENDING" ? (
          /* Under Review State */
          <div 
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid #FDE68A",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <Clock size={24} color="#D97706" />
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600", color: "#92400E" }}>
                Under Review
              </h2>
            </div>
            <p style={{ margin: 0, color: "#78350F", fontSize: "0.95rem", lineHeight: "1.6" }}>
              Your deletion request submitted on <strong>{getFormattedDate(request.createdAt)}</strong> is currently under review by the ChalRe team.
            </p>
          </div>
        ) : (
          /* Initial State - Actionable */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div 
              style={{
                backgroundColor: "#FFFBEB",
                borderRadius: "12px",
                padding: "24px",
                border: "1px solid #FDE68A",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <AlertTriangle size={20} color="#92400E" />
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600", color: "#92400E" }}>
                  Important Process Information
                </h2>
              </div>
              <p style={{ margin: 0, color: "#78350F", fontSize: "0.95rem", lineHeight: "1.6" }}>
                Your deletion request will be reviewed by the ChalRe team. No data is deleted automatically. We may contact you if additional information is required.
              </p>
            </div>

            <p style={{ color: "#4b5563", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
              You can also email us directly at{" "}
              <a href="mailto:chalreofficial@gmail.com" style={{ color: "#3b82f6", textDecoration: "underline" }}>
                chalreofficial@gmail.com
              </a>{" "}
              to request deletion.
            </p>

            <button
              onClick={() => setShowConfirmModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: "#dc3545",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                alignSelf: "flex-start",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#c82333")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#dc3545")}
            >
              <Trash2 size={18} />
              Request Account Deletion
            </button>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div 
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "28px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "1.25rem", fontWeight: "700", color: "#1f2937" }}>
              Confirm Account Deletion Request
            </h3>
            <p style={{ margin: "0 0 24px 0", color: "#4b5563", fontSize: "0.95rem", lineHeight: "1.6" }}>
              Are you sure you want to request deletion of your ChalRe account? This request will be reviewed manually by our team before permanent deletion.
            </p>
            {errorMessage && (
              <p style={{ color: "#dc3545", fontSize: "0.85rem", margin: "-12px 0 16px 0" }}>
                {errorMessage}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                style={{
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: "#dc3545",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {submitting ? "Submitting..." : "Confirm Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
