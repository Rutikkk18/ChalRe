// src/pages/BookingPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/booking.css";
import { Wallet, IndianRupee } from "lucide-react";

export default function BookingPage() {
  const { id } = useParams(); // rideId
  const navigate = useNavigate();

  
  const [ride, setRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [paymentMode, setPaymentMode] = useState("WALLET");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const noSeatsLeft = ride && Number(ride.availableSeats) <= 0;

  useEffect(() => {
    fetchRide();
    fetchWalletBalance();
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

  const fetchWalletBalance = async () => {
    try {
      const res = await api.get("/wallet");
      setWalletBalance((res.data.balance || 0) / 100); // Convert paise to rupees
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      // Don't set error, wallet might not exist yet
    }
  };

  const handleBooking = async () => {
    if (!ride) return;

    if (noSeatsLeft) {
      setError("No seats available for this ride.");
      return;
    }

    // Validate seats
    if (seats < 1) {
      setError("Please select at least 1 seat.");
      return;
    }

    if (seats > ride.availableSeats) {
      setError(`Only ${ride.availableSeats} seat(s) left for this ride.`);
      return;
    }

    // Validate wallet balance if paying with wallet
    const totalCost = ride.price * seats;
    if (paymentMode === "WALLET" && walletBalance < totalCost) {
      setError(`Insufficient wallet balance. You need ₹${totalCost.toFixed(2)} but have ₹${walletBalance.toFixed(2)}. Please add money to wallet or choose cash payment.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/bookings/create", {
        rideId: Number(ride.id),  // Ensure it's a number
        seats: Number(seats),     // Ensure it's a number
        paymentMode: paymentMode  // User-selected payment mode
      });

      const bookingId = res?.data?.id;

      navigate(`/booking/success/${bookingId}`);
    } catch (err) {
      console.error(err);
      
      // Handle error response - extract message from object if needed
      let errorMessage = "Booking failed.";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // If error is an object (from GlobalExceptionHandler), extract the error message
        if (typeof errorData === 'object' && errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      setError(errorMessage);
    } finally {
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

        {/* Payment Method Selection */}
        <div className="form-row">
          <label>Payment Method</label>
          <div className="payment-options">
            <label className={`payment-option ${paymentMode === "WALLET" ? "selected" : ""} ${walletBalance < (ride.price * seats) ? "disabled" : ""}`}>
              <input
                type="radio"
                name="paymentMode"
                value="WALLET"
                checked={paymentMode === "WALLET"}
                onChange={(e) => setPaymentMode(e.target.value)}
                disabled={walletBalance < (ride.price * seats)}
              />
              <div>
                <div className="payment-label">
                  <Wallet size={18} /> Pay with Wallet
                </div>
                <div className="payment-balance">
                  Balance: ₹{walletBalance.toFixed(2)}
                  {walletBalance < (ride.price * seats) && (
                    <span className="insufficient"> (Insufficient)</span>
                  )}
                </div>
              </div>
            </label>
            
            <label className={`payment-option ${paymentMode === "CASH" ? "selected" : ""}`}>
              <input
                type="radio"
                name="paymentMode"
                value="CASH"
                checked={paymentMode === "CASH"}
                onChange={(e) => setPaymentMode(e.target.value)}
              />
              <div>
                <div className="payment-label">
                  <IndianRupee size={18} /> Pay with Cash
                </div>
                <div className="payment-note">Pay directly to driver</div>
              </div>
            </label>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleBooking}
          disabled={
            loading ||
            noSeatsLeft ||
            (paymentMode === "WALLET" && walletBalance < (ride.price * seats))
          }
        >
          {loading ? "Processing..." : "Confirm Booking"}
        </button>
        
        {paymentMode === "WALLET" && walletBalance < (ride.price * seats) && (
          <button
            className="btn-secondary"
            onClick={() => navigate("/wallet")}
            style={{ marginTop: "0.5rem", width: "100%" }}
          >
            Add Money to Wallet
          </button>
        )}
      </div>
    </div>
  );
}
