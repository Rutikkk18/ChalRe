// src/pages/BookingPage.jsx
import { CreditCard, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "../styles/booking.css";

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const noSeatsLeft = ride && Number(ride.availableSeats) <= 0;

  useEffect(() => {
    fetchRide();
  }, []);

  const fetchRide = async () => {
    try {
      const res = await api.get(`/rides/${id}`);
      setRide(res.data);
      if (Number(res.data?.availableSeats) <= 0) {
        setSeats(0);
        setError("No seats available for this ride.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load ride details.");
    }
  };

  const handleBookRide = async () => {
    if (!ride) return;

    if (noSeatsLeft) {
      setError("No seats available for this ride.");
      return;
    }

    if (seats < 1) {
      setError("Please select at least 1 seat.");
      return;
    }

    if (seats > ride.availableSeats) {
      setError(`Only ${ride.availableSeats} seat(s) left for this ride.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (paymentMethod === "CASH") {
        const res = await api.post("/bookings/create", {
          rideId: Number(ride.id),
          seats: Number(seats),
          paymentMethod: "CASH"
        });
        navigate(`/booking/success/${res.data.id}`);
      } else {
        const totalAmount = Math.round(ride.price * seats);
        const upiRes = await api.post("/payments/initiate-upi", {
          rideId: Number(ride.id),
          amount: totalAmount
        });

        const { upiId, amount } = upiRes.data;

        if (!upiId) {
          setError("Driver has not added UPI ID.");
          setLoading(false);
          return;
        }

        const upiUrl = `upi://pay?pa=${upiId}&pn=Ride%20Driver&am=${amount}&cu=INR`;
        window.location.href = upiUrl;

        const bookingRes = await api.post("/bookings/create", {
          rideId: Number(ride.id),
          seats: Number(seats),
          paymentMethod: "ONLINE"
        });
        navigate(`/booking/success/${bookingRes.data.id}`);
      }
    } catch (err) {
      console.error(err);
      let errorMessage =
        paymentMethod === "CASH" ? "Booking failed." : "Failed to initiate payment.";
      if (err.response?.data) {
        errorMessage =
          err.response.data.message ||
          err.response.data.error ||
          err.response.data;
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const getCity = (fullLocation) => {
    if (!fullLocation) return "";
    return fullLocation.split(",")[0].trim();
  };

  if (!ride) {
    return (
      <div className="booking-wrapper">
        <div className="booking-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <span style={{ fontFamily: "'Sora', sans-serif", color: "#6b7280", fontSize: "0.9rem" }}>Loading ride details…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-wrapper">
      <div className="booking-card">

        {/* ── LEFT PANEL — Ride Summary ── */}
        <div className="booking-left">
          <div>
            <div className="booking-left-label">Your Journey</div>
            <h2>Confirm Your Booking</h2>
          </div>

          {/* Route */}
          <div className="booking-route">
            <div>
              <div className="booking-route-city">{getCity(ride.startLocation)}</div>
              <div className="booking-route-addr">{ride.startLocation}</div>
            </div>

            <div className="booking-route-line">
              <div className="booking-route-dot" />
              <div className="booking-route-track" />
              <div className="booking-route-dot" />
            </div>

            <div>
              <div className="booking-route-city">{getCity(ride.endLocation)}</div>
              <div className="booking-route-addr">{ride.endLocation}</div>
            </div>
          </div>

          {/* Meta pills */}
          <div className="booking-meta-grid">
            <div className="booking-meta-pill">
              <div className="booking-meta-pill-label">Date</div>
              <div className="booking-meta-pill-val">{ride.date}</div>
            </div>
            <div className="booking-meta-pill">
              <div className="booking-meta-pill-label">Departure</div>
              <div className="booking-meta-pill-val">{ride.time}</div>
            </div>
            <div className="booking-meta-pill">
              <div className="booking-meta-pill-label">Seats Left</div>
              <div className="booking-meta-pill-val">{ride.availableSeats}</div>
            </div>
            <div className="booking-meta-pill">
              <div className="booking-meta-pill-label">Vehicle</div>
              <div className="booking-meta-pill-val">{ride.carType || "Car"}</div>
            </div>
          </div>

          {/* Price per seat */}
          <div className="booking-price-highlight">
            <div>
              <div className="booking-price-highlight-label">Price per seat</div>
              <div className="booking-price-highlight-per">× {seats} seat{seats !== 1 ? "s" : ""}</div>
            </div>
            <div>
              <div className="booking-price-highlight-val">₹{(ride.price * seats).toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — Form ── */}
        <div className="booking-right">
          <div>
            <div className="booking-right-title">Book Your Seat</div>
            <div className="booking-right-sub">Select seats and payment — it only takes a moment.</div>
          </div>

          {/* Seats */}
          <div className="form-section">
            <label htmlFor="seat-input">Number of Seats</label>
            <input
              id="seat-input"
              type="number"
              min="1"
              max={ride.availableSeats}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              disabled={noSeatsLeft}
            />
          </div>

          {/* Total */}
          <div className="booking-total-row">
            <span className="booking-total-label">Total Amount</span>
            <span className="booking-total-val">₹{(ride.price * seats).toFixed(2)}</span>
          </div>

          {/* Payment method */}
          <div className="payment-section-label">Payment Method</div>
          <div className="payment-options">
            <label className={`payment-option ${paymentMethod === "CASH" ? "selected" : ""}`}>
              <input
                type="radio"
                value="CASH"
                checked={paymentMethod === "CASH"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="payment-option-text">
                <IndianRupee size={17} /> Pay with Cash
              </span>
            </label>

            <label className={`payment-option ${paymentMethod === "ONLINE" ? "selected" : ""}`}>
              <input
                type="radio"
                value="ONLINE"
                checked={paymentMethod === "ONLINE"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="payment-option-text">
                <CreditCard size={17} /> Online Payment
              </span>
            </label>
          </div>

          {error && <div className="error">{error}</div>}

          <button
            className="btn-primary"
            onClick={handleBookRide}
            disabled={loading || noSeatsLeft}
          >
            {loading
              ? "Processing…"
              : paymentMethod === "CASH"
              ? "Confirm Booking"
              : "Proceed to Pay"}
          </button>
        </div>

      </div>
    </div>
  );
}