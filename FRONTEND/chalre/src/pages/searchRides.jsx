// src/pages/SearchRides.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import RideCard from "../components/RideCard";
import "../styles/SearchRide.css";
import { Filter, X } from "lucide-react";
import LocationAutocomplete from "../components/LocationAutocomplete";


export default function SearchRides() {
  const location = useLocation();
  const hasAutoSearched = useRef(false);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [seats, setSeats] = useState(1);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [carType, setCarType] = useState("");
  const [genderPreference, setGenderPreference] = useState("");

  // New filter states
  const [seatsAvailable, setSeatsAvailable] = useState(""); // "1", "2", "3+"
  const [rideType, setRideType] = useState([]); // ["instant", "request"]
  const [driverRating, setDriverRating] = useState([]); // ["4", "3"]
  const [timePreference, setTimePreference] = useState([]); // ["morning", "afternoon", "evening"]

  const [results, setResults] = useState([]);
  const [allRides, setAllRides] = useState([]); // Store all fetched rides for client-side filtering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Shared search logic
  const performSearch = async (fromVal, toVal, dateVal, seatsVal) => {
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!fromVal?.trim() || !toVal?.trim()) {
        setError("Please enter both start and end locations.");
        setLoading(false);
        return;
      }

      // Build query params dynamically - backend expects 'from' and 'to'
      const params = {};
      if (fromVal) params.from = fromVal;
      if (toVal) params.to = toVal;
      if (dateVal) params.date = dateVal;
      if (seatsVal) params.seats = seatsVal;
      if (minPrice) params.minPrice = parseFloat(minPrice);
      if (maxPrice) params.maxPrice = parseFloat(maxPrice);
      if (carType) params.carType = carType;
      if (genderPreference) params.genderPreference = genderPreference;

      const res = await api.get("/rides/search", { params });

      const fetchedRides = (res.data || []).filter(
        (ride) => Number(ride.availableSeats) > 0
      );
      
      // Store all rides for client-side filtering
      setAllRides(fetchedRides);
      
      // Apply client-side filters
      applyClientFilters(fetchedRides);
    } catch (err) {
      console.error(err);
      setError("Error while searching rides. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRides = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/rides"); // GET /api/rides
      const fetchedRides = (res.data || []).filter(
        (ride) => Number(ride.availableSeats) > 0
      );
      
      // Store all rides for client-side filtering
      setAllRides(fetchedRides);
      
      // Apply client-side filters
      applyClientFilters(fetchedRides);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch rides.");
    } finally {
      setLoading(false);
    }
  };

  // Load all rides on mount (only if no state from Home)
  useEffect(() => {
    if (!location.state) {
      fetchAllRides();
    }
  }, []);

  // Handle incoming state from Home page and auto-trigger search
  useEffect(() => {
    if (location.state && !hasAutoSearched.current) {
      const { from, to, date: stateDate, passengers } = location.state;
      
      // Pre-fill form fields
      if (from) setStartLocation(from);
      if (to) setEndLocation(to);
      if (stateDate) setDate(stateDate);
      if (passengers) setSeats(Number(passengers));

      // Auto-trigger search with state values directly
      if (from && to) {
        hasAutoSearched.current = true;
        performSearch(from, to, stateDate || "", passengers || 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    performSearch(startLocation, endLocation, date, seats);
  };

  // Client-side filtering function
  const applyClientFilters = (rides) => {
    let filtered = [...rides];

    // Filter by price range (client-side, in addition to backend filtering)
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        filtered = filtered.filter((ride) => Number(ride.price) >= min);
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter((ride) => Number(ride.price) <= max);
      }
    }

    // Filter by seats available
    if (seatsAvailable) {
      if (seatsAvailable === "1") {
        filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 1);
      } else if (seatsAvailable === "2") {
        filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 2);
      } else if (seatsAvailable === "3+") {
        filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 3);
      }
    }

    // Filter by ride type (if bookingType field exists on ride object)
    if (rideType.length > 0) {
      filtered = filtered.filter((ride) => {
        // Check if ride has bookingType field
        if (ride.bookingType) {
          if (rideType.includes("instant") && ride.bookingType === "INSTANT") {
            return true;
          }
          if (rideType.includes("request") && ride.bookingType === "REQUEST") {
            return true;
          }
          return false;
        }
        // If field doesn't exist, include ride (don't filter out)
        return true;
      });
    }

    // Filter by driver rating (if driver.rating or driver.averageRating exists)
    if (driverRating.length > 0) {
      filtered = filtered.filter((ride) => {
        if (ride.driver?.rating || ride.driver?.averageRating) {
          const rating = Number(ride.driver.rating || ride.driver.averageRating);
          if (driverRating.includes("4") && rating >= 4) {
            return true;
          }
          if (driverRating.includes("3") && rating >= 3 && rating < 4) {
            return true;
          }
          return false;
        }
        // If rating doesn't exist, include ride (don't filter out)
        return true;
      });
    }

    // Filter by time preference
    if (timePreference.length > 0) {
      filtered = filtered.filter((ride) => {
        if (!ride.time) return false;
        const [hours] = ride.time.split(":").map(Number);
        
        if (timePreference.includes("morning") && hours >= 6 && hours < 12) {
          return true;
        }
        if (timePreference.includes("afternoon") && hours >= 12 && hours < 18) {
          return true;
        }
        if (timePreference.includes("evening") && hours >= 18) {
          return true;
        }
        return false;
      });
    }

    setResults(filtered);
  };

  // Apply filters whenever filter states change
  useEffect(() => {
    if (allRides.length > 0) {
      applyClientFilters(allRides);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatsAvailable, rideType, driverRating, timePreference, minPrice, maxPrice]);

  return (
    <div className="search-wrapper">
      {/* HORIZONTAL SEARCH BAR AT TOP */}
      <div className="search-container">
        <form className="search-form" onSubmit={handleSearch}>
          {/* START LOCATION */}
          <div className="form-row">
            <label>Start Location</label>
            <LocationAutocomplete
              value={startLocation}
              placeholder="Enter start point"
              onChange={setStartLocation}
            />
          </div>

          {/* END LOCATION */}
          <div className="form-row">
            <label>End Location</label>
            <LocationAutocomplete
              value={endLocation}
              placeholder="Enter destination"
              onChange={setEndLocation}
            />
          </div>

          {/* DATE */}
          <div className="form-row">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* SEATS */}
          <div className="form-row">
            <label>Seats</label>
            <input
              type="number"
              min="1"
              max="10"
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </div>

          {/* BUTTONS */}
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Search
            </button>

            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setStartLocation("");
                setEndLocation("");
                setDate("");
                setSeats(1);
                setMinPrice("");
                setMaxPrice("");
                setCarType("");
                setGenderPreference("");
                // Reset new filters
                setSeatsAvailable("");
                setRideType([]);
                setDriverRating([]);
                setTimePreference([]);
                fetchAllRides();
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* MAIN CONTENT: SIDEBAR + RESULTS */}
      <div className="search-content-layout">
        {/* LEFT SIDEBAR - FILTERS */}
        <aside className={`filters-sidebar ${!showFilters ? 'hidden-mobile' : ''}`}>
          <h3>Filters</h3>
          <div className="filters-section">
            <div className="filters-grid">
              {/* Price Range */}
              <div className="filter-group">
                <label>Price Range (₹)</label>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* velhicle Type */}
              <div className="filter-group">
                <label>Vehicle Model</label>
                <select
                  value={carType}
                  onChange={(e) => setCarType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="SEDAN">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="HATCHBACK">Hatchback</option>
                  <option value="Bullet">Bullet</option>
                  <option value="Splendor">Splendor</option>
                  <option value="Shine">Shine</option>
                </select>
              </div>

              {/* Seats Available */}
              <div className="filter-group">
                <label>Seats Available</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="seatsAvailable"
                      value="1"
                      checked={seatsAvailable === "1"}
                      onChange={(e) => setSeatsAvailable(e.target.value)}
                    />
                    <span>1 seat</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="seatsAvailable"
                      value="2"
                      checked={seatsAvailable === "2"}
                      onChange={(e) => setSeatsAvailable(e.target.value)}
                    />
                    <span>2 seats</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="seatsAvailable"
                      value="3+"
                      checked={seatsAvailable === "3+"}
                      onChange={(e) => setSeatsAvailable(e.target.value)}
                    />
                    <span>3+ seats</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="seatsAvailable"
                      value=""
                      checked={seatsAvailable === ""}
                      onChange={(e) => setSeatsAvailable("")}
                    />
                    <span>All</span>
                  </label>
                </div>
              </div>

              {/* Driver Rating */}
              <div className="filter-group">
                <label>Driver Rating</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={driverRating.includes("4")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDriverRating([...driverRating, "4"]);
                        } else {
                          setDriverRating(driverRating.filter((r) => r !== "4"));
                        }
                      }}
                    />
                    <span>4★ & above</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={driverRating.includes("3")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDriverRating([...driverRating, "3"]);
                        } else {
                          setDriverRating(driverRating.filter((r) => r !== "3"));
                        }
                      }}
                    />
                    <span>3★ & above</span>
                  </label>
                </div>
              </div>

              {/* Time Preference */}
              <div className="filter-group">
                <label>Time Preference</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={timePreference.includes("morning")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTimePreference([...timePreference, "morning"]);
                        } else {
                          setTimePreference(timePreference.filter((t) => t !== "morning"));
                        }
                      }}
                    />
                    <span>Morning (6-12)</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={timePreference.includes("afternoon")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTimePreference([...timePreference, "afternoon"]);
                        } else {
                          setTimePreference(timePreference.filter((t) => t !== "afternoon"));
                        }
                      }}
                    />
                    <span>Afternoon (12-18)</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={timePreference.includes("evening")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTimePreference([...timePreference, "evening"]);
                        } else {
                          setTimePreference(timePreference.filter((t) => t !== "evening"));
                        }
                      }}
                    />
                    <span>Evening (after 18)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT - RESULTS */}
        <div className="results-container">
          <div className="results-header">
            <h3>Results</h3>
            <button
              type="button"
              className="btn filter-btn mobile-filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} /> {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>

          {loading && <div className="muted">Loading rides…</div>}
          {error && <div className="error">{error}</div>}

          {!loading && results.length === 0 && (
            <div className="empty">
              No rides found. Try changing the route or date. You can also{" "}
              <a href="/offer">offer a ride</a>.
            </div>
          )}

          <div className="cards-grid">
            {results.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
