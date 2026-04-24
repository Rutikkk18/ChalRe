import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

const LocationAutocomplete = ({
  value = "",
  onChange = () => {},
  onSelect = null,
  placeholder = "Search location",
}) => {
  const [query,       setQuery]       = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [show,        setShow]        = useState(false);
  const [loading,     setLoading]     = useState(false);

  const wrapperRef = useRef(null);
  const abortRef   = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShow(false);
      return;
    }

    const fetchLocations = async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const response = await api.get("/locations/search", {
          params: { q: query },
          signal: abortRef.current.signal,
        });

        const data = Array.isArray(response.data) ? response.data : [];
        setSuggestions(data);
        setShow(true);
      } catch (err) {
        if (err.name !== "CanceledError") {
          console.error("Location search failed", err);
        }
        setSuggestions([]);
        setShow(false);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchLocations, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (place) => {
    const name = place?.name || place?.display_name || "";
    setQuery(name);
    onChange(name);

    if (onSelect) {
      // ── Extract lat/lng — try all possible field names ──
      const rawLat = place?.lat;
      const rawLng = place?.lon ?? place?.lng;

      const lat = rawLat  ? parseFloat(rawLat)  : null;
      const lng = rawLng  ? parseFloat(rawLng)  : null;

      // ── Log for debugging ──
      console.log("LocationAutocomplete select:", { name, lat, lng, rawPlace: place });

      onSelect({ name, lat, lng });
    }

    setShow(false);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          const newValue = e.target.value;
          setQuery(newValue);
          onChange(newValue);
          if (onSelect) {
            onSelect({ name: newValue, lat: null, lng: null });
          }
        }}
        onFocus={() => {
          if (suggestions.length > 0) setShow(true);
        }}
      />

      {show && (
        <div className="autocomplete-dropdown">
          {loading && (
            <div className="autocomplete-item muted">Searching…</div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="autocomplete-item muted">No locations found</div>
          )}
          {!loading &&
            suggestions.map((place, index) => {
              const text = place?.name || place?.display_name;
              if (!text) return null;
              return (
                <div
                  key={place.id || text || index}
                  className="autocomplete-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(place);
                  }}
                >
                  {text}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;