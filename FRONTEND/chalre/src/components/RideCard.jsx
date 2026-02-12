// RideCard.jsx
import { MapPin, Users, Clock, IndianRupee } from "lucide-react";
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

  return (
    <div className={`ride-card ${isFull ? "full" : ""}`}>
      {/* HEADER - LOCATIONS */}
      <div className="ride-card-header">
        {/* START */}
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

        {/* LONG ARROW */}
        <div className="route-arrow">
          <div className="line"></div>
          <div className="arrow-head">→</div>
        </div>

        {/* END */}
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

      {/* ROW 1 - DATE + SEATS */}
      <div className="ride-row">
        <div className="info-item">
          <Clock />
          <span>
            <strong>Date & Time:</strong> {ride.date} • {ride.time}
          </span>
        </div>

        <div className="info-item">
          <Users />
          <span>
            <strong>Seats Left:</strong> {ride.availableSeats}
          </span>
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
