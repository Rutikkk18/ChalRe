// src/pages/BookingPage.jsx
import { CreditCard, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "../styles/booking.css";

export default function BookingPage() {
  const { id } = useParams(); // rideId
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
      /* ================= CASH ================= */
      if (paymentMethod === "CASH") {
        const res = await api.post("/bookings/create", {
          rideId: Number(ride.id),
          seats: Number(seats),
          paymentMethod: "CASH"
        });

        navigate(`/booking/success/${res.data.id}`);
      }

      /* ================= ONLINE (DIRECT UPI) ================= */
      else {
        // Total amount in rupees
        const totalAmount = Math.round(ride.price * seats);

        // 1️⃣ Ask backend for UPI details
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

        // 2️⃣ Open UPI intent (same flow as Razorpay button click)
        const upiUrl = `upi://pay?pa=${upiId}&pn=Ride%20Driver&am=${amount}&cu=INR`;
        window.location.href = upiUrl;

        // 3️⃣ Create booking (Phase-1 assumption: user paid)
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
        paymentMethod === "CASH"
          ? "Booking failed."
          : "Failed to initiate payment.";

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

  if (!ride) return <div className="booking-wrapper">Loading ride...</div>;

  return (
    <div className="booking-wrapper">
      <div className="booking-card">
        <h2>Confirm Your Booking</h2>

        <div className="ride-summary">
          <h3>{ride.startLocation} → {ride.endLocation}</h3>
          <p>{ride.date} • {ride.time}</p>
        </div>

        <div className="form-row">
          <label>Seats</label>
          <input
            type="number"
            min="1"
            max={ride.availableSeats}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            disabled={noSeatsLeft}
          />
        </div>

        <div className="price-box">
          <p>Price per seat: ₹{ride.price}</p>
          <h3>Total: ₹{(ride.price * seats).toFixed(2)}</h3>
        </div>

        <div className="form-row">
          <label>Payment Method</label>
          <div className="payment-options">
            <label className={`payment-option ${paymentMethod === "CASH" ? "selected" : ""}`}>
              <input
                type="radio"
                value="CASH"
                checked={paymentMethod === "CASH"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <IndianRupee size={18} /> Pay with Cash
            </label>

            <label className={`payment-option ${paymentMethod === "ONLINE" ? "selected" : ""}`}>
              <input
                type="radio"
                value="ONLINE"
                checked={paymentMethod === "ONLINE"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <CreditCard size={18} /> Online Payment
            </label>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleBookRide}
          disabled={loading || noSeatsLeft}
        >
          {loading ? "Processing..." : paymentMethod === "CASH" ? "Book Ride" : "Proceed to Pay"}
        </button>
      </div>
    </div>
  );
}
