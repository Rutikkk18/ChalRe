// src/pages/OfferRide.jsx
import { useState } from "react";
import api from "../api/axios";
import "../styles/offerRide.css";
import LocationAutocomplete from "../components/LocationAutocomplete";

function suggestEndTime(startTime) {
  if (!startTime) return "";
  const [h, m] = startTime.split(":").map(Number);
  const date = new Date();
  date.setHours(h + 2, m, 0, 0);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const vehicleModels = {
  car: ["SEDAN", "SUV", "HATCHBACK"],
  bike: ["Bullet", "Splendor", "Shine"],
};

/* ── Inline style object — beats every external stylesheet,
      Tailwind utility class, CSS reset, or global override.  ── */
const btnStyle = {
  all: "unset",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 28px",
  background: "#024110",
  backgroundColor: "#024110",
  color: "#ffffff",
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: "0.9rem",
  fontWeight: "700",
  letterSpacing: "0.04em",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  boxShadow: "0 3px 14px rgba(2, 65, 16, 0.30)",
  textDecoration: "none",
  outline: "none",
  WebkitAppearance: "none",
  appearance: "none",
  lineHeight: "1",
  whiteSpace: "nowrap",
};

const btnDisabledStyle = {
  ...btnStyle,
  opacity: "0.5",
  cursor: "not-allowed",
  background: "#9ca3af",
  backgroundColor: "#9ca3af",
  boxShadow: "none",
};

export default function OfferRide() {
  const [form, setForm] = useState({
    from: "", to: "", date: "", time: "", endTime: "",
    seats: 1, price: "", carType: "", genderPreference: "", note: "",
  });
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [btnHovered, setBtnHovered] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "time" && value) updated.endTime = suggestEndTime(value);
      return updated;
    });
  };

  const handleVehicleCategoryChange = (category) => {
    setVehicleCategory((prev) => (prev === category ? "" : category));
    updateField("carType", "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    if (form.date < today) { setError("Date cannot be in the past."); return; }
    if (form.date === today && form.time) {
      const now = new Date();
      const [h, m] = form.time.split(":");
      const rt = new Date(); rt.setHours(+h, +m, 0, 0);
      if (rt <= now) { setError("Time cannot be in the past."); return; }
    }
    if (form.endTime && form.time && form.endTime <= form.time) {
      setError("End time must be after start time."); return;
    }
    if (form.price <= 0) { setError("Price must be greater than ₹0."); return; }
    if (form.seats < 1 || form.seats > 10) { setError("Seats must be between 1 and 10."); return; }

    setLoading(true); setError(""); setSuccess("");
    try {
      const response = await api.post("/rides/create", {
        startLocation: form.from, endLocation: form.to,
        date: form.date, time: form.time, endTime: form.endTime || null,
        availableSeats: form.seats, price: form.price,
        vehicleType: vehicleCategory || null, carType: form.carType || null,
        genderPreference: form.genderPreference || null, note: form.note || null,
      });
      if (response.status === 200) {
        setSuccess("Ride offered successfully!");
        setForm({ from:"",to:"",date:"",time:"",endTime:"",seats:1,price:"",carType:"",genderPreference:"",note:"" });
        setVehicleCategory("");
        setTimeout(() => { window.location.href = "/myrides"; }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to offer ride. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Compute final button style at render time */
  const computedBtnStyle = loading
    ? btnDisabledStyle
    : btnHovered
      ? { ...btnStyle, background: "#149349", backgroundColor: "#149349", transform: "translateY(-1px)", boxShadow: "0 6px 20px rgba(20, 147, 73, 0.35)" }
      : btnStyle;

  return (
    <div className="offer-page">
      <div className="offer-zone">

        {/* Page heading */}
        <div className="offer-heading">
          <div className="offer-heading-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="19" r="3"/>
              <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
              <circle cx="18" cy="5" r="3"/>
            </svg>
          </div>
          <div>
            <h1 className="offer-title">Offer a Ride</h1>
            <p className="offer-subtitle">Share your journey &amp; earn on the go</p>
          </div>
        </div>

        <div className="offer-divider" />

        {/* Banners */}
        {success && <div className="banner banner-success">{success}</div>}
        {error   && <div className="banner banner-error">{error}</div>}

        {/* Form */}
        <form className={`offer-form${loading ? " loading" : ""}`} onSubmit={handleSubmit}>

          {/* ROW 1: Pickup | Drop */}
          <div className="form-row">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Pickup Location
              </label>
              <LocationAutocomplete
                value={form.from}
                onChange={(v) => updateField("from", v)}
                placeholder="e.g. Pune Station"
              />
            </div>
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" x2="4" y1="22" y2="15"/>
                </svg>
                Drop Location
              </label>
              <LocationAutocomplete
                value={form.to}
                onChange={(v) => updateField("to", v)}
                placeholder="e.g. Mumbai CST"
              />
            </div>
          </div>

          {/* ROW 2: Departure | Arrival */}
          <div className="form-row">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Departure Time
              </label>
              <input type="time" className="field-input"
                value={form.time}
                onChange={(e) => updateField("time", e.target.value)}
                required />
            </div>
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Arrival Time
                {form.endTime && form.time && form.endTime > form.time && (
                  <em className="auto-tag">auto</em>
                )}
              </label>
              <input type="time" className="field-input"
                value={form.endTime}
                onChange={(e) => updateField("endTime", e.target.value)} />
            </div>
          </div>

          {/* ROW 3: Date | Seats */}
          <div className="form-row">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <rect width="18" height="18" x="3" y="4" rx="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                Date
              </label>
              <input type="date" className="field-input"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required />
            </div>
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Seats Available
              </label>
              <input type="number" className="field-input" min="1" max="10"
                placeholder="e.g. 3"
                value={form.seats}
                onChange={(e) => updateField("seats", Number(e.target.value))}
                required />
            </div>
          </div>

          {/* ROW 4: Price | Vehicle */}
          <div className="form-row">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M6 3h12"/><path d="M6 8h12"/>
                  <path d="m6 13 8.5 8"/><path d="M6 13h3"/>
                  <path d="M9 13c6.667 0 6.667-10 0-10"/>
                </svg>
                Price / Seat (₹)
              </label>
              <input type="number" className="field-input" min="1" step="0.01"
                placeholder="e.g. 250"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                required />
            </div>
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M19 17H5v-5l2-5h10l2 5v5z"/>
                  <circle cx="7.5" cy="17.5" r="1.5"/>
                  <circle cx="16.5" cy="17.5" r="1.5"/>
                </svg>
                Vehicle <span className="opt-tag">(optional)</span>
              </label>
              <div className="vehicle-toggle">
                {[{ value:"car", label:"🚗 Car" }, { value:"bike", label:"🏍️ Bike" }].map(({ value, label }) => (
                  <button key={value} type="button"
                    className={`vtoggle-btn${vehicleCategory === value ? " active" : ""}`}
                    onClick={() => handleVehicleCategoryChange(value)}>
                    {label}
                  </button>
                ))}
                {vehicleCategory && (
                  <select className="field-input vehicle-model-select"
                    value={form.carType}
                    onChange={(e) => updateField("carType", e.target.value)}>
                    <option value="">Model</option>
                    {vehicleModels[vehicleCategory].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* ROW 5: Notes — full width */}
          <div className="form-row form-row-full">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                </svg>
                Notes <span className="opt-tag">(optional)</span>
              </label>
              <textarea className="field-input field-textarea"
                placeholder="Stops, luggage info, preferences…"
                value={form.note}
                onChange={(e) => updateField("note", e.target.value)} />
            </div>
          </div>

          {/* Submit */}
          <div className="form-footer">
            <button
              className="btn-submit"
              disabled={loading}
              style={computedBtnStyle}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
            >
              {loading ? (
                <><span className="btn-spinner" /> Posting…</>
              ) : (
                <>
                  Offer Ride
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <line x1="5" x2="19" y1="12" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}