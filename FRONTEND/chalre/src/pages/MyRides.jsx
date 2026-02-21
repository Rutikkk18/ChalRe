// src/pages/MyRides.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/myrides.css";
import {
  MapPin, Calendar, Users, IndianRupee,
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

      const bookingsData = {};
      for (const ride of [...upcoming, ...past]) {
        try {
          const b = await api.get(`/rides/${ride.id}/bookings`);
          bookingsData[ride.id] = b.data;
        } catch {
          bookingsData[ride.id] = { activeBookings: [], totalBookings: 0 };
        }
      }
      setBookingsMap(bookingsData);
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

  const toggleBookings = (rideId) => {
    setExpandedRides(prev => ({ ...prev, [rideId]: !prev[rideId] }));
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
                  <span>{ride.date} · {ride.time}</span>
                </div>
                <div className="mr-meta-item">
                  <Users size={14} className="mr-meta-icon" />
                  <span>{ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} available</span>
                </div>
                <div className="mr-meta-item mr-meta-item--price">
                  <IndianRupee size={14} className="mr-meta-icon" />
                  <span>₹{ride.price} per seat</span>
                </div>
                {bookingsMap[ride.id] && (
                  <div className="mr-meta-item mr-meta-item--bookings">
                    <UserCheck size={14} className="mr-meta-icon" />
                    <span>
                      {bookingsMap[ride.id].activeBookingsCount || 0} active · {bookingsMap[ride.id].totalBookings || 0} total bookings
                    </span>
                  </div>
                )}
              </div>

              {/* Expand bookings */}
              {bookingsMap[ride.id]?.activeBookings?.length > 0 && (
                <div className="mr-bookings">
                  <button className="mr-bookings-toggle" onClick={() => toggleBookings(ride.id)}>
                    {expandedRides[ride.id]
                      ? <><ChevronUp size={15} /> Hide Passengers</>
                      : <><ChevronDown size={15} /> Show Passengers ({bookingsMap[ride.id].activeBookings.length})</>
                    }
                  </button>

                  {expandedRides[ride.id] && (
                    <div className="mr-bookings-list">
                      {bookingsMap[ride.id].activeBookings.map((booking) => (
                        <div key={booking.id} className="mr-booking-item">
                          <div className="mr-booking-passenger">
                            <UserCheck size={15} className="mr-booking-icon" />
                            <div>
                              <strong>{booking.user?.name || "Passenger"}</strong>
                              <span>{booking.seatsBooked} seat(s) · ₹{(ride.price * booking.seatsBooked).toFixed(0)} · {booking.paymentMode}</span>
                            </div>
                          </div>
                          <div className="mr-booking-actions">
                            {booking.user?.phone && (
                              <a className="mr-btn-call" href={`tel:${booking.user.phone}`}>Call</a>
                            )}
                            <button
                              className="mr-btn-chat"
                              onClick={() => setChatModal({ rideId: ride.id, otherUser: booking.user })}
                            >
                              <MessageCircle size={13} /> Chat
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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