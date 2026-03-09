// RideCard.jsx
import { Users, Clock, IndianRupee, Star, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/ridecard.css";

function CarIcon() {
  return (
    <svg className="vehicle-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v-4l2-5h14l2 5v4h-2"/>
      <circle cx="7.5" cy="17.5" r="1.5"/>
      <circle cx="16.5" cy="17.5" r="1.5"/>
      <path d="M5 17h9"/>
    </svg>
  );
}

function BikeIcon() {
  return (
    <svg className="vehicle-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="3"/>
      <circle cx="18" cy="17" r="3"/>
      <path d="M6 17l4-7h4l2 4"/>
      <path d="M14 10l1-3h3"/>
      <path d="M10 10h4"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="mappin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

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
          <MapPinIcon />
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
          <MapPinIcon />
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

      {/* DRIVER INFO — compact inline style like screenshot */}
      {driver && (
        <div className="driver-info">

          {/* Vehicle icon on the left */}
          {hasVehicle && (
            <div className="vehicle-icon-wrap">
              {isBike ? <BikeIcon /> : <CarIcon />}
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

          {/* Rating — single star + number like screenshot */}
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