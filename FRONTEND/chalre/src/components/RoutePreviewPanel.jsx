import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Colour palette for up to 3 routes ───────────────────────────────────────
const ROUTE_COLORS = ["#0ea5e9", "#f59e0b", "#8b5cf6"];
const ROUTE_SELECTED_WEIGHT = 5;
const ROUTE_FADED_WEIGHT    = 2.5;
const ROUTE_FADED_OPACITY   = 0.35;

// ─── Decode Google-encoded polyline → LatLng array ───────────────────────────
function decodePolyline(encoded) {
  let index = 0, lat = 0, lng = 0;
  const points = [];
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export default function RoutePreviewPanel({
  routes, selectedIdx, onSelect, loading, fromCoords, toCoords,
}) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylinesRef   = useRef([]);
  const markersRef     = useRef([]);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const hasRoutes = routes && routes.length > 0;

  // ── Init Leaflet map (only once mapRef is mounted) ────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [16.6913, 74.2449],
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // ── Invalidate size when map mounts or routes change ──────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const t = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [routes]);

  // ── Redraw polylines whenever routes / selectedIdx change ─────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasRoutes) return;

    polylinesRef.current.forEach((pl) => map.removeLayer(pl));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const bounds = L.latLngBounds();

    routes.forEach((route, i) => {
      if (!route.polyline) return;
      const latlngs = decodePolyline(route.polyline);
      if (latlngs.length < 2) return;

      const isSelected = i === selectedIdx;
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      const pl = L.polyline(latlngs, {
        color,
        weight:  isSelected ? ROUTE_SELECTED_WEIGHT : ROUTE_FADED_WEIGHT,
        opacity: isSelected ? 0.9               : ROUTE_FADED_OPACITY,
      }).addTo(map);

      pl.on("click",     () => onSelect(i));
      pl.on("mouseover", () => setHoveredIdx(i));
      pl.on("mouseout",  () => setHoveredIdx(null));

      polylinesRef.current.push(pl);
      latlngs.forEach((pt) => bounds.extend(pt));
    });

    if (fromCoords) {
      const m = L.circleMarker([fromCoords.lat, fromCoords.lng], {
        radius: 7, fillColor: "#10b981", color: "#fff", weight: 2, fillOpacity: 1,
      }).addTo(map);
      markersRef.current.push(m);
      bounds.extend([fromCoords.lat, fromCoords.lng]);
    }
    if (toCoords) {
      const m = L.circleMarker([toCoords.lat, toCoords.lng], {
        radius: 7, fillColor: "#ef4444", color: "#fff", weight: 2, fillOpacity: 1,
      }).addTo(map);
      markersRef.current.push(m);
      bounds.extend([toCoords.lat, toCoords.lng]);
    }

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] });
  }, [routes, selectedIdx, fromCoords, toCoords, hasRoutes]);

  // ── Update polyline weight/opacity on selection change only ───────────────
  useEffect(() => {
    polylinesRef.current.forEach((pl, i) => {
      const isSelected = i === selectedIdx;
      pl.setStyle({
        weight:  isSelected ? ROUTE_SELECTED_WEIGHT : ROUTE_FADED_WEIGHT,
        opacity: isSelected ? 0.9               : ROUTE_FADED_OPACITY,
      });
      if (isSelected) pl.bringToFront();
    });
  }, [selectedIdx]);

  const fmtKm  = (km)  => (Math.round(km * 10) / 10).toFixed(1);
  const fmtMin = (min) => {
    const m = Math.round(min);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
  };

  return (
    <div className="rp-panel">
      <div className="rp-map-wrapper">
        <div ref={mapRef} className="rp-map" />
      </div>

      <div className="rp-cards">
        {routes && routes.map((route, i) => {
          const isSelected = i === selectedIdx;
          const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
          return (
            <button
              key={i}
              type="button"
              className={`rp-card${isSelected ? " rp-card--selected" : ""}`}
              style={{ "--route-color": color }}
              onClick={() => onSelect(i)}
              onMouseEnter={() => {
                setHoveredIdx(i);
                polylinesRef.current[i]?.setStyle({ opacity: 0.75, weight: ROUTE_SELECTED_WEIGHT });
              }}
              onMouseLeave={() => {
                setHoveredIdx(null);
                if (!isSelected) polylinesRef.current[i]?.setStyle({ opacity: ROUTE_FADED_OPACITY, weight: ROUTE_FADED_WEIGHT });
              }}
            >
              <span className="rp-card-swatch" style={{ background: color }} />
              <div className="rp-card-body">
                <div className="rp-card-label">
                  {isSelected
                    ? <span className="rp-card-selected-badge">✓ Selected</span>
                    : <span className="rp-card-route-num">Route {i + 1}</span>
                  }
                  {route.fallback && <span className="rp-card-fallback-tag">Estimate</span>}
                </div>
                <div className="rp-card-stats">
                  <span className="rp-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                      <path d="M3 12h18M3 6h18M3 18h18"/>
                    </svg>
                    {fmtKm(route.distanceKm)} km
                  </span>
                  <span className="rp-stat-sep">·</span>
                  <span className="rp-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
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
    </div>
  );
}
