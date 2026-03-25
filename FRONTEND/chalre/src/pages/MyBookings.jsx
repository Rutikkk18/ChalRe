// src/pages/MyBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/mybookings.css";
import {
  Calendar,
  Users,
  IndianRupee,
  Eye,
  XCircle,
  Clock,
  History,
  Star,
  MessageCircle,
  CreditCard,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import RatingModal from "../components/RatingModal";
import ChatModal from "../components/ChatModal";

export default function MyBookings() {
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings]         = useState([]);
  const [bookings, setBookings]                 = useState([]);
  const [activeTab, setActiveTab]               = useState("upcoming");
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState("");
  const [ratingModal, setRatingModal]           = useState(null);
  const [chatModal, setChatModal]               = useState(null);
  const [ratedRides, setRatedRides]             = useState(new Set());
  const [confirmingId, setConfirmingId]         = useState(null);
  const [confirmedRides, setConfirmedRides]     = useState(new Set());

  const navigate = useNavigate();

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    try {
      const res      = await api.get("/bookings/my?filter=separated");
      const data     = res.data || {};
      const upcoming = (data.upcoming || []).filter(b => b.ride != null);
      const past     = (data.past     || []).filter(b => b.ride != null);
      setUpcomingBookings(upcoming);
      setPastBookings(past);
      setBookings(activeTab === "upcoming" ? upcoming : past);
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setBookings(activeTab === "upcoming" ? upcomingBookings : pastBookings);
  }, [activeTab, upcomingBookings, pastBookings]);

  const handleRateClick      = (b) => setRatingModal({ rideId: b.ride.id, driverName: b.ride.driver?.name || "Driver" });
  const handleRatingSuccess  = (rideId) => { setRatedRides((prev) => new Set([...prev, rideId])); loadBookings(); };
  const handleChatClick      = (b) => setChatModal({ rideId: b.ride.id, otherUser: b.ride.driver });

  const cancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      alert("Booking cancelled. Refund will be processed.");
      loadBookings();
    } catch (err) {
      const d = err.response?.data;
      alert(typeof d === "object" ? d.error : d || "Failed to cancel booking.");
    }
  };

  const handleConfirmRide = async (b) => {
    if (!window.confirm("Confirm that the ride is completed? This will release payment to the driver.")) return;
    setConfirmingId(b.id);
    try {
      await api.post(`/payments/confirm-ride/${b.ride.id}`);
      setConfirmedRides(prev => new Set([...prev, b.id]));
      alert("Ride confirmed! Payment will be released to driver.");
    } catch (err) {
      const d = err.response?.data;
      alert(typeof d === "string" ? d : "Failed to confirm ride. Please try again.");
    } finally {
      setConfirmingId(null);
    }
  };

  // Show confirm button ONLY when:
  // 1. Payment is ONLINE + PAID
  // 2. Booking is BOOKED
  // 3. Ride date+time has already passed
  // 4. Not already confirmed this session
  const shouldShowConfirmButton = (b) => {
    if (b.paymentMethod !== "ONLINE") return false;
    if (b.paymentStatus !== "PAID") return false;
    if (b.status !== "BOOKED") return false;
    if (confirmedRides.has(b.id)) return false;
    try {
      const rideDateStr = b.ride.date; // "2026-03-26"
      const rideTimeStr = b.ride.time; // "15:48"
      const rideDateTime = new Date(`${rideDateStr}T${rideTimeStr}:00`);
      const now = new Date();
      return now > rideDateTime; // only after ride time has passed
    } catch {
      return false;
    }
  };

  const getLocationName = (full) => full ? full.split(",")[0].trim() : "";
  const getLocationSub  = (full) => {
    if (!full) return "";
    const parts = full.split(",");
    return parts.slice(1, 3).join(",").trim();
  };

  const paymentLabel = (status) => {
    if (status === "PAID")     return "✓ Paid";
    if (status === "PENDING")  return "Pending (Cash)";
    if (status === "REFUNDED") return "✓ Refunded";
    return status;
  };

  if (loading) return <div className="mb-wrapper"><div className="mb-loading">Loading your bookings…</div></div>;

  return (
    <div className="mb-wrapper">

      <div className="mb-header">
        <h1 className="mb-title">My Bookings</h1>
      </div>

      <div className="mb-tabs-bar">
        <div className="mb-tabs">
          <button
            className={`mb-tab ${activeTab === "upcoming" ? "mb-tab--active" : ""}`}
            onClick={() => setActiveTab("upcoming")}
          >
            <Clock size={16} />
            Upcoming
            <span className="mb-tab-count">{upcomingBookings.length}</span>
          </button>
          <button
            className={`mb-tab ${activeTab === "past" ? "mb-tab--active" : ""}`}
            onClick={() => setActiveTab("past")}
          >
            <History size={16} />
            Past
            <span className="mb-tab-count">{pastBookings.length}</span>
          </button>
        </div>
      </div>

      {error && <p className="mb-error">{error}</p>}

      {bookings.length === 0 ? (
        <div className="mb-empty">
          <div className="mb-empty-icon">🎫</div>
          <p className="mb-empty-text">
            {activeTab === "upcoming"
              ? "No upcoming bookings. Find a ride!"
              : "No past bookings yet."}
          </p>
          {activeTab === "upcoming" && (
            <button className="mb-cta-btn" onClick={() => navigate("/search")}>
              Search Rides
            </button>
          )}
        </div>
      ) : (
        <div className="mb-list">
          {bookings.map((b) => (
            <div className="mb-card shadow" key={b.id}>

              <div className="mb-route">
                <div className="mb-route-point">
                  <span className="mb-dot mb-dot--from" />
                  <div className="mb-place-text">
                    <span className="mb-place-label">From</span>
                    <span className="mb-place-name">{getLocationName(b.ride.startLocation)}</span>
                    <span className="mb-place-sub">{getLocationSub(b.ride.startLocation)}</span>
                  </div>
                </div>
                <div className="mb-route-line" />
                <div className="mb-route-point">
                  <span className="mb-dot mb-dot--to" />
                  <div className="mb-place-text">
                    <span className="mb-place-label">To</span>
                    <span className="mb-place-name">{getLocationName(b.ride.endLocation)}</span>
                    <span className="mb-place-sub">{getLocationSub(b.ride.endLocation)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-divider" />

              <div className="mb-meta">
                <div className="mb-meta-item">
                  <Calendar size={14} className="mb-meta-icon" />
                  <span>{b.ride.date} · {b.ride.time}</span>
                </div>
                <div className="mb-meta-item">
                  <Users size={14} className="mb-meta-icon" />
                  <span>{b.seatsBooked} seat{b.seatsBooked !== 1 ? "s" : ""} booked</span>
                </div>
                <div className="mb-meta-item mb-meta-item--price">
                  <IndianRupee size={14} className="mb-meta-icon" />
                  <span>₹{(b.ride.price * b.seatsBooked).toFixed(0)} total</span>
                </div>
                <div className="mb-meta-item">
                  <CreditCard size={14} className="mb-meta-icon" />
                  <span>{b.paymentMode}</span>
                </div>
              </div>

              <div className="mb-badges">
                <span className={`mb-badge mb-badge--booking ${b.status === "BOOKED" ? "mb-badge--green" : "mb-badge--red"}`}>
                  {b.status === "BOOKED"
                    ? <><CheckCircle size={12} /> Confirmed</>
                    : <><AlertCircle size={12} /> Cancelled</>
                  }
                </span>
                <span className={`mb-badge ${
                  b.paymentStatus === "PAID"     ? "mb-badge--green"  :
                  b.paymentStatus === "PENDING"  ? "mb-badge--yellow" :
                  b.paymentStatus === "REFUNDED" ? "mb-badge--blue"   : "mb-badge--grey"
                }`}>
                  {paymentLabel(b.paymentStatus)}
                </span>
              </div>

              {/* Confirm banner — appears only after ride time passes */}
              {shouldShowConfirmButton(b) && (
                <div style={{
                  margin: "0.75rem 0 0",
                  padding: "0.75rem",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap"
                }}>
                  <span style={{ fontSize: "0.8rem", color: "#166534" }}>
                    🎯 Ride completed? Confirm to release payment to driver.
                  </span>
                  <button
                    onClick={() => handleConfirmRide(b)}
                    disabled={confirmingId === b.id}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.4rem 0.9rem",
                      fontSize: "0.82rem",
                      fontWeight: "500",
                      cursor: confirmingId === b.id ? "not-allowed" : "pointer",
                      opacity: confirmingId === b.id ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <CheckCircle size={13} />
                    {confirmingId === b.id ? "Confirming…" : "Confirm Ride"}
                  </button>
                </div>
              )}

              {/* Already confirmed message */}
              {confirmedRides.has(b.id) && (
                <div style={{
                  margin: "0.75rem 0 0",
                  padding: "0.6rem 0.75rem",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  color: "#166534"
                }}>
                  ✓ Ride confirmed. Payment released to driver.
                </div>
              )}

              <div className="mb-divider" />

              <div className="mb-actions">
                <button className="mb-btn mb-btn--view" onClick={() => navigate(`/ridedetails/${b.ride.id}`)}>
                  <Eye size={14} /> View Ride
                </button>

                {b.status === "BOOKED" && activeTab === "upcoming" && (
                  <>
                    <button className="mb-btn mb-btn--chat" onClick={() => handleChatClick(b)}>
                      <MessageCircle size={14} /> Chat Driver
                    </button>
                    <button className="mb-btn mb-btn--cancel" onClick={() => cancelBooking(b.id)}>
                      <XCircle size={14} /> Cancel
                    </button>
                  </>
                )}

                {activeTab === "past" && b.status === "BOOKED" && !ratedRides.has(b.ride.id) && (
                  <button className="mb-btn mb-btn--rate" onClick={() => handleRateClick(b)}>
                    <Star size={14} /> Rate Driver
                  </button>
                )}

                {activeTab === "past" && ratedRides.has(b.ride.id) && (
                  <span className="mb-rated">✓ Rated</span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {ratingModal && (
        <RatingModal
          rideId={ratingModal.rideId}
          driverName={ratingModal.driverName}
          onClose={() => setRatingModal(null)}
          onSuccess={() => handleRatingSuccess(ratingModal.rideId)}
        />
      )}

      {chatModal && (
        <ChatModal
          rideId={chatModal.rideId}
          otherUser={chatModal.otherUser}
          onClose={() => setChatModal(null)}
        />
      )}
    </div>
  );
}