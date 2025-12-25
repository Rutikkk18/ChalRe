// src/pages/BookingPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import loadRazorpay from "../utils/loadRazorpay";
import "../styles/booking.css";
import { CreditCard, IndianRupee } from "lucide-react";

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

    // Validate seats
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
        // CASH payment: Book directly without payment
        // Explicitly do NOT include paymentId
        const res = await api.post("/bookings/create", {
          rideId: Number(ride.id),
          seats: Number(seats),
          paymentMethod: "CASH"
          // paymentId is intentionally omitted for CASH payments
        });

        const bookingId = res?.data?.id;
        navigate(`/booking/success/${bookingId}`);
      } else {
        // ONLINE payment: Create Razorpay order and open checkout
        const totalCostPaise = Math.round(ride.price * seats * 100);

        // Create Razorpay order
        const orderRes = await api.post("/payments/order", {
          rideId: Number(ride.id),
          amountPaise: totalCostPaise
        });

        // Validate response
        if (!orderRes.data || !orderRes.data.orderId || !orderRes.data.key) {
          setError("Invalid response from payment server. Please try again.");
          setLoading(false);
          return;
        }

        // REFACTORED: No paymentId in response - payment record will be created after verification
        const { orderId, amount, key, currency } = orderRes.data;

        // Debug logging (remove in production)
        console.log("🔍 Razorpay Order Details:");
        console.log("   Order ID:", orderId);
        console.log("   Amount:", amount, "paise (₹" + (amount / 100).toFixed(2) + ")");
        console.log("   Key:", key.substring(0, 15) + "...");
        console.log("   Currency:", currency || "INR");
        console.log("   Note: Payment record will be created after successful payment");

        // Validate key format
        if (!key.startsWith("rzp_")) {
          setError("Invalid Razorpay key format. Please contact support.");
          setLoading(false);
          return;
        }

        // Load Razorpay script
        const razorpayLoaded = await loadRazorpay();
        if (!razorpayLoaded) {
          setError("Failed to load Razorpay. Please check your internet connection.");
          setLoading(false);
          return;
        }

        // Validate Razorpay is available
        if (!window.Razorpay) {
          setError("Razorpay SDK not loaded. Please refresh the page.");
          setLoading(false);
          return;
        }

        // Open Razorpay checkout
        const options = {
          key: key, // Key from backend (must match the key used to create order)
          amount: amount, // Amount in paise (must match order amount)
          currency: currency || "INR",
          name: "Ride Booking",
          description: `Ride from ${ride.startLocation} to ${ride.endLocation}`,
          order_id: orderId, // Order ID from backend (must match)
          handler: async function (response) {
            // REFACTORED: Collect payment details AFTER successful payment
            console.log("✅ Payment successful:", response);
            
            try {
              // Step 1: Verify payment and create payment record
              // Backend will verify signature FIRST, then create payment record
              const verifyRes = await api.post("/payments/verify", {
                rideId: Number(ride.id),
                amountPaise: totalCostPaise, // Send amount for validation
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });

              console.log("✅ Payment verified and record created:", verifyRes.data);
              
              // Extract paymentId from verification response (created after verification)
              const paymentId = verifyRes.data.id;

              // Step 2: Create booking with verified payment
              const bookingRes = await api.post("/bookings/create", {
                rideId: Number(ride.id),
                seats: Number(seats),
                paymentMethod: "ONLINE",
                paymentId: paymentId // Use paymentId from verification response
              });

              navigate(`/booking/success/${bookingRes.data.id}`);
            } catch (err) {
              console.error("❌ Payment verification failed:", err);
              const errorMsg = err.response?.data || err.message || "Payment verification failed";
              setError(`Payment verification failed: ${errorMsg}. Please contact support if amount was deducted.`);
              setLoading(false);
            }
          },
          prefill: {
            name: "",
            email: "",
            contact: ""
          },
          notes: {
            rideId: ride.id.toString(),
            seats: seats.toString()
          },
          theme: {
            color: "#1c7c31"
          },
          modal: {
            ondismiss: function() {
              console.log("⚠️ Payment modal dismissed by user");
              setLoading(false);
            }
          }
        };

        // Add error handler for Razorpay checkout
        options.handler_error = function(error) {
          console.error("❌ Razorpay checkout error:", error);
          setLoading(false);
          
          let errorMessage = "Payment failed. ";
          if (error.error) {
            if (error.error.code === "BAD_REQUEST_ERROR") {
              errorMessage += "Invalid payment details. Please try again.";
            } else if (error.error.description) {
              errorMessage += error.error.description;
            } else {
              errorMessage += error.error.reason || "Unknown error";
            }
          } else {
            errorMessage += "Please try again or contact support.";
          }
          
          setError(errorMessage);
        };

        try {
          const razorpay = new window.Razorpay(options);
          razorpay.open();
        } catch (err) {
          console.error("❌ Failed to open Razorpay checkout:", err);
          setError("Failed to open payment gateway. Please try again.");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      
      // Handle error response
      let errorMessage = paymentMethod === "CASH" 
        ? "Booking failed." 
        : "Failed to initiate payment.";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (typeof errorData === 'object' && errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
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

        {/* Payment Method Selection */}
        <div className="form-row">
          <label>Payment Method</label>
          <div className="payment-options">
            <label className={`payment-option ${paymentMethod === "CASH" ? "selected" : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="CASH"
                checked={paymentMethod === "CASH"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div>
                <div className="payment-label">
                  <IndianRupee size={18} /> Pay with Cash
                </div>
                <div className="payment-note">Pay directly to driver</div>
              </div>
            </label>
            
            <label className={`payment-option ${paymentMethod === "ONLINE" ? "selected" : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="ONLINE"
                checked={paymentMethod === "ONLINE"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div>
                <div className="payment-label">
                  <CreditCard size={18} /> Online Payment
                </div>
                <div className="payment-note">Pay securely online</div>
              </div>
            </label>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleBookRide}
          disabled={loading || noSeatsLeft}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
        >
          {loading ? (
            "Processing..."
          ) : paymentMethod === "CASH" ? (
            "Book Ride"
          ) : (
            <>
              <CreditCard size={18} />
              Proceed to Pay
            </>
          )}
        </button>
      </div>
    </div>
  );
}
