// RideCard.jsx
import { MapPin, Users, Clock, IndianRupee, Star, CheckCircle } from "lucide-react";
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
            {ride.time && (
              <span className="location-time">
                <Clock size={12} /> {ride.time}
              </span>
            )}
          </div>
        </div>

        {/* LONG ARROW */}
        <div className="route-arrow">
          <div className="line"></div>
          <div className="arrow-head">→</div>
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
            {ride.endTime ? (
              <span className="location-time">
                <Clock size={12} /> {ride.endTime}
              </span>
            ) : (
              <span className="location-time location-time--none">
                No arrival time
              </span>
            )}
          </div>
        </div>

      </div>

      {/* DRIVER INFO */}
      {driver && (
        <div className="driver-info">
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
          <div className="driver-details">
            <div className="driver-name-row">
              <span className="driver-name">{driver.name || "Driver"}</span>
              {driver.isDriverVerified && (
                <CheckCircle size={14} className="driver-verified-icon" />
              )}
            </div>
            {driver.avgRating > 0 ? (
              <div className="driver-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={12}
                    fill={star <= Math.round(driver.avgRating) ? "#f59e0b" : "none"}
                    color={star <= Math.round(driver.avgRating) ? "#f59e0b" : "#d1d5db"}
                  />
                ))}
                <span className="driver-rating-score">{driver.avgRating.toFixed(1)}</span>
                {driver.ratingCount > 0 && (
                  <span className="driver-rating-count">({driver.ratingCount})</span>
                )}
              </div>
            ) : (
              <span className="driver-new-badge">New Driver</span>
            )}
          </div>
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