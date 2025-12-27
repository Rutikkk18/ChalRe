import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/dashboard.css";
import "../styles/payouts.css";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import EarningsDisplay from "../components/EarningsDisplay";
import BankDetailsForm from "../components/BankDetailsForm";
import PayoutHistory from "../components/PayoutHistory";
import PayoutRequestModal from "../components/PayoutRequestModal";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  const handleRequestPayout = () => {
    setShowPayoutModal(true);
  };

  const handlePayoutSuccess = () => {
    setRefreshKey((prev) => prev + 1);
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

      {/* EARNINGS & PAYOUT SECTION - Only for verified drivers */}
      {user.isDriverVerified && user.verificationStatus === "APPROVED" && (
        <div className="dash-card modern" style={{ marginTop: "24px" }}>
          <EarningsDisplay 
            key={refreshKey}
            onRequestPayout={handleRequestPayout}
          />
        </div>
      )}

      {/* BANK DETAILS SECTION - Only for verified drivers */}
      {user.isDriverVerified && user.verificationStatus === "APPROVED" && (
        <div className="dash-card modern" style={{ marginTop: "24px" }}>
          <BankDetailsForm 
            key={refreshKey}
            onSuccess={handlePayoutSuccess}
          />
        </div>
      )}

      {/* PAYOUT HISTORY - Only for verified drivers */}
      {user.isDriverVerified && user.verificationStatus === "APPROVED" && (
        <div className="dash-card modern" style={{ marginTop: "24px" }}>
          <PayoutHistory key={refreshKey} />
        </div>
      )}

      {/* PAYOUT REQUEST MODAL */}
      <PayoutRequestModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        onSuccess={handlePayoutSuccess}
      />
    </div>
  );
}
