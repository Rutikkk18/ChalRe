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
    <div className="dash-page">

      {/* HEADER */}
      <div className="dash-header">
        <h1 className="dash-title">Dashboard</h1>
        <NotificationBell />
      </div>

      {/* OUTER CARD SHELL */}
      <div className="dash-card">
        <div className="dash-card-noise" />

        <div className="dash-card-inner">

          {/* ── PROFILE ── */}
          <div className="dash-profile">
            <div className="dash-avatar">
              <img
                src={user.profileImage || "/profileimage.png"}
                alt="Profile"
                className="dash-avatar-img"
              />
            </div>
            <div className="dash-profile-info">
              <span className="dash-name">{user.name}</span>
              <span className="dash-email">{user.email}</span>
            </div>
          </div>

          <div className="dash-sep" />

          {/* ── DRIVER STATUS ── */}
          <div className="dash-status">
            <CheckCircle className="dash-status-icon" />
            <div className="dash-status-text">
              <span>Driver Status</span>
              <strong>{user.verificationStatus}</strong>
            </div>
            {user.verificationStatus === "NOT_SUBMITTED" && (
              <button
                className="dash-inline-btn"
                onClick={() => navigate("/verification")}
              >
                Get Verified
              </button>
            )}
            {user.verificationStatus === "REJECTED" && (
              <button
                className="dash-inline-btn dash-inline-btn--red"
                onClick={() => navigate("/verification")}
              >
                Re-submit
              </button>
            )}
          </div>

          <div className="dash-sep" />

          {/* ── UPI ── */}
          <div className="dash-upi">
            <div className="dash-upi-title">
              <CreditCard size={15} />
              <span>UPI for Payments</span>
            </div>
            <p className="dash-upi-desc">
              Required to receive payments when you offer rides
            </p>
            <div className="dash-upi-row">
              <input
                type="text"
                className="dash-upi-input"
                placeholder="yourupi@bank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <button
                className="dash-upi-btn"
                onClick={saveUpiId}
                disabled={loading}
              >
                {user.upiId ? "Update" : "Save"}
              </button>
            </div>
            {error && <p className="dash-error">{error}</p>}
          </div>

          <div className="dash-sep" />

          {/* ── PRIMARY ACTIONS ── */}
          <div className="dash-primary">
            <button
              className="dash-primary-btn dash-primary-btn--solid"
              onClick={() => navigate("/search")}
            >
              <Search size={16} />
              Search Ride
            </button>
            <button
              className="dash-primary-btn dash-primary-btn--outline"
              onClick={() => navigate("/offer")}
            >
              <Plus size={16} />
              Offer a Ride
            </button>
          </div>

          <div className="dash-sep" />

          {/* ── SECONDARY ACTIONS ── */}
          <div className="dash-secondary">
            <button className="dash-sec-btn" onClick={() => navigate("/myrides")}>
              <Car size={17} />
              <span>My Rides</span>
            </button>
            <button className="dash-sec-btn" onClick={() => navigate("/mybookings")}>
              <Calendar size={17} />
              <span>My Bookings</span>
            </button>
            <button className="dash-sec-btn" onClick={() => navigate("/profile")}>
              <User size={17} />
              <span>Edit Profile</span>
            </button>
            <button className="dash-sec-btn" onClick={() => navigate("/notifications")}>
              <Bell size={17} />
              <span>Notifications</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}