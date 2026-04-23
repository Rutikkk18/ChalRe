// src/pages/BookingPage.jsx
import { CreditCard, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/axios";
import "../styles/booking.css";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();

  const navState     = location.state || {};
  const pickupCoords = navState.pickupCoords || null;
  const dropCoords   = navState.dropCoords   || null;
  const pickupName   = navState.pickupName   || null;
  const dropName     = navState.dropName     || null;

  const [ride,      setRide]      = useState(null);
  const [seats,     setSeats]     = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [priceInfo, setPriceInfo] = useState(null);

  const noSeatsLeft    = ride && Number(ride.availableSeats) <= 0;
  const isPartialRoute = priceInfo?.isPartial && pickupName && dropName;

  const pickupCity = pickupName?.split(",")[0]?.trim() || "";
  const dropCity   = dropName?.split(",")[0]?.trim()   || "";
  const startCity  = ride?.startLocation?.split(",")[0]?.trim() || "";
  const endCity    = ride?.endLocation?.split(",")[0]?.trim()   || "";

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

  useEffect(() => {
    if (ride && pickupCoords?.lat && dropCoords?.lat) {
      fetchCalculatedPrice();
    }
    // eslint-disable-next-line
  }, [ride]);

  const fetchCalculatedPrice = async () => {
    try {
      const res = await api.get(`/rides/${id}/calculate-price`, {
        params: {
          pickupLat: parseFloat(pickupCoords.lat),
          pickupLng: parseFloat(pickupCoords.lng),
          dropLat:   parseFloat(dropCoords.lat),
          dropLng:   parseFloat(dropCoords.lng),
        }
      });
      setPriceInfo(res.data);
    } catch (e) {
      console.error("Price calc failed:", e);
    }
  };

  const effectivePrice = () => {
    if (!ride) return 0;
    return priceInfo?.calculatedPrice ?? ride.price;
  };

  const handleBookRide = async () => {
    if (!ride)       return;
    if (noSeatsLeft) { setError("No seats available.");            return; }
    if (seats < 1)   { setError("Please select at least 1 seat."); return; }
    if (seats > ride.availableSeats) {
      setError(`Only ${ride.availableSeats} seat(s) left.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const basePrice  = priceInfo?.calculatedPrice ?? ride.price;
      const totalPaise = Math.round(basePrice * seats * 100);

      const configRes   = await api.get("/payments/config");
      const razorpayKey = configRes.data.key;

      if (!razorpayKey || !razorpayKey.startsWith("rzp_")) {
        setError("Invalid payment configuration.");
        setLoading(false);
        return;
      }

      const orderRes = await api.post("/payments/create-order", {
        rideId: Number(ride.id),
        amount: totalPaise
      });

      const { orderId, amount, currency } = orderRes.data;

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError("Failed to load payment gateway. Check your connection.");
        setLoading(false);
        return;
      }

      const options = {
        key:         razorpayKey,
        amount:      amount,
        currency:    currency || "INR",
        name:        "Chalre",
        description: `Ride: ${ride.startLocation} → ${ride.endLocation}`,
        order_id:    orderId,
        handler: async function (response) {
          try {
            await api.post("/payments/verify", {
              rideId:            Number(ride.id),
              amount:            totalPaise,
              seats:             Number(seats),
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            navigate(`/booking/success/online`);
          } catch (err) {
            const msg = err.response?.data ||
              "Payment verification failed. Contact support if amount was deducted.";
            setError(typeof msg === "string" ? msg : JSON.stringify(msg));
            setLoading(false);
          }
        },
        prefill: { name: "", email: "", contact: "" },
        notes: { rideId: ride.id.toString(), seats: seats.toString() },
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
        msg?.message || msg?.error || "Payment initiation failed."
      );
      setLoading(false);
    }
  };

  if (!ride) return (
    <div className="booking-wrapper">
      <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
        Loading ride details…
      </span>
    </div>
  );

  return (
    <div className="booking-wrapper">
      <div className="booking-card">

        {/* ── LEFT PANEL ── */}
        <div className="booking-left">
          <div className="booking-left-header">
            <div className="booking-left-label">Your Journey</div>
            <h2>Confirm Your Booking</h2>
          </div>

          {/* ── Route: 3-point if partial, 2-point if full ── */}
          <div className="booking-route">

            {/* Start location — always show */}
            <div>
              <div className="booking-route-city"
                style={{ color: isPartialRoute ? "rgba(255,255,255,0.45)" : "#ffffff",
                         fontSize: isPartialRoute ? "1rem" : undefined }}>
                {startCity}
              </div>
              <div className="booking-route-addr">{ride.startLocation}</div>
            </div>

            {/* Line segment: start → pickup (dashed if partial) */}
            <div className="booking-route-line">
              <div className="booking-route-dot"
                style={{ background: isPartialRoute ? "rgba(34,197,94,0.35)" : undefined,
                         boxShadow: isPartialRoute ? "none" : undefined }} />
              <div className="booking-route-track"
                style={{ background: isPartialRoute
                  ? "linear-gradient(to right, rgba(34,197,94,0.3), rgba(34,197,94,0.15))"
                  : undefined,
                  borderTop: isPartialRoute ? "1.5px dashed rgba(34,197,94,0.4)" : undefined,
                  height: isPartialRoute ? "0" : undefined }} />
              {isPartialRoute && (
                <div className="booking-route-dot"
                  style={{ background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.35)" }} />
              )}
              {!isPartialRoute && (
                <div className="booking-route-dot" />
              )}
            </div>

            {/* Boarding point — only if partial */}
            {isPartialRoute && (
              <div style={{ marginBottom: "4px" }}>
                <div style={{
                  display: "inline-block",
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  color: "#22c55e",
                  letterSpacing: "0.5px",
                  marginBottom: "3px",
                  textTransform: "uppercase"
                }}>
                  🟢 Your boarding point
                </div>
                <div className="booking-route-city" style={{ fontSize: "1.25rem" }}>
                  {pickupCity}
                </div>
                <div className="booking-route-addr">{pickupName}</div>
              </div>
            )}

            {/* Line segment: pickup → end (solid) */}
            {isPartialRoute && (
              <div className="booking-route-line">
                <div className="booking-route-dot"
                  style={{ background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.35)" }} />
                <div className="booking-route-track" />
                <div className="booking-route-dot" />
              </div>
            )}

            {/* End location — always show */}
            <div>
              <div className="booking-route-city">{endCity}</div>
              <div className="booking-route-addr">{ride.endLocation}</div>
            </div>
          </div>

          {/* Meta grid */}
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

          {/* ── Price highlight ── */}
          <div className="booking-price-highlight">
            <div>
              <div className="booking-price-highlight-label">
                {isPartialRoute ? `${pickupCity} → ${dropCity}` : `${startCity} → ${endCity}`}
              </div>
              {isPartialRoute && (
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginTop: "3px" }}>
                  {priceInfo.partialDistance}km of {priceInfo.fullDistance}km · full fare ₹{priceInfo.fullPrice}
                </div>
              )}
              <div className="booking-price-highlight-per">
                × {seats} seat{seats !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="booking-price-highlight-val">
                ₹{(effectivePrice() * seats).toFixed(0)}
              </div>
              {isPartialRoute && seats > 1 && (
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginTop: "3px" }}>
                  ₹{priceInfo.calculatedPrice} × {seats}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="booking-right">
          <div>
            <div className="booking-right-title">Book Your Seat</div>
            <div className="booking-right-sub">
              Select seats and pay — it only takes a moment.
            </div>
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
            <span className="booking-total-val">
              ₹{(effectivePrice() * seats).toFixed(2)}
            </span>
          </div>

          {/* ── Online only ── */}
          <div className="payment-section-label">Payment Method</div>
          <div className="payment-options">
            <label className="payment-option selected">
              <input type="radio" value="ONLINE" checked readOnly />
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
            {loading ? "Processing…" : "Proceed to Pay"}
          </button>
        </div>

      </div>
    </div>
  );
}