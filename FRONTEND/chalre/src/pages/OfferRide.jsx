// src/pages/OfferRide.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import api from "../api/axios";
import "../styles/offerRide.css";
import LocationAutocomplete from "../components/LocationAutocomplete";
import RoutePreviewPanel from "../components/RoutePreviewPanel";
import { useLanguage } from "../context/LanguageContext";
import heroImage from "../assets/ride-sharing-scene.png";

function suggestEndTime(startTime) {
  if (!startTime) return "";
  const [h, m] = startTime.split(":").map(Number);
  const date = new Date();
  date.setHours(h + 2, m, 0, 0);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Haversine distance in km */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const vehicleModels = {
  car: ["SEDAN", "SUV", "HATCHBACK"],
  bike: ["Bullet", "Splendor", "Shine"],
};

export default function OfferRide() {
  const { t } = useLanguage();

  const [form, setForm] = useState({
    from: "", to: "", date: "", time: "", endTime: "",
    seats: 1, price: "", carType: "", genderPreference: "", note: "",
  });
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ── Route preview state ────────────────────────────────────────────────
  const [routeOptions, setRouteOptions] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  // Coords refs to capture coordinates from autocomplete
  const fromCoordsRef = useRef(null);
  const toCoordsRef = useRef(null);

  // ── Fetch route options when both coords are set ───────────────────────
  const fetchPreview = useCallback(async (fromCoords, toCoords) => {
    if (!fromCoords || !toCoords) return;
    setRouteLoading(true);
    setRouteOptions([]);
    setSelectedRouteIdx(0);
    try {
      const res = await api.post("/rides/preview", {
        startLat: fromCoords.lat,
        startLng: fromCoords.lng,
        endLat: toCoords.lat,
        endLng: toCoords.lng,
      });
      setRouteOptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Route preview failed", err);
      setRouteOptions([]);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  // Re-fetch preview when either location changes
  useEffect(() => {
    if (fromCoordsRef.current && toCoordsRef.current) {
      fetchPreview(fromCoordsRef.current, toCoordsRef.current);
    } else {
      setRouteOptions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.from, form.to]);

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
    if (form.date < today) { setError(t("orErrorPastDate")); return; }
    if (form.date === today && form.time) {
      const now = new Date();
      const [h, m] = form.time.split(":");
      const rt = new Date(); rt.setHours(+h, +m, 0, 0);
      if (rt <= now) { setError(t("orErrorPastTime")); return; }
    }
    if (form.endTime && form.time && form.endTime <= form.time) {
      setError(t("orErrorEndTime")); return;
    }
    if (form.price <= 0) { setError(t("orErrorPrice")); return; }
    if (form.seats < 1 || form.seats > 10) { setError(t("orErrorSeats")); return; }

    setLoading(true); setError(""); setSuccess("");
    try {
      const fromCoords = fromCoordsRef.current;
      const toCoords = toCoordsRef.current;

      // Attach selected route if a preview was fetched
      const selectedRoute = routeOptions[selectedRouteIdx] || null;

      const response = await api.post("/rides/create", {
        startLocation: form.from, endLocation: form.to,
        date: form.date, time: form.time, endTime: form.endTime || null,
        availableSeats: form.seats, price: form.price,
        vehicleType: vehicleCategory || null, carType: form.carType || null,
        genderPreference: form.genderPreference || null, note: form.note || null,
        fromLat: fromCoords ? fromCoords.lat : null,
        fromLng: fromCoords ? fromCoords.lng : null,
        toLat: toCoords ? toCoords.lat : null,
        toLng: toCoords ? toCoords.lng : null,
        // Pre-selected route (null if no preview was loaded)
        selectedPolyline: selectedRoute ? selectedRoute.polyline : null,
        selectedDistance: selectedRoute ? selectedRoute.distanceKm : null,
        selectedDuration: selectedRoute ? selectedRoute.durationMins : null,
      });

      if (response.status === 200) {
        setSuccess(t("orSuccess"));
        setForm({ from:"",to:"",date:"",time:"",endTime:"",seats:1,price:"",carType:"",genderPreference:"",note:"" });
        setVehicleCategory("");
        setRouteOptions([]);
        setSelectedRouteIdx(0);
        fromCoordsRef.current = null;
        toCoordsRef.current = null;
        setTimeout(() => { window.location.href = "/myrides"; }, 2000);
      }

    } catch (err) {
      console.error(err);
      setError(t("orErrorFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offer-page offer-page--split">
      <div className="offer-container-unified">

        {/* ─── LEFT PANEL: Form ──────────────────────────────────── */}
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
            <h1 className="offer-title">{t("orTitle")}</h1>
            <p className="offer-subtitle">{t("orSubtitle")}</p>
          </div>
        </div>

        <div className="offer-divider" />

        {success && <div className="banner banner-success">{success}</div>}
        {error   && <div className="banner banner-error">{error}</div>}

        <form className={`offer-form${loading ? " loading" : ""}`} onSubmit={handleSubmit}>

          {/* ROW 1: Pickup | Drop */}
          <div className="form-row">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {t("orPickup")}
              </label>
              <LocationAutocomplete
                value={form.from}
                onChange={(v) => {
                  updateField("from", v);
                  fromCoordsRef.current = null;
                }}
                onSelect={(place) => {
                  updateField("from", place.name || place.display_name || "");
                  if (place.lat && place.lng) {
                    fromCoordsRef.current = { lat: place.lat, lng: place.lng };
                  } else {
                    fromCoordsRef.current = null;
                  }
                  // Trigger preview if both coords ready
                  if (fromCoordsRef.current && toCoordsRef.current) {
                    fetchPreview(fromCoordsRef.current, toCoordsRef.current);
                  }
                }}
                placeholder={t("orPickupPlaceholder")}
              />
            </div>
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" x2="4" y1="22" y2="15"/>
                </svg>
                {t("orDrop")}
              </label>
              <LocationAutocomplete
                value={form.to}
                onChange={(v) => {
                  updateField("to", v);
                  toCoordsRef.current = null;
                }}
                onSelect={(place) => {
                  updateField("to", place.name || place.display_name || "");
                  if (place.lat && place.lng) {
                    toCoordsRef.current = { lat: place.lat, lng: place.lng };
                  } else {
                    toCoordsRef.current = null;
                  }
                  // Trigger preview if both coords ready
                  if (fromCoordsRef.current && toCoordsRef.current) {
                    fetchPreview(fromCoordsRef.current, toCoordsRef.current);
                  }
                }}
                placeholder={t("orDropPlaceholder")}
              />
            </div>
          </div>

          {/* ── Inline route panel (mobile/narrow: between locations and date) */}
          <div className="rp-inline-wrapper">
            {routeLoading && (
              <div className="rp-inline-loading">
                <span className="btn-spinner" />
                <span>Finding best routes…</span>
              </div>
            )}
            {!routeLoading && routeOptions.length > 0 && (
              <RoutePreviewPanel
                routes={routeOptions}
                selectedIdx={selectedRouteIdx}
                onSelect={setSelectedRouteIdx}
                loading={routeLoading}
                fromCoords={fromCoordsRef.current}
                toCoords={toCoordsRef.current}
              />
            )}
          </div>

          {/* ROW 2: Departure | Arrival */}
          <div className="form-row">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {t("Departure")}
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
                {t("Arrival")}
                {form.endTime && form.time && form.endTime > form.time && (
                  <em className="auto-tag">{t("orAuto")}</em>
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
                {t("date")}
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
                {t("orSeatsAvailable")}
              </label>
              <input type="number" className="field-input" min="1" max="10"
                placeholder={t("orSeatsPlaceholder")}
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
                {t("orPrice")}
              </label>
              <input type="number" className="field-input" min="1" step="0.01"
                placeholder={t("orPricePlaceholder")}
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
                {t("orVehicle")} <span className="opt-tag">({t("orOptional")})</span>
              </label>
              <div className="vehicle-toggle">
                {[{ value:"car", label: t("srCar") }, { value:"bike", label: t("srBike") }].map(({ value, label }) => (
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
                    <option value="">{t("orModel")}</option>
                    {vehicleModels[vehicleCategory].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* ROW 5: Notes */}
          <div className="form-row form-row-full">
            <div className="form-col">
              <label className="field-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                </svg>
                {t("orNotes")} <span className="opt-tag">({t("orOptional")})</span>
              </label>
              <textarea className="field-input field-textarea"
                placeholder={t("orNotesPlaceholder")}
                value={form.note}
                onChange={(e) => updateField("note", e.target.value)} />
            </div>
          </div>

          {/* Submit */}
          <div className="form-footer">
            <button
              id="offer-ride-submit"
              className="btn-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <><span className="btn-spinner" /> {t("orPosting")}</>
              ) : (
                <>
                  {t("orSubmit")}
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

      {/* ─── RIGHT PANEL: Route Preview (desktop) ─────────────── */}
      <div className="offer-right-panel">
        {/* Hero image layer — visible when idle or loading */}
        <div className={`rp-hero-container${routeOptions.length > 0 ? " rp-hero-container--hidden" : ""}`}>
          <img src={heroImage} alt="Offer a ride" className="rp-hero-img-desktop" />

          {/* Loading overlay */}
          {routeLoading && (
            <div className="rp-hero-loading-overlay">
              <div className="rp-hero-spinner" />
              <span className="rp-hero-spinner-label">Finding best routes…</span>
            </div>
          )}

          {/* Idle hint (no loading, no routes) */}
          {!routeLoading && routeOptions.length === 0 && (
            <div className="rp-hero-hint-desktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Select pickup &amp; drop to see route options
            </div>
          )}
        </div>

        {/* Route Preview Panel — mounts and slides/fades in once routes arrive */}
        {routeOptions.length > 0 && (
          <div className="rp-map-container-desktop">
            <RoutePreviewPanel
              routes={routeOptions}
              selectedIdx={selectedRouteIdx}
              onSelect={setSelectedRouteIdx}
              loading={routeLoading}
              fromCoords={fromCoordsRef.current}
              toCoords={toCoordsRef.current}
            />
          </div>
        )}
      </div>
      </div>

    </div>
  );
}