import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/dashboard.css";

import { CheckCircle, CreditCard, Search, Plus, Car, Calendar, User, Bell } from "lucide-react";
import NotificationBell from "../components/NotificationBell";

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
      setUser({ ...user, upiId: res.data.upiId });
      alert("UPI ID saved successfully");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.response?.data?.error ||
        "Failed to save UPI ID";
      setError(msg);
    } finally {
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

      {/* OUTER CARD (textured inset style) */}
      <div className="card">
        <div className="card-overlay" />
        <div className="card-inner">

          {/* PROFILE */}
          <div className="profile-section">
            <div className="avatar-wrapper">
              <img
                src={user.profileImage || "/profileimage.png"}
                alt="Profile"
                className="profile-avatar"
              />
            </div>
            <div className="profile-info">
              <h2>{user.name}</h2>
              <p className="email">{user.email}</p>
            </div>
          </div>

          <div className="dash-divider" />

          {/* DRIVER STATUS */}
          <div className="status-grid">
            <div className="status-card">
              <CheckCircle className="status-icon" />
              <div className="status-text">
                <span>Driver Status</span>
                <strong>{user.verificationStatus}</strong>
              </div>
              {user.verificationStatus === "NOT_SUBMITTED" && (
                <button className="status-btn" onClick={() => navigate("/verification")}>
                  Get Verified
                </button>
              )}
              {user.verificationStatus === "REJECTED" && (
                <button className="status-btn status-btn--danger" onClick={() => navigate("/verification")}>
                  Re-submit
                </button>
              )}
            </div>
          </div>

          <div className="dash-divider" />

          {/* UPI SETUP */}
          <div className="upi-section">
            <h3><CreditCard size={16} /> UPI for Payments</h3>
            <p className="muted">Required to receive payments when you offer rides</p>
            <div className="upi-row">
              <input
                type="text"
                placeholder="yourupi@bank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <button onClick={saveUpiId} disabled={loading}>
                {user.upiId ? "Update" : "Save"}
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="dash-divider" />

          {/* PRIMARY ACTIONS */}
          <div className="primary-actions">
            <button className="primary-btn" onClick={() => navigate("/search")}>
              <Search size={16} />
              Search Ride
            </button>
            <button className="primary-btn primary-btn--outline" onClick={() => navigate("/offer")}>
              <Plus size={16} />
              Offer a Ride
            </button>
          </div>

          <div className="dash-divider" />

          {/* SECONDARY ACTIONS */}
          <div className="secondary-actions">
            <button onClick={() => navigate("/myrides")}>
              <Car size={15} /> My Rides
            </button>
            <button onClick={() => navigate("/mybookings")}>
              <Calendar size={15} /> My Bookings
            </button>
            <button onClick={() => navigate("/profile")}>
              <User size={15} /> Edit Profile
            </button>
            <button onClick={() => navigate("/notifications")}>
              <Bell size={15} /> Notifications
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}