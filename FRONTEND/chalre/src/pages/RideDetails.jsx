// src/pages/RideDetails.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import "../styles/rideDetails.css";
import { MapPin, Clock, Users, IndianRupee, Phone, CheckCircle, Star, CreditCard } from "lucide-react";
import loadRazorpay from "../utils/loadRazorpay";
import { BACKEND_URL } from "../config";

export default function RideDetails() {
  const { id: rideId } = useParams();

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [driverRatings, setDriverRatings] = useState([]);
  const noSeatsLeft = ride && Number(ride.availableSeats) <= 0;

  useEffect(() => {
    fetchRide();
    // eslint-disable-next-line
  }, [rideId]);

  useEffect(() => {
    if (ride?.driver?.id) {
      fetchDriverRatings();
    }
  }, [ride]);

  async function fetchRide() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(`/rides/${rideId}`); // backend: GET /api/rides/:id
      setRide(res.data);
      setSeats(Number(res.data?.availableSeats) > 0 ? 1 : 0); // Default to 1 seat when available
      if (Number(res.data?.availableSeats) <= 0) {
        setErr("No seats available for this ride.");
      }
    } catch (e) {
      console.error(e);
      setErr("Failed to load ride. Try again.");
    } finally {
      setLoading(false);
    }
  }


  const fetchDriverRatings = async () => {
    if (!ride?.driver?.id) return;
    try {
      const res = await api.get(`/ratings/driver/${ride.driver.id}`);
      setDriverRatings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch driver ratings:", err);
    }
  };

  const totalPrice = () => {
    if (!ride) return 0;
    const price = Number(ride.price || 0);
    return (price * seats).toFixed(0);
  };

  const handleBookRide = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!ride) return;
    if (noSeatsLeft) {
      setErr("No seats available for this ride.");
      return;
    }
    if (seats < 1) {
      setErr("Please select at least 1 seat.");
      return;
    }
    if (seats > ride.availableSeats) {
      setErr(`Only ${ride.availableSeats} seat(s) left for this ride.`);
      return;
    }

    setBookingLoading(true);
    setErr("");
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

        // Navigate to my bookings
        navigate("/mybookings");
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
          setErr("Invalid response from payment server. Please try again.");
          setBookingLoading(false);
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
          setErr("Invalid Razorpay key format. Please contact support.");
          setBookingLoading(false);
          return;
        }

        // Load Razorpay script
        const razorpayLoaded = await loadRazorpay();
        if (!razorpayLoaded) {
          setErr("Failed to load Razorpay. Please check your internet connection.");
          setBookingLoading(false);
          return;
        }

        // Validate Razorpay is available
        if (!window.Razorpay) {
          setErr("Razorpay SDK not loaded. Please refresh the page.");
          setBookingLoading(false);
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

              navigate("/mybookings");
            } catch (err) {
              console.error("❌ Payment verification failed:", err);
              const errorMsg = err.response?.data || err.message || "Payment verification failed";
              setErr(`Payment verification failed: ${errorMsg}. Please contact support if amount was deducted.`);
              setBookingLoading(false);
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
              setBookingLoading(false);
            }
          }
        };

        // Add error handler for Razorpay checkout
        options.handler_error = function(error) {
          console.error("❌ Razorpay checkout error:", error);
          setBookingLoading(false);
          
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
          
          setErr(errorMessage);
        };

        try {
          const razorpay = new window.Razorpay(options);
          razorpay.open();
        } catch (err) {
          console.error("❌ Failed to open Razorpay checkout:", err);
          setErr("Failed to open payment gateway. Please try again.");
          setBookingLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
      
      // Use error handler utility for consistent error message extraction
      let errorMessage = paymentMethod === "CASH" 
        ? "Booking failed. Try again." 
        : "Failed to initiate payment. Try again.";
      
      if (e.response?.data) {
        const errorData = e.response.data;
        
        // If error is an object (from GlobalExceptionHandler), extract the error message
        if (typeof errorData === 'object' && errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      setErr(errorMessage);
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="ridedetails__wrapper"><div className="ridedetails__loading">Loading ride…</div></div>;
  }

  if (err && !ride) {
    return <div className="ridedetails__wrapper"><div className="ridedetails__error">{err}</div></div>;
  }

  return (
    <div className="ridedetails__wrapper">
      <div className="ridedetails__container">
        {/* Top / Back */}
        <div className="ridedetails__top">
          <button className="ridedetails__back-btn" onClick={() => navigate(-1)}>← Back</button>
          <h2 className="ridedetails__title">Ride Details</h2>
        </div>

        {ride && (
          <>
            {/* SUMMARY CARD */}
            <div className="ridedetails__summary-card">
              <div className="ridedetails__locations">
                <div className="ridedetails__from">
                  <MapPin className="ridedetails__location-icon" />
                  <div>
                    <div className="ridedetails__location-label">From</div>
                    <div className="ridedetails__location-value">{ride.startLocation || ride.from}</div>
                  </div>
                </div>

                <div className="ridedetails__arrow">→</div>

                <div className="ridedetails__to">
                  <MapPin className="ridedetails__location-icon" />
                  <div>
                    <div className="ridedetails__location-label">To</div>
                    <div className="ridedetails__location-value">{ride.endLocation || ride.to}</div>
                  </div>
                </div>
              </div>

              <div className="ridedetails__meta">
                <div className="ridedetails__meta-item">
                  <Clock className="ridedetails__meta-icon" />
                  <div>
                    <div className="ridedetails__meta-label">Date & Time</div>
                    <div className="ridedetails__meta-value">{ride.date} • {ride.time}</div>
                  </div>
                </div>

                <div className="ridedetails__meta-item">
                  <Users className="ridedetails__meta-icon" />
                  <div>
                    <div className="ridedetails__meta-label">Seats left</div>
                    <div className="ridedetails__meta-value">{ride.availableSeats}</div>
                  </div>
                </div>

                <div className="ridedetails__meta-item ridedetails__price">
                  <IndianRupee className="ridedetails__meta-icon" />
                  <div>
                    <div className="ridedetails__meta-label">Price / seat</div>
                    <div className="ridedetails__meta-value">{ride.price}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* DRIVER CARD + DETAILS */}
            <div className="ridedetails__driver-card">
              <div className="ridedetails__driver-left">
                <div className="ridedetails__driver-avatar">
                  {ride.driver?.profileImage ? (
                       <img
                      src={ride.driver?.profileImage || "/profileimage.png"}
                      alt="Profile"
                      className="ridedetails__profile-avatar"
                    />
                  ) : (
                    <div className="ridedetails__avatar-placeholder">{(ride.driver?.name || "D").charAt(0)}</div>
                  )}
                </div>
                <div className="ridedetails__driver-info">
                  <div className="ridedetails__driver-name">
                    {ride.driver?.name || "Driver"}
                    {ride.driver?.isDriverVerified && <CheckCircle className="ridedetails__verified-badge" />}
                  </div>
                  <div className="ridedetails__driver-sub">{ride.driver?.phone || "—"}</div>
                  {ride.driver?.avgRating && ride.driver.avgRating > 0 && (
                    <div className="ridedetails__driver-rating">
                      <Star size={16} fill="#fbbf24" color="#fbbf24" />
                      <span>{ride.driver.avgRating.toFixed(1)}</span>
                      <span className="ridedetails__rating-count">({ride.driver.ratingCount || 0} reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ridedetails__driver-actions">
                {ride.driver?.phone ? (
                  <a className="ridedetails__contact-btn" href={`tel:${ride.driver.phone}`}>
                    <Phone /> Contact
                  </a>
                ) : (
                  <div className="ridedetails__muted">No contact available</div>
                )}
              </div>
            </div>

            {/* EXTRA INFO + MAP */}
            <div className="ridedetails__extra-card">
              <div className="ridedetails__extra-row">
                <div><strong>Vehicle:</strong> {ride.vehicle?.model || ride.carModel || "—"}</div>
                <div><strong>Ride type:</strong> {ride.rideType || ride.type || "Car"}</div>
                <div><strong>Luggage:</strong> {ride.luggageAllowed ? "Yes" : "No"}</div>
              </div>

              <div className="ridedetails__map-placeholder">
                {/* You can plug an actual map later (Google/Leaflet) */}
                <div className="ridedetails__map-box">Map preview (future)</div>
              </div>

              {ride.note && (
                <div className="ridedetails__ride-note">
                  <strong>Note:</strong> {ride.note}
                </div>
              )}

              {/* Driver Ratings */}
              {driverRatings.length > 0 && (
                <div className="ridedetails__ratings-section">
                  <h4>Driver Reviews</h4>
                  <div className="ridedetails__ratings-list">
                    {driverRatings.slice(0, 5).map((rating) => (
                      <div key={rating.id} className="ridedetails__rating-item">
                        <div className="ridedetails__rating-header">
                          <div className="ridedetails__rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                fill={star <= rating.stars ? "#fbbf24" : "none"}
                                color={star <= rating.stars ? "#fbbf24" : "#d1d5db"}
                              />
                            ))}
                          </div>
                          <span className="ridedetails__rating-date">
                            {new Date(rating.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {rating.comment && (
                          <p className="ridedetails__rating-comment">{rating.comment}</p>
                        )}
                        <p className="ridedetails__rating-author">by {rating.rater?.name || "Anonymous"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BOOKING PANEL */}
            <div className="ridedetails__book-card">
              <div className="ridedetails__book-left">
                <label className="ridedetails__seats-label">Seats</label>
                <div className="ridedetails__seats-control">
                  <button 
                    className="ridedetails__seats-btn"
                    disabled={noSeatsLeft || seats <= 1} 
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                  >
                    -
                  </button>
                  <div className="ridedetails__seats-count">{seats}</div>
                  <button 
                    className="ridedetails__seats-btn"
                    disabled={noSeatsLeft || seats >= ride.availableSeats} 
                    onClick={() => setSeats((s) => Math.min(ride.availableSeats, s + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="ridedetails__book-right">
                <div className="ridedetails__total">
                  <div className="ridedetails__total-label">Total</div>
                  <div className="ridedetails__total-amount">₹ {totalPrice()}</div>
                </div>

                {/* Payment Method Selection */}
                <div className="ridedetails__payment-selection">
                  <label className="ridedetails__payment-label">
                    Payment Method
                  </label>
                  <div className="ridedetails__payment-options">
                    <label className={`ridedetails__payment-option ${paymentMethod === "CASH" ? "ridedetails__payment-option--active" : ""}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CASH"
                        checked={paymentMethod === "CASH"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="ridedetails__payment-radio"
                      />
                      <IndianRupee size={18} />
                      <span>Pay with Cash</span>
                      <span className="ridedetails__payment-desc">Pay directly to driver</span>
                    </label>
                    <label className={`ridedetails__payment-option ${paymentMethod === "ONLINE" ? "ridedetails__payment-option--active" : ""}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="ONLINE"
                        checked={paymentMethod === "ONLINE"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="ridedetails__payment-radio"
                      />
                      <CreditCard size={18} />
                      <span>Online Payment</span>
                      <span className="ridedetails__payment-desc">Pay securely online</span>
                    </label>
                  </div>
                </div>

                <div className="ridedetails__book-actions">
                  <button 
                    className="ridedetails__book-btn" 
                    disabled={bookingLoading || noSeatsLeft} 
                    onClick={handleBookRide}
                  >
                    {bookingLoading ? "Processing..." : paymentMethod === "CASH" ? "Book Ride" : "Proceed to Pay"}
                  </button>
                </div>

                {err && <div className="ridedetails__error-msg">{err}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}