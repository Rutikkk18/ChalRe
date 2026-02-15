import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

const LocationAutocomplete = ({
  value = "",
  onChange = () => {},
  placeholder = "Search location",
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef(null);
  const abortRef = useRef(null);

  // 🔁 Sync with parent value (ONLY when parent changes)
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // ❌ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔍 Fetch locations (debounced)
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShow(false);
      return;
    }

    const fetchLocations = async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
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

  // ✅ Select location (ONLY place where parent is updated)
  const handleSelect = (place) => {
    const name = place?.name || place?.display_name || "";
    setQuery(name);
    onChange(name); // ✅ parent update ONLY here
    setShow(false);
  };

  console.log("LOCATIONS:", suggestions);

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
              <input
            type="text"
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => {
              const newValue = e.target.value;
              setQuery(newValue); // ✅ Update local state
              onChange(newValue); // ✅ Update parent state immediately
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
            <div className="autocomplete-item muted">
              No locations found
            </div>
          )}

          {!loading &&
            suggestions.map((place, index) => {
              const text = place?.name || place?.display_name; // ✅ correct
              if (!text) return null;

              return (
                <div
                  key={place.id || text || index}
                  className="autocomplete-item"
                  onMouseDown={(e) => {
                    e.preventDefault(); // 🔑 keeps input focus
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
