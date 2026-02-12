// src/pages/OfferRide.jsx
import { useState } from "react";
import api from "../api/axios";
import "../styles/offerRide.css";
import LocationAutocomplete from "../components/LocationAutocomplete";

export default function OfferRide() {
  const [form, setForm] = useState({
    from: "",
    to: "",
    date: "",
    time: "",
    seats: 1,
    price: "",
    carModel: "",
    carType: "",
    genderPreference: "",
    note: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const today = new Date().toISOString().split('T')[0];
    if (form.date < today) {
      setError("Date cannot be in the past. Please select today or a future date.");
      return;
    }
    
    // If date is today, validate time is in the future
    if (form.date === today && form.time) {
      const now = new Date();
      const [hours, minutes] = form.time.split(':');
      const rideTime = new Date();
      rideTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (rideTime <= now) {
        setError("Time cannot be in the past. Please select a future time.");
        return;
      }
    }
    
    if (form.price <= 0) {
      setError("Price must be greater than ₹0.");
      return;
    }
    
    if (form.seats < 1 || form.seats > 10) {
      setError("Seats must be between 1 and 10.");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/rides/create", {
        startLocation: form.from,
        endLocation: form.to,
        date: form.date,
        time: form.time,
        availableSeats: form.seats,
        price: form.price,
        carModel: form.carModel || null,
        carType: form.carType || null,
        genderPreference: form.genderPreference || null,
        note: form.note || null
      });

      if (response.status === 200) {
        setSuccess("Ride offered successfully!");
        setForm({
          from: "",
          to: "",
          date: "",
          time: "",
          seats: 1,
          price: "",
          carModel: "",
          carType: "",
          genderPreference: "",
          note: "",
        });
        // Navigate to MyRides after 2 seconds
        setTimeout(() => {
          window.location.href = "/myrides";
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to offer ride. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offer-wrapper">
      <div className="offer-card">
        <div className="offer-header">
          <div className="header-icon">🚗</div>
          <h2>Offer a Ride</h2>
          <p className="header-subtitle">Share your journey and save on travel costs</p>
        </div>

        {success && (
          <div className="success-msg">
            <span className="msg-icon">✓</span>
            {success}
          </div>
        )}
        {error && (
          <div className="error-msg">
            <span className="msg-icon">⚠</span>
            {error}
          </div>
        )}

        <form className="offer-form" onSubmit={handleSubmit}>
          
          {/* Trip Details Section */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">📍</span>
              Trip Details
            </h3>

            <div className="row">
              <label>
                <span className="label-icon">🔵</span>
                Pickup Location
              </label>
              <LocationAutocomplete
                value={form.from}
                onChange={(val) => updateField("from", val)}
                placeholder="Enter pickup city / area"
              />
            </div>

            <div className="row">
              <label>
                <span className="label-icon">🔴</span>
                Drop Location
              </label>
              <LocationAutocomplete
                value={form.to}
                onChange={(val) => updateField("to", val)}
                placeholder="Enter drop city / area"
              />
            </div>

            <div className="row-half">
              <div>
                <label>
                  <span className="label-icon">📅</span>
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <label>
                  <span className="label-icon">🕐</span>
                  Time
                </label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => updateField("time", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Ride Information Section */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">💺</span>
              Ride Information
            </h3>

            <div className="row-half">
              <div>
                <label>
                  <span className="label-icon">👥</span>
                  Seats Available *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.seats}
                  onChange={(e) => updateField("seats", Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label>
                  <span className="label-icon">💰</span>
                  Price (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Amount per seat"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="row">
              <label>
                <span className="label-icon">🚘</span>
                Vehicle Model (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Swift, Baleno, Splendor"
                value={form.carModel}
                onChange={(e) => updateField("carModel", e.target.value)}
              />
            </div>

            <div className="row">
              <label>
                <span className="label-icon">📝</span>
                Additional Note (Optional)
              </label>
              <textarea
                placeholder="Any special instructions or preferences?"
                value={form.note}
                onChange={(e) => updateField("note", e.target.value)}
              ></textarea>
            </div>
          </div>

          <button className="btn-submit1" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Posting Ride...
              </>
            ) : (
              <>
                <span className="btn-icon">✓</span>
                Offer Ride
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}