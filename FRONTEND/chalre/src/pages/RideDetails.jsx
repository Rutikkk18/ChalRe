// src/pages/RideDetails.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import "../styles/rideDetails.css";
import { Users, IndianRupee, Phone, CheckCircle, Star, CreditCard } from "lucide-react";
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
      const res = await api.get(`/rides/${rideId}`);
      setRide(res.data);
      setSeats(Number(res.data?.availableSeats) > 0 ? 1 : 0);
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
        await api.post("/bookings/create", {
          rideId: Number(ride.id),
          seats: Number(seats),
          paymentMethod: "CASH"
        });
        navigate("/mybookings");
      } else {
        const totalCostPaise = Math.round(ride.price * seats * 100);

        const orderRes = await api.post("/payments/order", {
          rideId: Number(ride.id),
          amountPaise: totalCostPaise
        });

        if (!orderRes.data || !orderRes.data.orderId || !orderRes.data.key) {
          setErr("Invalid response from payment server. Please try again.");
          setBookingLoading(false);
          return;
        }

        const { orderId, amount, key, currency } = orderRes.data;

        if (!key.startsWith("rzp_")) {
          setErr("Invalid Razorpay key format. Please contact support.");
          setBookingLoading(false);
          return;
        }

        const razorpayLoaded = await loadRazorpay();
        if (!razorpayLoaded) {
          setErr("Failed to load Razorpay. Please check your internet connection.");
          setBookingLoading(false);
          return;
        }

        if (!window.Razorpay) {
          setErr("Razorpay SDK not loaded. Please refresh the page.");
          setBookingLoading(false);
          return;
        }

        const options = {
          key,
          amount,
          currency: currency || "INR",
          name: "Ride Booking",
          description: `Ride from ${ride.startLocation} to ${ride.endLocation}`,
          order_id: orderId,
          handler: async function (response) {
            try {
              const verifyRes = await api.post("/payments/verify", {
                rideId: Number(ride.id),
                amountPaise: totalCostPaise,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });

              const paymentId = verifyRes.data.id;

              await api.post("/bookings/create", {
                rideId: Number(ride.id),
                seats: Number(seats),
                paymentMethod: "ONLINE",
                paymentId
              });

              navigate("/mybookings");
            } catch (err) {
              const errorMsg = err.response?.data || err.message || "Payment verification failed";
              setErr(`Payment verification failed: ${errorMsg}. Please contact support if amount was deducted.`);
              setBookingLoading(false);
            }
          },
          prefill: { name: "", email: "", contact: "" },
          notes: { rideId: ride.id.toString(), seats: seats.toString() },
          theme: { color: "#1c7c31" },
          modal: {
            ondismiss: function () {
              setBookingLoading(false);
            }
          }
        };

        try {
          const razorpay = new window.Razorpay(options);
          razorpay.open();
        } catch (err) {
          setErr("Failed to open payment gateway. Please try again.");
          setBookingLoading(false);
        }
      }
    } catch (e) {
      let errorMessage = paymentMethod === "CASH"
        ? "Booking failed. Try again."
        : "Failed to initiate payment. Try again.";

      if (e.response?.data) {
        const errorData = e.response.data;
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
    return <div className="rd__wrapper"><div className="rd__loading">Loading ride…</div></div>;
  }

  if (err && !ride) {
    return <div className="rd__wrapper"><div className="rd__error">{err}</div></div>;
  }

  return (
    <div className="rd__wrapper">
      <div className="rd__container">
        <button className="rd__back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="rd__page-title">Ride details</h1>

        {ride && (
          <div className="rd__layout">
            {/* ── LEFT COLUMN ── */}
            <div className="rd__left">

              {/* Route timeline */}
              <div className="rd__card rd__route-card">
                <div className="rd__timeline">
                  <div className="rd__timeline-row">
                    <div className="rd__timeline-time">
                      <span className="rd__time">{ride.time}</span>
                      {ride.duration && <span className="rd__duration">{ride.duration}</span>}
                    </div>
                    <div className="rd__timeline-track">
                      <div className="rd__dot rd__dot--filled" />
                      <div className="rd__line" />
                      <div className="rd__dot rd__dot--outline" />
                    </div>
                    <div className="rd__timeline-places">
                      <div className="rd__place-block">
                        <span className="rd__place-name">{ride.startLocation || ride.from}</span>
                      </div>
                      <div className="rd__place-block rd__place-block--bottom">
                        <span className="rd__place-name">{ride.endLocation || ride.to}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver card */}
              <div className="rd__card rd__driver-card">
                <div className="rd__driver-row">
                  <div className="rd__driver-avatar">
                    {ride.driver?.profileImage ? (
                      <img src={ride.driver.profileImage} alt="Profile" className="rd__avatar-img" />
                    ) : (
                      <div className="rd__avatar-placeholder">{(ride.driver?.name || "D").charAt(0)}</div>
                    )}
                  </div>
                  <div className="rd__driver-info">
                    <span className="rd__driver-name">
                      {ride.driver?.name || "Driver"}
                      {ride.driver?.isDriverVerified && <CheckCircle className="rd__verified" />}
                    </span>
                    {ride.driver?.avgRating > 0 && (
                      <div className="rd__rating-row">
                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                        <span>{ride.driver.avgRating.toFixed(1)}</span>
                        <span className="rd__rating-count">({ride.driver.ratingCount || 0})</span>
                      </div>
                    )}
                  </div>
                  <div className="rd__driver-chevron">›</div>
                </div>
              </div>

              {/* Ride info */}
              <div className="rd__card rd__info-card">
                <div className="rd__info-row">
                  <span className="rd__info-icon">⚡</span>
                  <span className="rd__info-text">Your booking will be confirmed instantly</span>
                </div>
                <div className="rd__divider" />
                <div className="rd__info-row">
                  <Users size={18} className="rd__info-icon-svg" />
                  <span className="rd__info-text">Max. {ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} available</span>
                </div>
                <div className="rd__divider" />
                <div className="rd__info-row">
                  <span className="rd__info-icon">🚗</span>
                  <span className="rd__info-text">{ride.vehicle?.model || ride.carModel || "—"}</span>
                </div>
                {ride.luggageAllowed !== undefined && (
                  <>
                    <div className="rd__divider" />
                    <div className="rd__info-row">
                      <span className="rd__info-icon">🧳</span>
                      <span className="rd__info-text">Luggage: {ride.luggageAllowed ? "Allowed" : "Not allowed"}</span>
                    </div>
                  </>
                )}
                {ride.note && (
                  <>
                    <div className="rd__divider" />
                    <div className="rd__info-row">
                      <span className="rd__info-icon">📝</span>
                      <span className="rd__info-text">{ride.note}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Contact button */}
              {ride.driver?.phone && (
                <div className="rd__card rd__contact-card">
                  <a className="rd__contact-btn" href={`tel:${ride.driver.phone}`}>
                    <Phone size={16} />
                    Contact {ride.driver?.name || "driver"}
                  </a>
                </div>
              )}

              {/* Driver reviews */}
              {driverRatings.length > 0 && (
                <div className="rd__card rd__reviews-card">
                  <h3 className="rd__reviews-title">Driver Reviews</h3>
                  <div className="rd__reviews-list">
                    {driverRatings.slice(0, 5).map((rating) => (
                      <div key={rating.id} className="rd__review-item">
                        <div className="rd__review-header">
                          <div className="rd__review-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={13}
                                fill={star <= rating.stars ? "#fbbf24" : "none"}
                                color={star <= rating.stars ? "#fbbf24" : "#d1d5db"}
                              />
                            ))}
                          </div>
                          <span className="rd__review-date">{new Date(rating.createdAt).toLocaleDateString()}</span>
                        </div>
                        {rating.comment && <p className="rd__review-comment">{rating.comment}</p>}
                        <p className="rd__review-author">by {rating.rater?.name || "Anonymous"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN (sticky booking card) ── */}
            <div className="rd__right">
              <div className="rd__booking-card">
                {/* Date */}
                {ride.date && (
                  <div className="rd__booking-date">{ride.date}</div>
                )}

                {/* Mini route */}
                <div className="rd__booking-route">
                  <div className="rd__booking-timeline">
                    <div className="rd__booking-dot rd__booking-dot--filled" />
                    <div className="rd__booking-line" />
                    <div className="rd__booking-dot rd__booking-dot--outline" />
                  </div>
                  <div className="rd__booking-places">
                    <div className="rd__booking-place">
                      <span className="rd__booking-time">{ride.time}</span>
                      <span className="rd__booking-place-name">{ride.startLocation || ride.from}</span>
                    </div>
                    <div className="rd__booking-place">
                      <span className="rd__booking-place-name">{ride.endLocation || ride.to}</span>
                    </div>
                  </div>
                </div>

                <div className="rd__booking-divider" />

                {/* Driver mini */}
                <div className="rd__booking-driver">
                  <div className="rd__booking-driver-avatar">
                    {ride.driver?.profileImage ? (
                      <img src={ride.driver.profileImage} alt="Profile" className="rd__avatar-img" />
                    ) : (
                      <div className="rd__avatar-placeholder rd__avatar-placeholder--sm">{(ride.driver?.name || "D").charAt(0)}</div>
                    )}
                  </div>
                  <span className="rd__booking-driver-name">{ride.driver?.name || "Driver"}</span>
                </div>

                <div className="rd__booking-divider" />

                {/* Seats + price */}
                <div className="rd__booking-price-row">
                  <div className="rd__booking-seats-control">
                    <button
                      className="rd__seats-btn"
                      disabled={noSeatsLeft || seats <= 1}
                      onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    >−</button>
                    <span className="rd__seats-count">{seats} passenger{seats !== 1 ? "s" : ""}</span>
                    <button
                      className="rd__seats-btn"
                      disabled={noSeatsLeft || seats >= ride.availableSeats}
                      onClick={() => setSeats((s) => Math.min(ride.availableSeats, s + 1))}
                    >+</button>
                  </div>
                  <div className="rd__booking-total">
                    <IndianRupee size={16} />
                    <span>{totalPrice()}</span>
                  </div>
                </div>

                <div className="rd__booking-divider" />

                {/* Payment method */}
                <div className="rd__payment-options">
                  <label className={`rd__payment-option ${paymentMethod === "CASH" ? "rd__payment-option--active" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={paymentMethod === "CASH"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <IndianRupee size={15} />
                    <span>Cash</span>
                  </label>
                  <label className={`rd__payment-option ${paymentMethod === "ONLINE" ? "rd__payment-option--active" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="ONLINE"
                      checked={paymentMethod === "ONLINE"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <CreditCard size={15} />
                    <span>Online</span>
                  </label>
                </div>

                {/* Book button */}
                <button
                  className="rd__book-btn"
                  disabled={bookingLoading || noSeatsLeft}
                  onClick={handleBookRide}
                >
                  {bookingLoading ? "Processing..." : paymentMethod === "CASH" ? "Book" : "Proceed to Pay"}
                </button>

                {err && <div className="rd__error-msg">{err}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}