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

    const today = new Date().toISOString().split("T")[0];
    if (form.date < today) {
      setError("Date cannot be in the past. Please select today or a future date.");
      return;
    }

    if (form.date === today && form.time) {
      const now = new Date();
      const [hours, minutes] = form.time.split(":");
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
        note: form.note || null,
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
    // ✅ Image is applied as CSS background-image on this element
    // No separate <img> or fixed-position div needed
    <div className="offer-page">
      <div className="offer-content">
        <div className="offer-card">

          {/* Header */}
          <div className="offer-header">
            <div className="offer-icon-ring">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6"  cy="19" r="3"/>
                <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
                <circle cx="18" cy="5"  r="3"/>
              </svg>
            </div>
            <div className="offer-header-text">
              <h2>Offer a Ride</h2>
              <p className="offer-subtitle">Share your journey &amp; earn on the go</p>
            </div>
          </div>

          <div className="offer-divider" />

          {success && <div className="success-msg">{success}</div>}
          {error   && <div className="error-msg">{error}</div>}

          <form className={`offer-form${loading ? " loading" : ""}`} onSubmit={handleSubmit}>

            {/* Route */}
            <div className="offer-section">
              <p className="offer-section-label">Route</p>
              <div className="offer-route-stack">

                <div className="offer-icon-field">
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </span>
                  <LocationAutocomplete
                    value={form.from}
                    onChange={(val) => updateField("from", val)}
                    placeholder="Pickup location"
                  />
                </div>

                <div className="route-connector">
                  <div className="route-connector-line" />
                </div>

                <div className="offer-icon-field">
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" x2="4" y1="22" y2="15"/>
                    </svg>
                  </span>
                  <LocationAutocomplete
                    value={form.to}
                    onChange={(val) => updateField("to", val)}
                    placeholder="Drop location"
                  />
                </div>

              </div>
            </div>

            {/* Schedule */}
            <div className="offer-section">
              <p className="offer-section-label">Schedule</p>
              <div className="row-half">

                <div className="offer-icon-field">
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8"  x2="8"  y1="2" y2="6"/>
                      <line x1="3"  x2="21" y1="10" y2="10"/>
                    </svg>
                  </span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField("date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className="offer-icon-field">
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => updateField("time", e.target.value)}
                    required
                  />
                </div>

              </div>
            </div>

            {/* Ride Details */}
            <div className="offer-section">
              <p className="offer-section-label">Ride Details</p>

              <div className="row-half">
                <div className="offer-icon-field">
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </span>
                  <input
                    type="number" min="1" max="10"
                    placeholder="Seats available"
                    value={form.seats}
                    onChange={(e) => updateField("seats", Number(e.target.value))}
                    required
                  />
                </div>

                <div className="offer-icon-field">
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3h12"/><path d="M6 8h12"/>
                      <path d="m6 13 8.5 8"/><path d="M6 13h3"/>
                      <path d="M9 13c6.667 0 6.667-10 0-10"/>
                    </svg>
                  </span>
                  <input
                    type="number" min="1" step="0.01"
                    placeholder="Price per seat (₹)"
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="offer-icon-field">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 17H5v-5l2-5h10l2 5v5z"/>
                    <circle cx="7.5"  cy="17.5" r="1.5"/>
                    <circle cx="16.5" cy="17.5" r="1.5"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Vehicle model (optional)"
                  value={form.carModel}
                  onChange={(e) => updateField("carModel", e.target.value)}
                />
              </div>

              <div className="offer-icon-field offer-textarea-field">
                <span className="field-icon field-icon-top">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" x2="8" y1="13" y2="13"/>
                    <line x1="16" x2="8" y1="17" y2="17"/>
                  </svg>
                </span>
                <textarea
                  placeholder="Additional notes (stops, preferences…)"
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                />
              </div>

            </div>

            {/* Submit */}
            <button className="btn-submit1" disabled={loading}>
              {loading ? (
                <><span className="btn-spinner" /><span>Posting Ride…</span></>
              ) : (
                <>
                  <span>Offer Ride</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" x2="19" y1="12" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}