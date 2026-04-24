// RideCard.jsx
import { Users, IndianRupee, Star, CheckCircle, Car, Bike, CalendarRange } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/ridecard.css";

export default function RideCard({ ride, pickupCoords, dropCoords, pickupName, dropName }) {
  const navigate = useNavigate();
  const isFull   = Number(ride?.availableSeats) <= 0;

  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [isPartial,       setIsPartial]       = useState(false);

  const hasValidCoords =
    ride?.id &&
    pickupCoords?.lat && pickupCoords?.lng &&
    dropCoords?.lat   && dropCoords?.lng   &&
    !isNaN(Number(pickupCoords.lat)) &&
    !isNaN(Number(dropCoords.lat));

  // ── Fire whenever ride or coords change ──
  useEffect(() => {
    if (hasValidCoords) {
      fetchPrice();
    }
  // eslint-disable-next-line
  }, [ride?.id, pickupCoords?.lat, pickupCoords?.lng, dropCoords?.lat, dropCoords?.lng]);

  const fetchPrice = async () => {
    try {
      const res = await api.get(`/rides/${ride.id}/calculate-price`, {
        params: {
          pickupLat: Number(pickupCoords.lat),
          pickupLng: Number(pickupCoords.lng),
          dropLat:   Number(dropCoords.lat),
          dropLng:   Number(dropCoords.lng),
        }
      });
      if (res.data?.calculatedPrice) {
        setCalculatedPrice(res.data.calculatedPrice);
        setIsPartial(res.data.isPartial || false);
      }
    } catch (e) {
      console.error("RideCard price calc failed:", e);
    }
  };

  const navState = {
    pickupCoords: pickupCoords || null,
    dropCoords:   dropCoords   || null,
    pickupName:   pickupName   || null,
    dropName:     dropName     || null,
  };

  const goToBooking = (e) => {
    e.stopPropagation();
    if (isFull) return;
    navigate(`/book-ride/${ride.id}`, { state: navState });
  };

  const goToRideDetails = () => {
    navigate(`/ridedetails/${ride.id}`, { state: navState });
  };

  const getLocationName = (fullLocation) => {
    if (!fullLocation) return "";
    return fullLocation.split(",")[0].trim();
  };

  const driver     = ride?.driver;
  const carType    = ride?.carType?.toLowerCase() || "";
  const isBike     = ["bullet", "splendor", "shine"].includes(carType);
  const hasVehicle = !!ride?.carType;

  const getDuration = () => {
    if (!ride.time || !ride.endTime) return null;
    try {
      const [sh, sm] = ride.time.split(":").map(Number);
      const [eh, em] = ride.endTime.split(":").map(Number);
      let totalMins = (eh * 60 + em) - (sh * 60 + sm);
      if (totalMins < 0) totalMins += 24 * 60;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${h}h ${String(m).padStart(2, "0")}m`;
    } catch { return null; }
  };

  const duration     = getDuration();
  const displayPrice = calculatedPrice ?? ride.price;

  return (
    <div
      className={`ride-card ${isFull ? "full" : ""}`}
      onClick={goToRideDetails}
      style={{ cursor: "pointer" }}
    >
      {/* ── ROW 1: ROUTE TIMELINE ── */}
      <div className="ride-card-header">

        <div className="location">
          <span className="location-name">
            {isPartial && pickupName
              ? pickupName.split(",")[0].trim()
              : getLocationName(ride.startLocation)}
          </span>
          <span className="location-address">
            {isPartial && pickupName ? pickupName : ride.startLocation}
          </span>
        </div>

        <div className="route-arrow">
          <div className="route-times">
            <span className="route-time">{ride.time || "—"}</span>
            {duration && <span className="route-duration">{duration}</span>}
            {ride.endTime
              ? <span className="route-time">{ride.endTime}</span>
              : <span className="route-time route-time--none">No arrival</span>
            }
          </div>
          <div className="route-line" />
        </div>

        <div className="location end">
          <span className="location-name">
            {isPartial && dropName
              ? dropName.split(",")[0].trim()
              : getLocationName(ride.endLocation)}
          </span>
          <span className="location-address">
            {isPartial && dropName ? dropName : ride.endLocation}
          </span>
        </div>

      </div>

      {/* ── ROW 2: 3-ZONE BOTTOM ── */}
      <div className="ride-card-bottom">

        {driver && (
          <div className="driver-info">
            {hasVehicle && (
              <div className="vehicle-icon-wrap">
                {isBike
                  ? <Bike size={16} strokeWidth={1.8} className="vehicle-type-icon" />
                  : <Car  size={16} strokeWidth={1.8} className="vehicle-type-icon" />
                }
              </div>
            )}
            <div className="driver-avatar-wrap">
              {driver.profileImage ? (
                <img src={driver.profileImage} alt={driver.name} className="driver-avatar" />
              ) : (
                <div className="driver-avatar-placeholder">
                  {(driver.name || "D").charAt(0).toUpperCase()}
                </div>
              )}
              {driver.isDriverVerified && (
                <CheckCircle size={13} className="driver-verified-badge" />
              )}
            </div>
            <span className="driver-name">{driver.name || "Driver"}</span>
            {driver.avgRating > 0 ? (
              <div className="driver-rating">
                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                <span className="driver-rating-score">{driver.avgRating.toFixed(1)}</span>
                {driver.ratingCount > 0 && (
                  <span className="driver-rating-count">({driver.ratingCount})</span>
                )}
              </div>
            ) : (
              <span className="driver-new-badge">New Driver</span>
            )}
          </div>
        )}

        <div className="ride-meta">
          <div className="meta-item">
            <CalendarRange size={13} />
            {ride.date}
          </div>
          <div className="meta-item">
            <Users size={13} />
            {ride.availableSeats} seat{Number(ride.availableSeats) !== 1 ? "s" : ""} left
          </div>
        </div>

        <div className="ride-price-action">
          <div className="ride-price-wrap">
            <div className="ride-price">
              <IndianRupee size={16} />
              {displayPrice}
            </div>
            {isPartial && (
              <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "2px" }}>
                full ₹{ride.price}
              </div>
            )}
          </div>
          {isFull ? (
            <div className="full-badge">FULL</div>
          ) : (
            <button className="book-btn" onClick={goToBooking}>
              Book Ride
            </button>
          )}
        </div>

      </div>
    </div>
  );
}