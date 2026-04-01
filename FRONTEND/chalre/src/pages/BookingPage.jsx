// src/pages/BookingPage.jsx
import { CreditCard, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "../styles/booking.css";

// Load Razorpay script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const noSeatsLeft = ride && Number(ride.availableSeats) <= 0;

  useEffect(() => { fetchRide(); }, []);

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
    if (noSeatsLeft) { setError("No seats available."); return; }
    if (seats < 1) { setError("Please select at least 1 seat."); return; }
    if (seats > ride.availableSeats) {
      setError(`Only ${ride.availableSeats} seat(s) left.`); return;
    }

    setLoading(true);
    setError("");

    try {
      // ── CASH flow (unchanged) ──
      if (paymentMethod === "CASH") {
        const res = await api.post("/bookings/create", {
          rideId: Number(ride.id),
          seats: Number(seats),
          paymentMethod: "CASH"
        });
        navigate(`/booking/success/${res.data.id}`);
        return;
      }

      // ── ONLINE flow — Razorpay escrow ──
      const totalPaise = Math.round(ride.price * seats * 100);

      // STEP 1: Get Razorpay key
      const configRes = await api.get("/payments/config");
      const razorpayKey = configRes.data.key;

      // STEP 2: Create order on backend
      const orderRes = await api.post("/payments/create-order", {
        rideId: Number(ride.id),
        amount: totalPaise
      });

      const { orderId, amount, currency } = orderRes.data;

      // STEP 3: Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError("Failed to load payment gateway. Check your connection.");
        setLoading(false);
        return;
      }

      // STEP 4: Open Razorpay popup
      const options = {
        key: razorpayKey,
        amount: amount,
        currency: currency || "INR",
        name: "Chalre",
        description: `Ride: ${ride.startLocation} → ${ride.endLocation}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // STEP 5: Verify payment + auto create booking
            await api.post("/payments/verify", {
              rideId: Number(ride.id),
              amount: totalPaise,
              seats: Number(seats),
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            navigate(`/booking/success/online`);
          } catch (err) {
            const msg = err.response?.data || "Payment verification failed. Contact support if amount was deducted.";
            setError(typeof msg === "string" ? msg : JSON.stringify(msg));
            setLoading(false);
          }
        },
        prefill: { name: "", email: "", contact: "" },
        notes: {
          rideId: ride.id.toString(),
          seats: seats.toString()
        },
        theme: { color: "#1c7c31" },
        modal: {
          ondismiss: function () {
            setError("Payment cancelled.");
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err) {
      console.error(err);
      const msg = err.response?.data;
      setError(
        typeof msg === "string" ? msg :
        msg?.message || msg?.error ||
        (paymentMethod === "CASH" ? "Booking failed." : "Payment initiation failed.")
      );
      setLoading(false);
    }
  };

  const getCity = (loc) => loc ? loc.split(",")[0].trim() : "";

  if (!ride) return (
    <div className="booking-wrapper">
     
        <span style={{ color:"#6b7280", fontSize:"0.9rem" }}>Loading ride details…</span>
      </div>
    </div>
  );

  return (
    <div className="booking-wrapper">
      <div className="booking-card">

        {/* LEFT PANEL */}
        <div className="booking-left">
          <div className="booking-left-header">
            <div className="booking-left-label">Your Journey</div>
            <h2>Confirm Your Booking</h2>
          </div>

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

        {/* RIGHT PANEL */}
        <div className="booking-right">
          <div>
            <div className="booking-right-title">Book Your Seat</div>
            <div className="booking-right-sub">Select seats and payment — it only takes a moment.</div>
          </div>

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

          <div className="booking-total-row">
            <span className="booking-total-label">Total Amount</span>
            <span className="booking-total-val">₹{(ride.price * seats).toFixed(2)}</span>
          </div>

          <div className="payment-section-label">Payment Method</div>
          <div className="payment-options">
            <label className={`payment-option ${paymentMethod === "CASH" ? "selected" : ""}`}>
              <input type="radio" value="CASH"
                checked={paymentMethod === "CASH"}
                onChange={(e) => setPaymentMethod(e.target.value)} />
              <span className="payment-option-text">
                <IndianRupee size={17} /> Pay with Cash
              </span>
            </label>
            <label className={`payment-option ${paymentMethod === "ONLINE" ? "selected" : ""}`}>
              <input type="radio" value="ONLINE"
                checked={paymentMethod === "ONLINE"}
                onChange={(e) => setPaymentMethod(e.target.value)} />
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
            {loading ? "Processing…" : paymentMethod === "CASH" ? "Confirm Booking" : "Proceed to Pay"}
          </button>
        </div>

      </div>
    </div>
  );
}