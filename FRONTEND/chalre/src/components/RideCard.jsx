// RideCard.jsx
import { Users, Clock, IndianRupee, Star, CheckCircle, Car, Motorbike, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/ridecard.css";

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

  return (
    <div className={`ride-card ${isFull ? "full" : ""}`}>
      {/* HEADER - LOCATIONS */}
      <div className="ride-card-header">

        {/* START LOCATION */}
        <div className="location">
          <MapPin />
          <div>
            <span className="location-name">
              {getLocationName(ride.startLocation)}
            </span>
            <span className="location-address">
              {ride.startLocation}
            </span>
          </div>
        </div>

        {/* LINE WITH TIMES */}
        <div className="route-arrow">
          {ride.time && (
            <span className="route-time route-time--start">{ride.time}</span>
          )}
          <div className="line"></div>
          {ride.endTime ? (
            <span className="route-time route-time--end">{ride.endTime}</span>
          ) : (
            <span className="route-time route-time--end route-time--none">No arrival</span>
          )}
        </div>

        {/* END LOCATION */}
        <div className="location">
          <MapPin />
          <div>
            <span className="location-name">
              {getLocationName(ride.endLocation)}
            </span>
            <span className="location-address">
              {ride.endLocation}
            </span>
          </div>
        </div>

      </div>

      {/* DRIVER INFO — compact inline row */}
      {driver && (
        <div className="driver-info">

          {/* Vehicle icon */}
          {hasVehicle && (
            <div className="vehicle-icon-wrap">
              {isBike
                ? <Motorbike size={20} strokeWidth={1.8} className="vehicle-type-icon" />
                : <Car size={20} strokeWidth={1.8} className="vehicle-type-icon" />
              }
            </div>
          )}

          {/* Avatar with optional verified badge */}
          <div className="driver-avatar-wrap">
            {driver.profileImage ? (
              <img
                src={driver.profileImage}
                alt={driver.name}
                className="driver-avatar"
              />
            ) : (
              <div className="driver-avatar-placeholder">
                {(driver.name || "D").charAt(0).toUpperCase()}
              </div>
            )}
            {driver.isDriverVerified && (
              <CheckCircle size={13} className="driver-verified-badge" />
            )}
          </div>

          {/* Name */}
          <span className="driver-name">{driver.name || "Driver"}</span>

          {/* Rating — single star + number */}
          {driver.avgRating > 0 ? (
            <div className="driver-rating">
              <Star size={13} fill="#f59e0b" color="#f59e0b" />
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

      {/* ROW 1 - DATE + SEATS */}
      <div className="ride-row">
        <div className="info-item">
          <Clock />
          <span><strong>Date:</strong> {ride.date}</span>
        </div>
        <div className="info-item">
          <Users />
          <span><strong>Seats Left:</strong> {ride.availableSeats}</span>
        </div>
      </div>

      {/* ROW 2 - PRICE + BUTTON */}
      <div className="ride-row">
        <div className="info-item price">
          <IndianRupee />
          <span>{ride.price}</span>
        </div>
        <button
          className="book-btn"
          onClick={goToBooking}
          disabled={isFull}
        >
          {isFull ? "Ride Full" : "Book Ride"}
        </button>
      </div>
    </div>
  );
}