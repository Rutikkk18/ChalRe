// RideCard.jsx
import { MapPin, Users, IndianRupee, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/ridecard.css";

// Format "HH:MM" → "HH:MM AM/PM"
function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Calculate duration string from two "HH:MM" strings
function calcDuration(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // overnight ride
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Is the ride overnight? (end time < start time)
function isOvernight(start, end) {
  if (!start || !end) return false;
  return end <= start;
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

  const duration = calcDuration(ride.time, ride.endTime);
  const overnight = isOvernight(ride.time, ride.endTime);
  const driverName = ride.driver?.name || ride.driverName || null;
  const driverAvatar = ride.driver?.profilePhoto || ride.driverPhoto || null;

  return (
    <div className={`ride-card ${isFull ? "full" : ""}`}>

      {/* ── TOP STRIP: TIME + ROUTE ── */}
      <div className="rc-top">

        {/* Departure */}
        <div className="rc-time-block">
          <span className="rc-time">{formatTime(ride.time)}</span>
          <span className="rc-city">{getLocationName(ride.startLocation)}</span>
        </div>

        {/* Duration bar */}
        <div className="rc-route-bar">
          <div className="rc-bar-dot rc-bar-dot--start" />
          <div className="rc-bar-line">
            {duration && (
              <span className="rc-duration">
                {overnight && <Moon size={11} />}
                {!overnight && <Sun size={11} />}
                {duration}
              </span>
            )}
          </div>
          <div className="rc-bar-dot rc-bar-dot--end" />
        </div>

        {/* Arrival */}
        <div className="rc-time-block rc-time-block--right">
          {ride.endTime ? (
            <>
              <span className="rc-time">
                {formatTime(ride.endTime)}
                {overnight && <sup className="rc-plus1">+1</sup>}
              </span>
              <span className="rc-city">{getLocationName(ride.endLocation)}</span>
            </>
          ) : (
            <>
              <span className="rc-time rc-time--muted">—</span>
              <span className="rc-city">{getLocationName(ride.endLocation)}</span>
            </>
          )}
        </div>

        {/* Price — top right */}
        <div className="rc-price-block">
          <span className="rc-price">
            <IndianRupee size={18} />
            {Number(ride.price).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* ── MIDDLE: DATE + SEATS ── */}
      <div className="rc-meta">
        <span className="rc-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          {ride.date}
        </span>

        <span className="rc-meta-dot" />

        <span className="rc-meta-item">
          <Users size={14} />
          {isFull
            ? <span className="rc-seats-full">Full</span>
            : <><strong>{ride.availableSeats}</strong> seat{ride.availableSeats !== 1 ? "s" : ""} left</>
          }
        </span>
      </div>

      {/* ── BOTTOM: DRIVER + BOOK BUTTON ── */}
      <div className="rc-bottom">

        {/* Driver strip */}
        {driverName ? (
          <div className="rc-driver">
            {driverAvatar ? (
              <img
                src={driverAvatar}
                alt={driverName}
                className="rc-avatar"
              />
            ) : (
              <div className="rc-avatar rc-avatar--fallback">
                {driverName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="rc-driver-name">{driverName}</span>
          </div>
        ) : (
          <div /> /* spacer so button stays right */
        )}

        {/* Book button */}
        <button
          className="rc-book-btn"
          onClick={goToBooking}
          disabled={isFull}
        >
          {isFull ? "Ride Full" : "Book Ride"}
        </button>

      </div>
    </div>
  );
}