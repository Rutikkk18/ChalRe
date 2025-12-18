// src/pages/BookingSuccess.jsx
import { useEffect, useState } from "react";
import { CheckCircle, MapPin, Calendar, Users, IndianRupee, User, Phone } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "../styles/bookingSuccess.css";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const { id } = useParams(); // bookingId
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      // Get booking from my bookings list
      const res = await api.get("/bookings/my");
      const found = res.data.find(b => b.id.toString() === id);
      if (found) {
        setBooking(found);
      }
    } catch (err) {
      console.error("Failed to fetch booking:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="success-wrapper">
      <div className="success-card">
        <CheckCircle className="success-icon" />

        <h2>Booking Confirmed!</h2>
        <p>Your seat has been successfully booked and confirmed.</p>

        {booking && (
          <div className="booking-details">
            <h3>Booking Details</h3>
            
            <div className="detail-section">
              <div className="detail-item">
                <MapPin size={18} />
                <div>
                  <span className="label">Route</span>
                  <span className="value">{booking.ride.startLocation} → {booking.ride.endLocation}</span>
                </div>
              </div>

              <div className="detail-item">
                <Calendar size={18} />
                <div>
                  <span className="label">Date & Time</span>
                  <span className="value">{booking.ride.date} • {booking.ride.time}</span>
                </div>
              </div>

              <div className="detail-item">
                <Users size={18} />
                <div>
                  <span className="label">Seats Booked</span>
                  <span className="value">{booking.seatsBooked} seat(s)</span>
                </div>
              </div>

              <div className="detail-item">
                <IndianRupee size={18} />
                <div>
                  <span className="label">Total Amount</span>
                  <span className="value">₹{(booking.ride.price * booking.seatsBooked).toFixed(2)}</span>
                </div>
              </div>

              {booking.ride.driver && (
                <div className="detail-item">
                  <User size={18} />
                  <div>
                    <span className="label">Driver</span>
                    <span className="value">{booking.ride.driver.name || "Driver"}</span>
                    {booking.ride.driver.phone && (
                      <a href={`tel:${booking.ride.driver.phone}`} className="driver-phone">
                        <Phone size={14} /> {booking.ride.driver.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="status-badges">
                <div className="status-badge booked">
                  <CheckCircle size={16} />
                  <span>Booking: {booking.status}</span>
                </div>
                <div className={`status-badge ${booking.paymentStatus.toLowerCase()}`}>
                  <span>Payment: {
                    booking.paymentStatus === "PAID" ? "✓ Paid" : 
                    booking.paymentStatus === "PENDING" ? "Pending (Cash)" :
                    booking.paymentStatus === "REFUNDED" ? "✓ Refunded" : 
                    booking.paymentStatus
                  }</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {id && (
          <p className="booking-id" style={{ marginTop: "1rem" }}>
            Booking ID: <strong>{id}</strong>
          </p>
        )}

        <div className="action-buttons">
          {booking && (
            <button className="btn-primary" onClick={() => navigate(`/mybookings#booking-${booking.id}`)}>
              View This Booking
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate("/mybookings")}>
            View All Bookings
          </button>
          <button className="btn-outline" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
