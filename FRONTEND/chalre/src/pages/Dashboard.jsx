import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/dashboard.css";

import { CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import { BACKEND_URL } from "../config";

export default function Dashboard() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [upiId, setUpiId] = useState(user.upiId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const saveUpiId = async () => {
    if (!upiId.match(/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/)) {
      setError("Invalid UPI ID format");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/upi", { upiId });

      // update user locally
      setUser({
        ...user,
        upiId: res.data.upiId,
      });

      alert("UPI ID saved successfully");
    } catch (err) {
  const msg =
    err.response?.data?.message ||
    err.response?.data?.details ||
    err.response?.data?.error ||
    "Failed to save UPI ID";

  setError(msg);
}
 finally {
      setLoading(false);
    }
  };

  return (
    
    <div className="dash-container">
      {/* HEADER */}
      <div className="dash-header">
        <h1>Dashboard</h1>
        <NotificationBell />
      </div>

      {/* MAIN CARD */}
      <div className="dash-card modern">
        {/* PROFILE */} 
        
        <div className="profile-section">
          <img
          src={user?.profileImage || "/profileimage.png"}
          alt="Profile"
          className="profile-avatar"
        />
        



          <div className="profile-info">
            <h2>{user.name}</h2>
            <p className="email">{user.email}</p>

            {user.verificationStatus === "APPROVED" && (
              <span className="badge success">
                <CheckCircle size={14} /> 
              </span>
            )}
            {user.verificationStatus === "PENDING" && (
              <span className="badge warning">
                <Clock size={14} /> 
              </span>
            )}
            {user.verificationStatus === "REJECTED" && (
              <span className="badge danger">
                <XCircle size={14} />
              </span>
            )}
          </div>
        </div>

        {/* DRIVER STATUS */}
        <div className="status-grid">
          <div className="status-card">
            <CheckCircle />
            <div>
              <span>Driver Status</span>
              <strong>{user.verificationStatus}</strong>
            </div>
            {user.verificationStatus === "NOT_SUBMITTED" && (
              <button onClick={() => navigate("/verification")}>
                Get Verified
              </button>
            )}
          </div>
        </div>

        {/* 💰 UPI SETUP */}
        <div className="upi-section">
          <h3>
            <CreditCard size={18} /> UPI for Payments
          </h3>

          <p className="muted">
            Required to receive payments when you offer rides
          </p>

          <input
            type="text"
            placeholder="yourupi@bank"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />

          {error && <p className="error-text">{error}</p>}

          <button onClick={saveUpiId} disabled={loading}>
            {user.upiId ? "Update UPI ID" : "Add UPI ID"}
          </button>
        </div>

        {/* PRIMARY ACTIONS */}
        <div className="primary-actions">
          <button
            className="primary-btn"
            onClick={() => navigate("/search")}
          >
            🔍 Search Ride
          </button>

          <button
            className="primary-btn outline"
            onClick={() => navigate("/offer")}
          >
            ➕ Offer a Ride
          </button>
        </div>

        {/* SECONDARY ACTIONS */}
        <div className="secondary-actions">
          <button onClick={() => navigate("/myrides")}>My Rides</button>
          <button onClick={() => navigate("/mybookings")}>My Bookings</button>
          <button onClick={() => navigate("/profile")}>Edit Profile</button>
          <button onClick={() => navigate("/notifications")}>
            Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
