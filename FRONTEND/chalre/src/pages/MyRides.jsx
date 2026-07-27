// src/pages/MyRides.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/myrides.css";
import { formatTime12h } from "../utils/timeFormatter";
import {
  Calendar, Users, IndianRupee,
  Trash2, Eye, XCircle, UserCheck,
  ChevronDown, ChevronUp, Clock, History, MessageCircle, Plus
} from "lucide-react";
import ChatModal from "../components/ChatModal";

export default function MyRides() {
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [pastRides, setPastRides] = useState([]);
  const [rides, setRides] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookingsMap, setBookingsMap] = useState({});
  const [expandedRides, setExpandedRides] = useState({});
  const [chatModal, setChatModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadRides(); }, []);

  const loadRides = async () => {
    try {
      const res = await api.get("/rides/my?filter=separated");
      const data = res.data || {};
      const upcoming = data.upcoming || [];
      const past = data.past || [];
      setUpcomingRides(upcoming);
      setPastRides(past);
      setRides(activeTab === "upcoming" ? upcoming : past);
      // activeBookingsCount and totalBookings are now embedded in each ride
      // by the backend — no per-ride API calls needed here.
    } catch (err) {
      console.error(err);
      setError("Failed to load rides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRides(activeTab === "upcoming" ? upcomingRides : pastRides);
  }, [activeTab, upcomingRides, pastRides]);

  const toggleBookings = async (rideId) => {
    // Lazy-load passenger list only on first expand — not upfront for all rides
    if (!bookingsMap[rideId]) {
      try {
        const b = await api.get(`/rides/${rideId}/bookings`);
        setBookingsMap(prev => ({ ...prev, [rideId]: b.data }));
      } catch {
        setBookingsMap(prev => ({ ...prev, [rideId]: { activeBookings: [], totalBookings: 0 } }));
      }
    }
    setExpandedRides(prev => ({ ...prev, [rideId]: !prev[rideId] }));
  };

  // Check if chat is still available (within 48h after ride time)
  const isChatAvailable = (ride) => {
    try {
      const rideDateTime = new Date(`${ride.date}T${ride.time}:00`);
      const now = new Date();
      const hoursSinceRide = (now - rideDateTime) / (1000 * 60 * 60);
      return hoursSinceRide < 48;
    } catch {
      return false;
    }
  };

  // Get remaining chat hours for display
  const getChatHoursLeft = (ride) => {
    try {
      const rideDateTime = new Date(`${ride.date}T${ride.time}:00`);
      const now = new Date();
      const hoursLeft = 48 - ((now - rideDateTime) / (1000 * 60 * 60));
      return Math.max(0, Math.ceil(hoursLeft));
    } catch {
      return 0;
    }
  };

  const cancelRide = async (id) => {
    if (!window.confirm("Cancel this ride? All passengers will be notified and refunds processed.")) return;
    try {
      const res = await api.post(`/rides/${id}/cancel`);
      alert(res.data || "Ride cancelled. Passengers notified and refunded.");
      loadRides();
    } catch (err) {
      const d = err.response?.data;
      alert(typeof d === "object" ? d.error : d || "Failed to cancel ride");
    }
  };

  const deleteRide = async (id) => {
    if (!window.confirm("Delete this ride? Only possible with no active bookings.")) return;
    try {
      await api.delete(`/rides/${id}`);
      alert("Ride deleted successfully");
      loadRides();
    } catch (err) {
      const d = err.response?.data;
      alert(typeof d === "object" ? d.error : d || "Failed to delete ride");
    }
  };

  if (loading) return <div className="mr-wrapper"><div className="mr-loading">Loading your rides…</div></div>;

  return (
    <div className="mr-wrapper">

      {/* ── HEADER ── */}
      <div className="mr-header">
        <h1 className="mr-title">My Rides</h1>
        <button className="mr-new-btn" onClick={() => navigate("/offer")}>
          <Plus size={16} /> Offer New Ride
        </button>
      </div>

      {/* ── TABS (centered, underline style) ── */}
      <div className="mr-tabs-bar">
        <div className="mr-tabs">
          <button
            className={`mr-tab ${activeTab === "upcoming" ? "mr-tab--active" : ""}`}
            onClick={() => setActiveTab("upcoming")}
          >
            <Clock size={16} />
            Upcoming
            <span className="mr-tab-count">{upcomingRides.length}</span>
          </button>
          <button
            className={`mr-tab ${activeTab === "past" ? "mr-tab--active" : ""}`}
            onClick={() => setActiveTab("past")}
          >
            <History size={16} />
            Past
            <span className="mr-tab-count">{pastRides.length}</span>
          </button>
        </div>
      </div>

      {error && <p className="mr-error">{error}</p>}

      {/* ── EMPTY STATE ── */}
      {rides.length === 0 ? (
        <div className="mr-empty">
          <div className="mr-empty-icon">🚗</div>
          <p className="mr-empty-text">
            {activeTab === "upcoming"
              ? "No upcoming rides. Ready to offer one?"
              : "No past rides yet."}
          </p>
          {activeTab === "upcoming" && (
            <button className="mr-new-btn" onClick={() => navigate("/offer")}>
              <Plus size={16} /> Offer Your First Ride
            </button>
          )}
        </div>
      ) : (
        <div className="mr-grid">
          {rides.map((ride) => (
            <div className="mr-card shadow" key={ride.id}>

              {/* Route */}
              <div className="mr-card-route">
                <div className="mr-route-point">
                  <span className="mr-route-dot mr-route-dot--from" />
                  <div>
                    <span className="mr-route-label">From</span>
                    <span className="mr-route-place">{ride.startLocation || ride.from}</span>
                  </div>
                </div>
                <div className="mr-route-line" />
                <div className="mr-route-point">
                  <span className="mr-route-dot mr-route-dot--to" />
                  <div>
                    <span className="mr-route-label">To</span>
                    <span className="mr-route-place">{ride.endLocation || ride.to}</span>
                  </div>
                </div>
              </div>

              {/* Meta info */}
              <div className="mr-card-meta">
                <div className="mr-meta-item">
                  <Calendar size={14} className="mr-meta-icon" />
                  <span>{ride.date} · {formatTime12h(ride.time)}</span>
                </div>
                <div className="mr-meta-item">
                  <Users size={14} className="mr-meta-icon" />
                  <span>{ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} available</span>
                </div>
                <div className="mr-meta-item mr-meta-item--price">
                  <IndianRupee size={14} className="mr-meta-icon" />
                  <span>₹{ride.price} per seat</span>
                </div>
                {/* Booking counts — now embedded in ride DTO, no extra API call */}
                {(ride.activeBookingsCount > 0 || ride.totalBookings > 0) && (
                  <div className="mr-meta-item mr-meta-item--bookings">
                    <UserCheck size={14} className="mr-meta-icon" />
                    <span>
                      {ride.activeBookingsCount || 0} active · {ride.totalBookings || 0} total bookings
                    </span>
                  </div>
                )}
              </div>

              {/* Expand bookings — lazy-fetched on first click */}
              {ride.activeBookingsCount > 0 && (
                <div className="mr-bookings">
                  {(() => {
                    const activeList = bookingsMap[ride.id]?.activeBookings || [];
                    const count = activeList.length || ride.activeBookingsCount;
                    const getCity = (addr) => addr ? addr.split(",")[0].trim() : "";
                    const pickupCities = activeList
                      .map((b) => getCity(b.passengerPickup || ride.startLocation || ride.from))
                      .filter(Boolean);
                    const uniquePickups = Array.from(new Set(pickupCities));
                    const summaryText = uniquePickups.length > 0 ? `from ${uniquePickups.join(", ")}` : "";
                    const toggleTitle = count === 1
                      ? `1 booking ${summaryText}`.trim()
                      : `${count} bookings ${summaryText}`.trim();

                    return (
                      <>
                        <button className="mr-bookings-toggle" onClick={() => toggleBookings(ride.id)}>
                          {expandedRides[ride.id]
                            ? <><ChevronUp size={15} /> Hide Passengers ({toggleTitle})</>
                            : <><ChevronDown size={15} /> Show Passengers ({toggleTitle})</>
                          }
                        </button>

                        {expandedRides[ride.id] && (
                          <div className="mr-bookings-list">
                            {(bookingsMap[ride.id]?.activeBookings || []).map((booking) => {
                              const pPickup = booking.passengerPickup || ride.startLocation || ride.from || "";
                              const pDrop   = booking.passengerDrop   || ride.endLocation   || ride.to   || "";
                              const itemPrice = ((booking.bookedPrice ?? ride.price) * booking.seatsBooked).toFixed(0);
                              return (
                                <div key={booking.id} className="mr-booking-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div className="mr-booking-passenger">
                                      <UserCheck size={15} className="mr-booking-icon" />
                                      <div>
                                        <strong>{booking.user?.name || "Passenger"}</strong>
                                        <span>{booking.seatsBooked} seat(s) · ₹{itemPrice} · {booking.paymentMethod}</span>
                                      </div>
                                    </div>
                                    <div className="mr-booking-actions">
                                      {booking.user?.phone && (
                                        <a className="mr-btn-call" href={`tel:${booking.user.phone}`}>Call</a>
                                      )}
                                      {isChatAvailable(ride) && (
                                        <button
                                          className="mr-btn-chat"
                                          onClick={() => setChatModal({ rideId: ride.id, otherUser: booking.user })}
                                        >
                                          <MessageCircle size={13} />
                                          {new Date() > new Date(`${ride.date}T${ride.time}:00`)
                                            ? ` Chat (${getChatHoursLeft(ride)}h left)`
                                            : " Chat"
                                          }
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    padding: "0.4rem 0.6rem",
                                    fontSize: "0.75rem",
                                    color: "#334155"
                                  }}>
                                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#1c7c31", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                                      Passenger Route
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <span><strong>{getCity(pPickup)}</strong> <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>({pPickup})</span></span>
                                      <span style={{ color: "#1c7c31", fontWeight: "bold", margin: "0 6px" }}>→</span>
                                      <span><strong>{getCity(pDrop)}</strong> <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>({pDrop})</span></span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Actions */}
              <div className="mr-card-actions">
                <button className="mr-btn mr-btn--view" onClick={() => navigate(`/ridedetails/${ride.id}`)}>
                  <Eye size={14} /> View
                </button>
                <button className="mr-btn mr-btn--cancel" onClick={() => cancelRide(ride.id)}>
                  <XCircle size={14} /> Cancel
                </button>
                <button className="mr-btn mr-btn--delete" onClick={() => deleteRide(ride.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>

            </div>
          ))}
        </div>
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