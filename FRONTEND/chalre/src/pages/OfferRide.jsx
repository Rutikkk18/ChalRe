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
    <div className="or-page-container">
      <div className="or-content-wrapper">
        
        {/* Header Section */}
        <div className="or-header">
          <h1 className="or-title">Offer a Ride</h1>
          <p className="or-subtitle">Share your journey and help others reach their destination</p>
        </div>

        {/* Main Form Card */}
        <div className="or-form-card">
          
          {/* Alert Messages */}
          {success && (
            <div className="or-alert or-alert-success">
              <svg className="or-alert-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}
          
          {error && (
            <div className="or-alert or-alert-error">
              <svg className="or-alert-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="or-form" onSubmit={handleSubmit}>
            
            {/* Route Section */}
            <div className="or-section">
              <h2 className="or-section-title">Route Details</h2>
              
              <div className="or-form-group">
                <label className="or-label">
                  Pickup Location
                  <span className="or-required">*</span>
                </label>
                <LocationAutocomplete
                  value={form.from}
                  onChange={(val) => updateField("from", val)}
                  placeholder="Enter pickup city or area"
                />
              </div>

              <div className="or-form-group">
                <label className="or-label">
                  Drop Location
                  <span className="or-required">*</span>
                </label>
                <LocationAutocomplete
                  value={form.to}
                  onChange={(val) => updateField("to", val)}
                  placeholder="Enter drop city or area"
                />
              </div>

              <div className="or-form-row">
                <div className="or-form-group">
                  <label className="or-label">
                    Date
                    <span className="or-required">*</span>
                  </label>
                  <input
                    type="date"
                    className="or-input"
                    value={form.date}
                    onChange={(e) => updateField("date", e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="or-form-group">
                  <label className="or-label">
                    Time
                    <span className="or-required">*</span>
                  </label>
                  <input
                    type="time"
                    className="or-input"
                    value={form.time}
                    onChange={(e) => updateField("time", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Seats Section */}
            <div className="or-section">
              <h2 className="or-section-title">Pricing & Availability</h2>
              
              <div className="or-form-row">
                <div className="or-form-group">
                  <label className="or-label">
                    Available Seats
                    <span className="or-required">*</span>
                  </label>
                  <input
                    type="number"
                    className="or-input"
                    min="1"
                    max="10"
                    value={form.seats}
                    onChange={(e) => updateField("seats", Number(e.target.value))}
                    required
                  />
                </div>

                <div className="or-form-group">
                  <label className="or-label">
                    Price per Seat
                    <span className="or-required">*</span>
                  </label>
                  <div className="or-input-wrapper">
                    <span className="or-input-prefix">₹</span>
                    <input
                      type="number"
                      className="or-input or-input-with-prefix"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => updateField("price", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Details Section */}
            <div className="or-section">
              <h2 className="or-section-title">Vehicle Details</h2>
              
              <div className="or-form-group">
                <label className="or-label">Car Model (Optional)</label>
                <input
                  type="text"
                  className="or-input"
                  placeholder="e.g., Swift, Baleno, i20"
                  value={form.carModel}
                  onChange={(e) => updateField("carModel", e.target.value)}
                />
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="or-section">
              <h2 className="or-section-title">Additional Information</h2>
              
              <div className="or-form-group">
                <label className="or-label">Special Instructions (Optional)</label>
                <textarea
                  className="or-textarea"
                  placeholder="Any additional notes or requirements for passengers?"
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  rows="4"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="or-submit-btn" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="or-spinner" viewBox="0 0 24 24">
                    <circle className="or-spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  Posting Ride...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Offer Ride
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}