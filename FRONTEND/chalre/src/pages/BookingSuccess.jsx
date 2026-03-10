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
    if (id) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchBookingDetails = async () => {
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

  return (
    <div className="success-wrapper">
      <div className="success-card">

        {/* ── LEFT PANEL — Celebration ── */}
        <div className="success-left">
          <CheckCircle className="success-icon" />

          <div className="success-left-tag">Booking Confirmed</div>

          <h2>You're all set for your ride!</h2>

          <p className="success-left-sub">
            Your seat has been reserved. Safe travels — we hope you enjoy the journey.
          </p>

          {id && (
            <div className="success-id-pill">
              <div className="success-id-pill-label">Booking Reference</div>
              <div className="success-id-pill-val">#{id}</div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL — Details + Actions ── */}
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
                    <CheckCircle size={13} />
                    <span>Booking: {booking.status}</span>
                  </div>
                  <div className={`status-badge ${booking.paymentStatus.toLowerCase()}`}>
                    <span>
                      Payment:{" "}
                      {booking.paymentStatus === "PAID"
                        ? "✓ Paid"
                        : booking.paymentStatus === "PENDING"
                        ? "Pending (Cash)"
                        : booking.paymentStatus === "REFUNDED"
                        ? "✓ Refunded"
                        : booking.paymentStatus}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontSize: "0.88rem" }}>
              Booking details not found.
            </p>
          )}

          <div className="action-buttons">
            {booking && (
              <button
                className="btn-primary"
                onClick={() => navigate(`/mybookings#booking-${booking.id}`)}
              >
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
    </div>
  );
}