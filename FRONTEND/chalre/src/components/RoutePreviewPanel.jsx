/**
 * RoutePreviewPanel.jsx
 *
 * Renders a Leaflet map with up to 3 alternative route polylines and
 * a set of selectable route cards below the map.
 *
 * Props:
 *   routes       — Array of RouteOptionDTO from /api/rides/preview
 *   selectedIdx  — Currently selected route index (number)
 *   onSelect     — (index: number) => void
 *   loading      — bool, shows skeleton/spinner while fetching
 *   fromCoords   — { lat, lng } or null
 *   toCoords     — { lat, lng } or null
 */
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Colour palette for up to 3 routes ───────────────────────────────────────
const ROUTE_COLORS = ["#0ea5e9", "#f59e0b", "#8b5cf6"];
const ROUTE_SELECTED_WEIGHT = 5;
const ROUTE_FADED_WEIGHT = 2.5;
const ROUTE_FADED_OPACITY = 0.35;

// ─── Decode Google-encoded polyline → LatLng array ────────────────────────────
function decodePolyline(encoded) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points = [];
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let b;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export default function RoutePreviewPanel({ routes, selectedIdx, onSelect, loading, fromCoords, toCoords }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylinesRef = useRef([]);
  const markersRef = useRef([]);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // ── Initialise Leaflet map once ───────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return; // already initialised
    const map = L.map(mapRef.current, {
      center: [16.6913, 74.2449], // default: Kolhapur
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Redraw polylines whenever routes or selectedIdx change ────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing polylines and markers
    polylinesRef.current.forEach((pl) => map.removeLayer(pl));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (!routes || routes.length === 0) return;

    const bounds = L.latLngBounds();

    routes.forEach((route, i) => {
      if (!route.polyline) return;
      const latlngs = decodePolyline(route.polyline);
      if (latlngs.length < 2) return;

      const isSelected = i === selectedIdx;
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      const pl = L.polyline(latlngs, {
        color,
        weight: isSelected ? ROUTE_SELECTED_WEIGHT : ROUTE_FADED_WEIGHT,
        opacity: isSelected ? 0.9 : ROUTE_FADED_OPACITY,
        className: `route-line route-line-${i}`,
      }).addTo(map);

      pl.on("click", () => onSelect(i));
      pl.on("mouseover", () => setHoveredIdx(i));
      pl.on("mouseout", () => setHoveredIdx(null));

      polylinesRef.current.push(pl);
      latlngs.forEach((pt) => bounds.extend(pt));
    });

    // Origin / Destination markers
    if (fromCoords) {
      const m = L.circleMarker([fromCoords.lat, fromCoords.lng], {
        radius: 7,
        fillColor: "#10b981",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);
      markersRef.current.push(m);
      bounds.extend([fromCoords.lat, fromCoords.lng]);
    }
    if (toCoords) {
      const m = L.circleMarker([toCoords.lat, toCoords.lng], {
        radius: 7,
        fillColor: "#ef4444",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);
      markersRef.current.push(m);
      bounds.extend([toCoords.lat, toCoords.lng]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [routes, selectedIdx, fromCoords, toCoords]);

  // ── Update polyline styles when selectedIdx changes (without redrawing) ───
  useEffect(() => {
    polylinesRef.current.forEach((pl, i) => {
      const isSelected = i === selectedIdx;
      pl.setStyle({
        weight: isSelected ? ROUTE_SELECTED_WEIGHT : ROUTE_FADED_WEIGHT,
        opacity: isSelected ? 0.9 : ROUTE_FADED_OPACITY,
      });
      if (isSelected) pl.bringToFront();
    });
  }, [selectedIdx]);

  // ── Format helpers ────────────────────────────────────────────────────────
  const fmtKm = (km) => (Math.round(km * 10) / 10).toFixed(1);
  const fmtMin = (min) => {
    const m = Math.round(min);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
  };

  return (
    <div className="rp-panel">
      {/* Map */}
      <div className="rp-map-wrapper">
        <div ref={mapRef} className="rp-map" />
        {loading && (
          <div className="rp-map-overlay">
            <div className="rp-spinner" />
            <span>Fetching routes…</span>
          </div>
        )}
        {!loading && (!routes || routes.length === 0) && (
          <div className="rp-map-overlay rp-map-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p>Select pickup &amp; drop to preview routes</p>
          </div>
        )}
      </div>

      {/* Route Cards */}
      {routes && routes.length > 0 && (
        <div className="rp-cards">
          {routes.map((route, i) => {
            const isSelected = i === selectedIdx;
            const isHovered = i === hoveredIdx;
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
            return (
              <button
                key={i}
                type="button"
                className={`rp-card${isSelected ? " rp-card--selected" : ""}${isHovered ? " rp-card--hovered" : ""}`}
                style={{ "--route-color": color }}
                onClick={() => onSelect(i)}
                onMouseEnter={() => {
                  setHoveredIdx(i);
                  polylinesRef.current[i]?.setStyle({ opacity: 0.75, weight: ROUTE_SELECTED_WEIGHT });
                }}
                onMouseLeave={() => {
                  setHoveredIdx(null);
                  if (!isSelected) {
                    polylinesRef.current[i]?.setStyle({ opacity: ROUTE_FADED_OPACITY, weight: ROUTE_FADED_WEIGHT });
                  }
                }}
              >
                {/* Colour swatch */}
                <span className="rp-card-swatch" style={{ background: color }} />
                <div className="rp-card-body">
                  <div className="rp-card-label">
                    {isSelected ? (
                      <span className="rp-card-selected-badge">✓ Selected</span>
                    ) : (
                      <span className="rp-card-route-num">Route {i + 1}</span>
                    )}
                    {route.fallback && <span className="rp-card-fallback-tag">Estimate</span>}
                  </div>
                  <div className="rp-card-stats">
                    <span className="rp-stat">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.27 12a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.18 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.09a16 16 0 0 0 6 6l1.27-.55c-.45.96-1.82 1.36-2.7-.45a13.49 13.49 0 0 0 2.81.7 2 2 0 0 1 1.72 2z" />
                      </svg>
                      {fmtKm(route.distanceKm)} km
                    </span>
                    <span className="rp-stat-sep">·</span>
                    <span className="rp-stat">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {fmtMin(route.durationMins)}
                    </span>
                  </div>
                  {route.viaSummary && (
                    <div className="rp-card-via">{route.viaSummary}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
