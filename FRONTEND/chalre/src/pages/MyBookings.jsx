// src/pages/MyBookings.jsx
import { useEffect, useState } from "react";
import api from "../api/axios";
import "../styles/mybookings.css";
import { MapPin, Calendar, Users, IndianRupee, XCircle, Clock, History, Star, MessageCircle } from "lucide-react";
import RatingModal from "../components/RatingModal";
import ChatModal from "../components/ChatModal";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" or "past"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingModal, setRatingModal] = useState(null); // { rideId, driverName }
  const [chatModal, setChatModal] = useState(null); // { rideId, otherUser }
  const [ratedRides, setRatedRides] = useState(new Set()); // Track rated rides

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await api.get("/bookings/my?filter=separated");
      const separatedData = res.data || {};
      setUpcomingBookings(separatedData.upcoming || []);
      setPastBookings(separatedData.past || []);
      setBookings(activeTab === "upcoming" ? (separatedData.upcoming || []) : (separatedData.past || []));
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

  const checkIfRated = async (rideId) => {
    try {
      const res = await api.get(`/ratings/driver/${bookings.find(b => b.ride.id === rideId)?.ride.driver.id}`);
      const ratings = res.data || [];
      return ratings.some(r => r.ride?.id === rideId);
    } catch (err) {
      return false;
    }
  };

  const handleRateClick = (booking) => {
    setRatingModal({
      rideId: booking.ride.id,
      driverName: booking.ride.driver?.name || "Driver"
    });
  };

  const handleRatingSuccess = (rideId) => {
    setRatedRides(prev => new Set([...prev, rideId]));
    loadBookings(); // Refresh to update UI
  };

  const handleChatClick = (booking) => {
    setChatModal({
      rideId: booking.ride.id,
      otherUser: booking.ride.driver
    });
  };

  const cancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await api.delete(`/bookings/${id}`);
      alert("Booking cancelled successfully. If paid via wallet, amount will be refunded.");
      loadBookings();
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to cancel booking.";
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

  if (loading) return <div className="booking-list-wrapper">Loading...</div>;

  return (
    <div className="booking-list-wrapper">
      <h2>My Bookings</h2>

      {/* Tabs */}
      <div className="bookings-tabs">
        <button
          className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          <Clock size={18} />
          Upcoming ({upcomingBookings.length})
        </button>
        <button
          className={`tab-button ${activeTab === "past" ? "active" : ""}`}
          onClick={() => setActiveTab("past")}
        >
          <History size={18} />
          Past ({pastBookings.length})
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {bookings.length === 0 ? (
        <p className="empty-text">You have no bookings yet.</p>
      ) : (
        bookings.map((b) => (
          <div className="booking-card" key={b.id}>
            <div className="booking-header">
              <MapPin />
              <h3>
                {b.ride.startLocation} → {b.ride.endLocation}
              </h3>
            </div>

            <div className="booking-info">
              <div className="info-item">
                <Calendar />
                <span>{b.ride.date} • {b.ride.time}</span>
              </div>

              <div className="info-item">
                <Users />
                <span>{b.seatsBooked} seat(s)</span>
              </div>

              <div className="info-item">
                <IndianRupee />
                <span>₹{(b.ride.price * b.seatsBooked).toFixed(2)}</span>
              </div>

              <div className="info-item">
                <span className="pmode">Payment: {b.paymentMode}</span>
              </div>

              <div className="info-item">
                <span className="booking-status" style={{ 
                  color: b.status === "BOOKED" ? "#059669" : "#dc2626",
                  fontWeight: "600"
                }}>
                  Booking: {b.status === "BOOKED" ? "✓ Confirmed" : "Cancelled"}
                </span>
              </div>

              <div className="info-item">
                <span className={`pstatus ${b.paymentStatus.toLowerCase()}`}>
                  Payment: {b.paymentStatus === "PAID" ? "✓ Paid" : 
                           b.paymentStatus === "PENDING" ? "Pending (Cash)" :
                           b.paymentStatus === "REFUNDED" ? "✓ Refunded" : b.paymentStatus}
                </span>
              </div>
            </div>

            <div className="booking-actions">
              {b.status === "BOOKED" && activeTab === "upcoming" && (
                <>
                  <button
                    className="chat-btn"
                    onClick={() => handleChatClick(b)}
                  >
                    <MessageCircle /> Chat with Driver
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => cancelBooking(b.id)}
                  >
                    <XCircle /> Cancel Booking
                  </button>
                </>
              )}
              
              {activeTab === "past" && b.status === "BOOKED" && !ratedRides.has(b.ride.id) && (
                <button
                  className="rate-btn"
                  onClick={() => handleRateClick(b)}
                >
                  <Star /> Rate Driver
                </button>
              )}
              
              {activeTab === "past" && ratedRides.has(b.ride.id) && (
                <p className="rated-text">✓ Rated</p>
              )}
              
              {b.status === "CANCELLED" && (
                <p className="cancelled-text">Booking Cancelled</p>
              )}
            </div>
          </div>
        ))
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
