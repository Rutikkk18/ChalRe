// src/pages/MyRides.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/myrides.css";
import { MapPin, Calendar, Users, IndianRupee, Edit, Trash2, Eye, XCircle, UserCheck, ChevronDown, ChevronUp, Clock, History, MessageCircle } from "lucide-react";
import ChatModal from "../components/ChatModal";

export default function MyRides() {
  const [rides, setRides] = useState([]);
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [pastRides, setPastRides] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" or "past"
  const [bookingsMap, setBookingsMap] = useState({}); // rideId -> bookings
  const [expandedRides, setExpandedRides] = useState({}); // rideId -> boolean
  const [chatModal, setChatModal] = useState(null); // { rideId, otherUser }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    try {
      const res = await api.get("/rides/my?filter=separated");
      const separatedData = res.data || {};
      setUpcomingRides(separatedData.upcoming || []);
      setPastRides(separatedData.past || []);
      setRides(activeTab === "upcoming" ? (separatedData.upcoming || []) : (separatedData.past || []));
      
      // Load bookings for all rides
      const allRides = [...(separatedData.upcoming || []), ...(separatedData.past || [])];
      const bookingsData = {};
      for (const ride of allRides) {
        try {
          const bookingsRes = await api.get(`/rides/${ride.id}/bookings`);
          bookingsData[ride.id] = bookingsRes.data;
        } catch (err) {
          console.error(`Failed to load bookings for ride ${ride.id}:`, err);
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
    setExpandedRides(prev => ({
      ...prev,
      [rideId]: !prev[rideId]
    }));
  };

  const cancelRide = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this ride? All passengers will be notified and refunds will be processed.")) return;

    try {
      const res = await api.post(`/rides/${id}/cancel`);
      alert(res.data || "Ride cancelled successfully. All passengers have been notified and refunded.");
      loadRides();
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to cancel ride";
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && errorData.error) {
          errorMsg = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
      }
      alert(errorMsg);
    }
  };

  const deleteRide = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ride? This can only be done if there are no active bookings.")) return;

    try {
      await api.delete(`/rides/${id}`);
      alert("Ride deleted successfully");
      loadRides();
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to delete ride";
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && errorData.error) {
          errorMsg = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
      }
      alert(errorMsg);
    }
  };

  const viewRide = (id) => {
    navigate(`/ridedetails/${id}`);
  };

  if (loading) return <div className="rides-list-wrapper">Loading...</div>;

  return (
    <div className="rides-list-wrapper">
      <div className="rides-header">
        <h2>My Rides</h2>
        <button className="btn-primary1" onClick={() => navigate("/offer")}>
          Offer New Ride
        </button>
      </div>

      {/* Tabs */}
      <div className="rides-tabs">
        <button
          className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          <Clock size={18} />
          Upcoming ({upcomingRides.length})
        </button>
        <button
          className={`tab-button ${activeTab === "past" ? "active" : ""}`}
          onClick={() => setActiveTab("past")}
        >
          <History size={18} />
          Past ({pastRides.length})
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {rides.length === 0 ? (
        <div className="empty-state">
          <p className="empty-text">You haven't offered any rides yet.</p>
          <button className="btn-primary1" onClick={() => navigate("/offer")}>
            Offer Your First Ride
          </button>
        </div>
      ) : (
        <div className="rides-grid">
          {rides.map((ride) => (
            <div className="ride-card" key={ride.id}>
              <div className="ride-card-header">
                <MapPin className="icon" />
                <h3>
                  {ride.startLocation} → {ride.endLocation}
                </h3>
              </div>

              <div className="ride-info">
                <div className="info-item">
                  <Calendar className="icon" />
                  <span>{ride.date} • {ride.time}</span>
                </div>

                <div className="info-item">
                  <Users className="icon" />
                  <span>{ride.availableSeats} seat(s) available</span>
                </div>

                <div className="info-item price">
                  <IndianRupee className="icon" />
                  <span>₹{ride.price} per seat</span>
                </div>

                {bookingsMap[ride.id] && (
                  <div className="info-item bookings-info">
                    <UserCheck className="icon" />
                    <span>
                      {bookingsMap[ride.id].activeBookingsCount || 0} active booking(s) • 
                      {" "}{bookingsMap[ride.id].totalBookings || 0} total
                    </span>
                  </div>
                )}
              </div>

              {/* Bookings Section */}
              {bookingsMap[ride.id] && bookingsMap[ride.id].activeBookings && bookingsMap[ride.id].activeBookings.length > 0 && (
                <div className="bookings-section">
                  <button
                    className="bookings-toggle"
                    onClick={() => toggleBookings(ride.id)}
                  >
                    {expandedRides[ride.id] ? (
                      <>
                        <ChevronUp size={18} /> Hide Bookings
                      </>
                    ) : (
                      <>
                        <ChevronDown size={18} /> Show Bookings ({bookingsMap[ride.id].activeBookings.length})
                      </>
                    )}
                  </button>

                  {expandedRides[ride.id] && (
                    <div className="bookings-list">
                      {bookingsMap[ride.id].activeBookings.map((booking) => (
                        <div key={booking.id} className="booking-item">
                          <div className="booking-passenger">
                            <UserCheck size={16} />
                            <div>
                              <strong>{booking.user?.name || "Passenger"}</strong>
                              <span className="booking-details">
                                {booking.seatsBooked} seat(s) • ₹{(ride.price * booking.seatsBooked).toFixed(2)} • {booking.paymentMode}
                              </span>
                            </div>
                          </div>
                          <div className="passenger-actions">
                            {booking.user?.phone && (
                              <a href={`tel:${booking.user.phone}`} className="contact-passenger">
                                Call
                              </a>
                            )}
                            <button
                              className="chat-passenger-btn"
                              onClick={() => setChatModal({
                                rideId: ride.id,
                                otherUser: booking.user
                              })}
                            >
                              <MessageCircle size={14} /> Chat
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="ride-actions">
                <button
                  className="btn-view"
                  onClick={() => viewRide(ride.id)}
                  title="View Details"
                >
                  <Eye /> View
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => cancelRide(ride.id)}
                  title="Cancel Ride (Refunds all passengers)"
                >
                  <XCircle /> Cancel
                </button>
                <button
                  className="btn-delete"
                  onClick={() => deleteRide(ride.id)}
                  title="Delete Ride (Only if no bookings)"
                >
                  <Trash2 /> Delete
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
