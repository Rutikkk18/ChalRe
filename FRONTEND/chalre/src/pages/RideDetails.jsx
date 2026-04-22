// src/pages/RideDetails.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import "../styles/rideDetails.css";
import { Users, IndianRupee, Phone, CheckCircle, Star, CreditCard, Car, Bike } from "lucide-react";

export default function RideDetails() {

  const location  = useLocation();
  const { id: rideId } = useParams();
  const navigate  = useNavigate();
  const { user }  = useContext(AuthContext);

  // ── Search context passed from RideCard ──
  const navState     = location.state || {};
  const pickupCoords = navState.pickupCoords || null;
  const dropCoords   = navState.dropCoords   || null;
  const pickupName   = navState.pickupName   || null;
  const dropName     = navState.dropName     || null;

  const [ride,          setRide]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [err,           setErr]           = useState("");
  const [seats,         setSeats]         = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [bookingLoading,setBookingLoading]= useState(false);
  const [driverRatings, setDriverRatings] = useState([]);
  const [priceInfo,     setPriceInfo]     = useState(null);

  const noSeatsLeft = ride && Number(ride.availableSeats) <= 0;

  useEffect(() => {
    fetchRide();
    // eslint-disable-next-line
  }, [rideId]);

  useEffect(() => {
    if (ride?.driver?.id) fetchDriverRatings();
  }, [ride]);

  useEffect(() => {
    if (ride && pickupCoords?.lat) fetchCalculatedPrice();
    // eslint-disable-next-line
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

  const fetchCalculatedPrice = async () => {
    if (!pickupCoords?.lat || !dropCoords?.lat || !rideId) return;
    try {
      const res = await api.get(`/rides/${rideId}/calculate-price`, {
        params: {
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          dropLat:   dropCoords.lat,
          dropLng:   dropCoords.lng,
        }
      });
      setPriceInfo(res.data);
    } catch (e) {
      console.error("Price calc failed:", e);
    }
  };

  const totalPrice = () => {
    if (!ride) return 0;
    const basePrice = priceInfo?.calculatedPrice ?? Number(ride.price || 0);
    return (basePrice * seats).toFixed(0);
  };

  const getVehicleIcon = () => {
    const carType = ride?.carType?.toLowerCase() || "";
    const isBike = ["bullet", "splendor", "shine"].includes(carType);
    if (isBike) return <Bike size={18} className="rd__info-icon-svg" />;
    return <Car size={18} className="rd__info-icon-svg" />;
  };

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

  const handleBookRide = async () => {
    if (!user)  { navigate("/login"); return; }
    if (!ride)  return;
    if (noSeatsLeft) { setErr("No seats available for this ride."); return; }
    if (seats < 1)   { setErr("Please select at least 1 seat.");    return; }
    if (seats > ride.availableSeats) {
      setErr(`Only ${ride.availableSeats} seat(s) left for this ride.`);
      return;
    }

    setBookingLoading(true);
    setErr("");

    try {
      // ── Use calculated partial price if available ──
      const basePrice      = priceInfo?.calculatedPrice ?? ride.price;
      const totalCostPaise = Math.round(basePrice * seats * 100);

      // STEP 1: Get Razorpay public key
      const configRes  = await api.get("/payments/config");
      const razorpayKey = configRes.data.key;

      if (!razorpayKey || !razorpayKey.startsWith("rzp_")) {
        setErr("Invalid payment configuration. Please contact support.");
        setBookingLoading(false);
        return;
      }

      // STEP 2: Create order on backend
      const orderRes = await api.post("/payments/create-order", {
        rideId: Number(ride.id),
        amount: totalCostPaise
      });

      if (!orderRes.data || !orderRes.data.orderId) {
        setErr("Invalid response from payment server. Please try again.");
        setBookingLoading(false);
        return;
      }

      const { orderId, amount, currency } = orderRes.data;

      // STEP 3: Load Razorpay script
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        setErr("Failed to load Razorpay. Please check your internet connection.");
        setBookingLoading(false);
        return;
      }

      // STEP 4: Open Razorpay popup
      const options = {
        key:         razorpayKey,
        amount:      amount,
        currency:    currency || "INR",
        name:        "Chalre",
        description: `Ride from ${ride.startLocation} to ${ride.endLocation}`,
        order_id:    orderId,
        handler: async function (response) {
          try {
            // STEP 5: Verify payment + auto-create booking
            await api.post("/payments/verify", {
              rideId:              Number(ride.id),
              amount:              totalCostPaise,
              seats:               Number(seats),
              razorpayOrderId:     response.razorpay_order_id,
              razorpayPaymentId:   response.razorpay_payment_id,
              razorpaySignature:   response.razorpay_signature
            });
            navigate("/mybookings");
          } catch (err) {
            const msg = err.response?.data ||
              "Payment verification failed. Contact support if amount was deducted.";
            setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
            setBookingLoading(false);
          }
        },
        prefill: { name: "", email: "", contact: "" },
        notes: {
          rideId: ride.id.toString(),
          seats:  seats.toString()
        },
        theme: { color: "#1c7c31" },
        modal: {
          ondismiss: function () { setBookingLoading(false); }
        }
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (err) {
        setErr("Failed to open payment gateway. Please try again.");
        setBookingLoading(false);
      }

    } catch (e) {
      let errorMessage = "Failed to initiate payment. Try again.";
      if (e.response?.data) {
        const errorData = e.response.data;
        if (typeof errorData === "object" && errorData.error) errorMessage = errorData.error;
        else if (typeof errorData === "string")               errorMessage = errorData;
        else if (errorData.message)                           errorMessage = errorData.message;
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
                      {ride.endTime
                        ? <span className="rd__time">{ride.endTime}</span>
                        : <span className="rd__time rd__time--none"> </span>
                      }
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
                      <div className="rd__avatar-placeholder">
                        {(ride.driver?.name || "D").charAt(0)}
                      </div>
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
                  <span className="rd__info-text">
                    {ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} available
                  </span>
                </div>
                <div className="rd__divider" />
                <div className="rd__info-row">
                  {getVehicleIcon()}
                  <span className="rd__info-text">
                    {(() => {
                      const carType    = ride?.carType?.toLowerCase() || "";
                      const isBike     = ["bullet", "splendor", "shine"].includes(carType);
                      const vehicleName = ride.vehicle?.model || ride.carModel || ride.carType || null;
                      const seatLabel  = `${ride.availableSeats} seat${ride.availableSeats !== 1 ? "s" : ""} available`;
                      if (isBike) return vehicleName ? `${vehicleName} · ${seatLabel}` : `Bike · ${seatLabel}`;
                      return vehicleName || "Car";
                    })()}
                  </span>
                </div>
                {ride.luggageAllowed !== undefined && (
                  <>
                    <div className="rd__divider" />
                    <div className="rd__info-row">
                      <span className="rd__info-icon">🧳</span>
                      <span className="rd__info-text">
                        Luggage: {ride.luggageAllowed ? "Allowed" : "Not allowed"}
                      </span>
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
                          <span className="rd__review-date">
                            {new Date(rating.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {rating.comment && (
                          <p className="rd__review-comment">{rating.comment}</p>
                        )}
                        <p className="rd__review-author">
                          by {rating.rater?.name || "Anonymous"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN (sticky booking card) ── */}
            <div className="rd__right">
              <div className="rd__booking-card">

                {ride.date && (
                  <div className="rd__booking-date">{ride.date}</div>
                )}

                <div className="rd__booking-route">
                  <div className="rd__booking-timeline">
                    <div className="rd__booking-dot rd__booking-dot--filled" />
                    <div className="rd__booking-line" />
                    <div className="rd__booking-dot rd__booking-dot--outline" />
                  </div>
                  <div className="rd__booking-places">
                    <div className="rd__booking-place">
                      <span className="rd__booking-time">{ride.time}</span>
                      <span className="rd__booking-place-name">
                        {ride.startLocation || ride.from}
                      </span>
                    </div>
                    <div className="rd__booking-place">
                      {ride.endTime && (
                        <span className="rd__booking-time">{ride.endTime}</span>
                      )}
                      <span className="rd__booking-place-name">
                        {ride.endLocation || ride.to}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rd__booking-divider" />

                <div className="rd__booking-driver">
                  <div className="rd__booking-driver-avatar">
                    {ride.driver?.profileImage ? (
                      <img src={ride.driver.profileImage} alt="Profile" className="rd__avatar-img" />
                    ) : (
                      <div className="rd__avatar-placeholder rd__avatar-placeholder--sm">
                        {(ride.driver?.name || "D").charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="rd__booking-driver-name">
                    {ride.driver?.name || "Driver"}
                  </span>
                </div>

                <div className="rd__booking-divider" />

                {/* ── Price + Seats ── */}
                <div className="rd__booking-price-row">
                  <div className="rd__booking-seats-control">
                    <button
                      className="rd__seats-btn"
                      disabled={noSeatsLeft || seats <= 1}
                      onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    >−</button>
                    <span className="rd__seats-count">
                      {seats} passenger{seats !== 1 ? "s" : ""}
                    </span>
                    <button
                      className="rd__seats-btn"
                      disabled={noSeatsLeft || seats >= ride.availableSeats}
                      onClick={() => setSeats((s) => Math.min(ride.availableSeats, s + 1))}
                    >+</button>
                  </div>

                  <div className="rd__booking-total">
                    {/* ── Partial price info ── */}
                    {priceInfo?.isPartial && (
                      <div style={{
                        fontSize: "0.7rem", color: "#6b7280",
                        textAlign: "right", marginBottom: "4px"
                      }}>
                        {pickupName?.split(",")[0]} → {dropName?.split(",")[0]}
                        <br />
                        {priceInfo.partialDistance}km of {priceInfo.fullDistance}km
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                      <IndianRupee size={16} />
                      <span>{totalPrice()}</span>
                      {priceInfo?.isPartial && (
                        <span style={{
                          fontSize: "0.7rem", color: "#6b7280", marginLeft: "6px"
                        }}>
                          (full ₹{priceInfo.fullPrice})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rd__booking-divider" />

                {/* ── Online payment only ── */}
                <div className="rd__payment-options">
                  <label className="rd__payment-option rd__payment-option--active">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="ONLINE"
                      checked={true}
                      readOnly
                    />
                    <CreditCard size={15} />
                    <span>Online Payment</span>
                  </label>
                </div>

                <button
                  className="rd__book-btn"
                  disabled={bookingLoading || noSeatsLeft}
                  onClick={handleBookRide}
                >
                  {bookingLoading ? "Processing..." : "Proceed to Pay"}
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