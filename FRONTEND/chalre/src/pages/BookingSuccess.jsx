// src/pages/BookingSuccess.jsx
import { useEffect, useState } from "react";
import { CheckCircle, MapPin, Calendar, Users, IndianRupee, User, Phone } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "../styles/bookingSuccess.css";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && id !== "online") {
      fetchBookingById();
    } else if (id === "online") {
      fetchLatestOnlineBooking();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchBookingById = async () => {
    try {
      const res = await api.get("/bookings/my");
      const found = res.data.find(b => b.id.toString() === id);
      if (found) setBooking(found);
    } catch (err) {
      console.error("Failed to fetch booking:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestOnlineBooking = async () => {
    try {
      const res = await api.get("/bookings/my");
      const onlineBookings = res.data.filter(
        b => b.paymentMethod === "ONLINE" && b.status === "BOOKED"
      );
      if (onlineBookings.length > 0) {
        const latest = onlineBookings.sort((a, b) => b.id - a.id)[0];
        setBooking(latest);
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

        {/* LEFT PANEL */}
        <div className="success-left">
          <CheckCircle className="success-icon" />
          <div className="success-left-tag">Booking Confirmed</div>
          <h2>You're all set for your ride!</h2>
          <p className="success-left-sub">
            Your seat has been reserved. Safe travels!
          </p>
          {booking?.id && (
            <div className="success-id-pill">
              <div className="success-id-pill-label">Booking Reference</div>
              <div className="success-id-pill-val">#{booking.id}</div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="success-right">
          <div className="success-right-title">Booking Details</div>

          {loading ? (
            <p style={{ color: "#6b7280", fontSize: "0.88rem" }}>Loading details…</p>
          ) : booking ? (
            <div className="booking-details">
              <div className="detail-section">

                <div className="detail-item">
                  <MapPin size={18} />
                  <div>
                    <span className="label">Route</span>
                    <span className="value">
                      {booking.ride.startLocation} → {booking.ride.endLocation}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <Calendar size={18} />
                  <div>
                    <span className="label">Date &amp; Time</span>
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
                    <span className="value">
                      ₹{(booking.ride.price * booking.seatsBooked).toFixed(2)}
                    </span>
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
                    <CheckCircle size={13} />
                    <span>Booking: {booking.status}</span>
                  </div>
                  <div className={`status-badge ${booking.paymentStatus?.toLowerCase()}`}>
                    <span>
                      Payment:{" "}
                      {booking.paymentStatus === "PAID" ? "✓ Paid"
                        : booking.paymentStatus === "PENDING" ? "Pending (Cash)"
                        : booking.paymentStatus === "REFUNDED" ? "✓ Refunded"
                        : booking.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Simple info message for online payments */}
                {booking.paymentMethod === "ONLINE" && (
                  <div style={{
                    marginTop: "1rem",
                    padding: "0.65rem 0.75rem",
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    color: "#166534"
                  }}>
                    ℹ️ After the ride, go to <strong>My Bookings</strong> to confirm ride completion and release payment to driver.
                  </div>
                )}

              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontSize: "0.88rem" }}>
              Booking details not found.
            </p>
          )}

          <div className="action-buttons">
            <button className="btn-primary" onClick={() => navigate("/mybookings")}>
              View My Bookings
            </button>
            <button className="btn-outline" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}