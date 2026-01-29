// RideCard.jsx
import { MapPin, Users, Clock, IndianRupee, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./RideCard.css";

export default function RideCard({ ride }) {
  const navigate = useNavigate();
  const isFull = Number(ride?.availableSeats) <= 0;

  const goToBooking = (e) => {
    e.stopPropagation(); // Prevent card click when clicking button
    if (isFull) return;
    navigate(`/book-ride/${ride.id}`);
  };

  const goToRideDetails = () => {
    navigate(`/ridedetails/${ride.id}`);
  };

  // Extract location names (first part before comma)
  const getLocationName = (fullLocation) => {
    if (!fullLocation) return "";
    return fullLocation.split(',')[0].trim();
  };

  return (
    <div 
      className={`ride-card ${isFull ? "full" : ""}`}
      onClick={goToRideDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToRideDetails();
        }
      }}
    >
      {/* HEADER - LOCATIONS */}
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

        {/* ARROW SEPARATOR - Large and Centered */}
        <ArrowRight className="arrow-icon" strokeWidth={2.5} />

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

      {/* BOTTOM ROW - DATE, SEATS, PRICE, BUTTON (HORIZONTAL LAYOUT) */}
      <div className="ride-info">
        {/* DATE & TIME */}
        <div className="info-item date-time">
          <Clock />
          <span>{ride.date} • {ride.time}</span>
        </div>

        {/* SEATS LEFT */}
        <div className="info-item seats">
          <Users />
          <span>{ride.availableSeats}</span>
        </div>

        {/* PRICE */}
        <div className="info-item price">
          <IndianRupee />
          <span>₹{ride.price}</span>
        </div>

        {/* BOOK BUTTON */}
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