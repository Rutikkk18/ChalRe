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

  const wrapperRef      = useRef(null);
  const abortRef        = useRef(null);
  // ── Track whether last change was from user typing or programmatic ──
  const userTypingRef   = useRef(false);
  // ── Track if a selection was just made (suppress value sync) ──
  const justSelectedRef = useRef(false);

  // ── Sync value from parent ONLY if user hasn't just selected ──
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return; // skip sync — we just set it ourselves via handleSelect
    }
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
    // ── Only fetch if user is actually typing ──
    if (!userTypingRef.current) return;
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
        setShow(data.length > 0);
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

    // ── Mark that we just selected — suppress value sync ──
    justSelectedRef.current = true;
    userTypingRef.current   = false;

    setQuery(name);
    setSuggestions([]);
    setShow(false);
    onChange(name);

    if (onSelect) {
      const rawLat = place?.lat;
      const rawLng = place?.lon ?? place?.lng;
      const lat    = rawLat ? parseFloat(rawLat) : null;
      const lng    = rawLng ? parseFloat(rawLng) : null;
      console.log("LocationAutocomplete select:", { name, lat, lng });
      onSelect({ name, lat, lng });
    }
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
          // ── Mark as user typing — allow coord clear ──
          userTypingRef.current   = true;
          justSelectedRef.current = false;
          setQuery(newValue);
          onChange(newValue);
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