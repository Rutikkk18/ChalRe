// RideCard.jsx
import { MapPin, Users, Clock, IndianRupee, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/ridecard.css";

export default function RideCard({ ride }) {
  const navigate = useNavigate();
  const isFull = Number(ride?.availableSeats) <= 0;

  const goToBooking = () => {
    if (isFull) return;
    navigate(`/book-ride/${ride.id}`);
  };

  // Extract location names (first part before comma)
  const getLocationName = (fullLocation) => {
    if (!fullLocation) return "";
    // If location has a comma, take the first part, otherwise take the whole string
    return fullLocation.split(',')[0].trim();
  };

  return (
    <div className={`ride-card ${isFull ? "full" : ""}`}>
      {/* HEADER */}
      <div className="ride-card-header">
        {/* START LOCATION */}
        <div className="location">
          <MapPin />
          <div>
            <span className="location-name">
              {getLocationName(ride.startLocation)}
            </span>
            <span className="location-address">{ride.startLocation}</span>
          </div>
        </div>

        <ArrowRight className="arrow-icon" />

        {/* END LOCATION */}
        <div className="location">
          <MapPin />
          <div>
            <span className="location-name">
              {getLocationName(ride.endLocation)}
            </span>
            <span className="location-address">{ride.endLocation}</span>
          </div>
        </div>
      </div>

      {/* DETAILS */}
      <div className="ride-info">
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

        <div className="info-item price">
          <IndianRupee />
          <span>
            <strong>Price:</strong> ₹{ride.price}
          </span>
        </div>

        {/* BOOK BUTTON */}
        <button className="book-btn" onClick={goToBooking} disabled={isFull}>
          {isFull ? "Ride Full" : "Book Ride"}
        </button>
      </div>
    </div>
  );
}