// src/pages/SearchRides.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import RideCard from "../components/RideCard";
import "../styles/SearchRide.css";
import LocationAutocomplete from "../components/LocationAutocomplete";
import CustomDatePicker from "../components/CustomDatePicker";

const vehicleModels = {
  car: ["SEDAN", "SUV", "HATCHBACK"],
  bike: ["Bullet", "Splendor", "Shine"],
};

export default function SearchRides() {
  const location = useLocation();
  const hasAutoSearched = useRef(false);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [seats, setSeats] = useState(1);
  
  // Filter states
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState(""); // "car" | "bike" | ""
  const [carType, setCarType] = useState("");
  const [genderPreference, setGenderPreference] = useState("");

  // New filter states
  const [seatsAvailable, setSeatsAvailable] = useState(""); // "1", "2", "3+"
  const [rideType, setRideType] = useState([]); // ["instant", "request"]
  const [driverRating, setDriverRating] = useState([]); // ["4", "3"]
  const [timePreference, setTimePreference] = useState([]); // ["morning", "afternoon", "evening"]

  const [results, setResults] = useState([]);
  const [allRides, setAllRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const performSearch = async (fromVal, toVal, dateVal, seatsVal) => {
    setLoading(true);
    setError("");

    try {
      if (!fromVal?.trim() || !toVal?.trim()) {
        setError("Please enter both start and end locations.");
        setLoading(false);
        return;
      }

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
      
      setAllRides(fetchedRides);
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
      const res = await api.get("/rides");
      const fetchedRides = (res.data || []).filter(
        (ride) => Number(ride.availableSeats) > 0
      );
      
      setAllRides(fetchedRides);
      applyClientFilters(fetchedRides);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch rides.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!location.state) {
      fetchAllRides();
    }
  }, []);

  useEffect(() => {
    if (location.state && !hasAutoSearched.current) {
      const { from, to, date: stateDate, passengers } = location.state;
      
      if (from) setStartLocation(from);
      if (to) setEndLocation(to);
      if (stateDate) setDate(stateDate);
      if (passengers) setSeats(Number(passengers));

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

  const applyClientFilters = (rides) => {
    let filtered = [...rides];

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) filtered = filtered.filter((ride) => Number(ride.price) >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) filtered = filtered.filter((ride) => Number(ride.price) <= max);
    }

    // Filter by vehicle category (car / bike)
    if (vehicleCategory) {
      filtered = filtered.filter((ride) => {
        const type = (ride.vehicleType || ride.vehicle?.type || ride.vehicle?.category || "").toLowerCase();
        return type === vehicleCategory.toLowerCase();
      });
    }

    // Filter by vehicle sub-model
    if (carType) {
      filtered = filtered.filter((ride) => {
        const model = (ride.carType || ride.vehicleModel || ride.vehicle?.model || ride.vehicle?.subType || "").toLowerCase();
        return model === carType.toLowerCase();
      });
    }

    if (seatsAvailable) {
      if (seatsAvailable === "1") filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 1);
      else if (seatsAvailable === "2") filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 2);
      else if (seatsAvailable === "3+") filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 3);
    }

    if (rideType.length > 0) {
      filtered = filtered.filter((ride) => {
        if (ride.bookingType) {
          if (rideType.includes("instant") && ride.bookingType === "INSTANT") return true;
          if (rideType.includes("request") && ride.bookingType === "REQUEST") return true;
          return false;
        }
        return true;
      });
    }

    if (driverRating.length > 0) {
      filtered = filtered.filter((ride) => {
        if (ride.driver?.rating || ride.driver?.averageRating) {
          const rating = Number(ride.driver.rating || ride.driver.averageRating);
          if (driverRating.includes("4") && rating >= 4) return true;
          if (driverRating.includes("3") && rating >= 3 && rating < 4) return true;
          return false;
        }
        return true;
      });
    }

    if (timePreference.length > 0) {
      filtered = filtered.filter((ride) => {
        if (!ride.time) return false;
        const [hours] = ride.time.split(":").map(Number);
        if (timePreference.includes("morning") && hours >= 6 && hours < 12) return true;
        if (timePreference.includes("afternoon") && hours >= 12 && hours < 18) return true;
        if (timePreference.includes("evening") && hours >= 18) return true;
        return false;
      });
    }

    setResults(filtered);
  };

  useEffect(() => {
    if (allRides.length > 0) {
      applyClientFilters(allRides);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatsAvailable, rideType, driverRating, timePreference, minPrice, maxPrice, vehicleCategory, carType]);

  const handleVehicleCategoryChange = (category) => {
    setVehicleCategory(category);
    setCarType("");
  };

  return (
    <div className="search-page">

      {/* ── TOP: SEARCH BAR SECTION ── */}
      <div className="search-hero">
        <form className="search-form" onSubmit={handleSearch}>

          {/* FROM */}
          <div className="search-item">
            <LocationAutocomplete
              value={startLocation}
              placeholder="Leaving From"
              onChange={setStartLocation}
            />
          </div>

          <div className="sr-divider" />

          {/* TO */}
          <div className="search-item">
            <LocationAutocomplete
              value={endLocation}
              placeholder="Going to"
              onChange={setEndLocation}
            />
          </div>

          <div className="sr-divider" />

          {/* DATE */}
          <div className="search-item small cdp-search-item">
            <CustomDatePicker
              value={date}
              onChange={(val) => setDate(val)}
              placeholder="Date"
            />
          </div>

          <div className="sr-divider" />

          {/* SEATS */}
          <div className="search-item small">
            <div className="sr-seat-input">
              <span className="sr-seat-label">Seats</span>
              <input
                type="number"
                min="1"
                max="10"
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="sr-actions">
            <button type="submit" className="btn-search">
              Search
            </button>
            <button
              type="button"
              className="btn-reset"
              onClick={() => {
                setStartLocation("");
                setEndLocation("");
                setDate("");
                setSeats(1);
                setMinPrice("");
                setMaxPrice("");
                setVehicleCategory("");
                setCarType("");
                setGenderPreference("");
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

      {/* ── BOTTOM: GRAY BODY (FILTERS + RESULTS) ── */}
      <div className="search-body">
        <div className="search-content-layout">

          {/* LEFT SIDEBAR - FILTERS */}
          <aside className="filters-sidebar">
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

                {/* Vehicle Type */}
                <div className="filter-group">
                  <label>Vehicle Type</label>
                  <div className="vehicle-category-toggle">
                    {[
                      { value: "car", label: "🚗 Car" },
                      { value: "bike", label: "🏍️ Bike" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        className={`vehicle-cat-btn ${vehicleCategory === value ? "active" : ""}`}
                        onClick={() =>
                          handleVehicleCategoryChange(
                            vehicleCategory === value ? "" : value
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {vehicleCategory && (
                    <select
                      value={carType}
                      onChange={(e) => setCarType(e.target.value)}
                      className="vehicle-submodel-select"
                    >
                      <option value="">All {vehicleCategory === "car" ? "Cars" : "Bikes"}</option>
                      {vehicleModels[vehicleCategory].map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Seats Available */}
                <div className="filter-group">
                  <label>Seats Available</label>
                  <div className="checkbox-group">
                    {["1", "2", "3+", ""].map((val) => (
                      <label className="checkbox-label" key={val || "all"}>
                        <input
                          type="radio"
                          name="seatsAvailable"
                          value={val}
                          checked={seatsAvailable === val}
                          onChange={() => setSeatsAvailable(val)}
                        />
                        <span>{val === "" ? "All" : val === "3+" ? "3+ seats" : `${val} seat${val !== "1" ? "s" : ""}`}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Driver Rating */}
                <div className="filter-group">
                  <label>Driver Rating</label>
                  <div className="checkbox-group">
                    {[["4", "4★ & above"], ["3", "3★ & above"]].map(([val, label]) => (
                      <label className="checkbox-label" key={val}>
                        <input
                          type="checkbox"
                          checked={driverRating.includes(val)}
                          onChange={(e) => {
                            if (e.target.checked) setDriverRating([...driverRating, val]);
                            else setDriverRating(driverRating.filter((r) => r !== val));
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Preference */}
                <div className="filter-group">
                  <label>Time Preference</label>
                  <div className="checkbox-group">
                    {[["morning", "Morning (6-12)"], ["afternoon", "Afternoon (12-18)"], ["evening", "Evening (after 18)"]].map(([val, label]) => (
                      <label className="checkbox-label" key={val}>
                        <input
                          type="checkbox"
                          checked={timePreference.includes(val)}
                          onChange={(e) => {
                            if (e.target.checked) setTimePreference([...timePreference, val]);
                            else setTimePreference(timePreference.filter((t) => t !== val));
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </aside>

          {/* RIGHT - RESULTS */}
          <div className="results-container">
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

    </div>
  );
}