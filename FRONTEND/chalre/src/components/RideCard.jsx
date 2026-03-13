// RideCard.jsx
import { Users, Clock, IndianRupee, Star, CheckCircle, Car, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/ridecard.css";
import { CalendarRange } from "lucide-react";

export default function RideCard({ ride }) {
  const navigate = useNavigate();
  const isFull = Number(ride?.availableSeats) <= 0;

  const goToBooking = () => {
    if (isFull) return;
    navigate(`/book-ride/${ride.id}`);
  };

  const getLocationName = (fullLocation) => {
    if (!fullLocation) return "";
    return fullLocation.split(",")[0].trim();
  };

  const driver = ride?.driver;
  const carType = ride?.carType?.toLowerCase() || "";
  const isBike = ["bullet", "splendor", "shine"].includes(carType);
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
    } catch {
      return null;
    }
  };

  const duration = getDuration();

  return (
    <div className={`ride-card ${isFull ? "full" : ""}`}>

      {/* ── ROW 1: ROUTE TIMELINE ── */}
      <div className="ride-card-header">

        <div className="location">
          <span className="location-name">{getLocationName(ride.startLocation)}</span>
          <span className="location-address">{ride.startLocation}</span>
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
          <span className="location-name">{getLocationName(ride.endLocation)}</span>
          <span className="location-address">{ride.endLocation}</span>
        </div>

      </div>

      {/* ── ROW 2: 3-ZONE BOTTOM ── */}
      <div className="ride-card-bottom">

        {/* ZONE 1 — Driver: [vehicle] [avatar] [name] [rating/badge] all horizontal */}
        {driver && (
          <div className="driver-info">

            {hasVehicle && (
              <div className="vehicle-icon-wrap">
                {isBike
                  ? <Bike size={16} strokeWidth={1.8} className="vehicle-type-icon" />
                  : <Car size={16} strokeWidth={1.8} className="vehicle-type-icon" />
                }
              </div>
            )}

            {/* Avatar */}
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

            {/* Name — inline with avatar and rating */}
            <span className="driver-name">{driver.name || "Driver"}</span>

            {/* Rating or New Driver badge — inline with name */}
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

        {/* ZONE 2 — Meta (centred, with dividers) */}
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

        {/* ZONE 3 — Price + CTA */}
        <div className="ride-price-action">
          <div className="ride-price-wrap">
            <div className="ride-price">
              <IndianRupee size={16} />
              {ride.price}
            </div>
            <span className="ride-price-label"></span>
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