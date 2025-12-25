import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/dashboard.css";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import NotificationBell from "../components/NotificationBell";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return null;

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
            src={user.profileImage || "/profileimage.png"}
            alt="Profile"
            className="dash-avatar"
          />

          <div className="profile-info">
            <h2>{user.name}</h2>
            <p className="email">{user.email}</p>

            {user.verificationStatus === "APPROVED" && (
              <span className="badge success">
                <CheckCircle size={14} /> Verified Driver
              </span>
            )}
            {user.verificationStatus === "PENDING" && (
              <span className="badge warning">
                <Clock size={14} /> Verification Pending
              </span>
            )}
            {user.verificationStatus === "REJECTED" && (
              <span className="badge danger">
                <XCircle size={14} /> Verification Rejected
              </span>
            )}
          </div>
        </div>

        {/* STATUS CARDS */}
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
