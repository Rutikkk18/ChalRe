// src/pages/SearchRides.jsx
import { useEffect, useState } from "react";
import api from "../api/axios";
import RideCard from "../components/RideCard";
import "../styles/searchRide.css";
import { Filter, X } from "lucide-react";

export default function SearchRides() {
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

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load all rides on mount
  useEffect(() => {
    fetchAllRides();
  }, []);

  const fetchAllRides = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/rides"); // GET /api/rides
      const filtered = (res.data || []).filter(
        (ride) => Number(ride.availableSeats) > 0
      );
      setResults(filtered);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch rides.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!startLocation.trim() || !endLocation.trim()) {
        setError("Please enter both start and end locations.");
        setLoading(false);
        return;
      }

      // Build query params dynamically - backend expects 'from' and 'to'
      const params = {};
      if (startLocation) params.from = startLocation;
      if (endLocation) params.to = endLocation;
      if (date) params.date = date;
      if (seats) params.seats = seats;
      if (minPrice) params.minPrice = parseFloat(minPrice);
      if (maxPrice) params.maxPrice = parseFloat(maxPrice);
      if (carType) params.carType = carType;
      if (genderPreference) params.genderPreference = genderPreference;

      const res = await api.get("/rides/search", { params });

      const filtered = (res.data || []).filter(
        (ride) => Number(ride.availableSeats) > 0
      );
      setResults(filtered);
    } catch (err) {
      console.error(err);
      setError("Error while searching rides. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-wrapper">
      <div className="search-container">
        <h2>Find a Ride</h2>

        <form className="search-form" onSubmit={handleSearch}>
          {/* START LOCATION */}
          <div className="form-row">
            <label>Start Location</label>
            <input
              placeholder="Enter start point (city / locality)"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              required
            />
          </div>

          {/* END LOCATION */}
          <div className="form-row">
            <label>End Location</label>
            <input
              placeholder="Enter destination"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
              required
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
                fetchAllRides();
              }}
            >
              Reset
            </button>
            
            <button
              type="button"
              className="btn filter-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} /> Filters
            </button>
          </div>
          
          {/* FILTERS SECTION */}
          {showFilters && (
            <div className="filters-section">
              <div className="filters-header">
                <h3>Filters</h3>
                <button 
                  className="close-filters"
                  onClick={() => setShowFilters(false)}
                >
                  <X size={18} />
                </button>
              </div>
              
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

                {/* Car Type */}
                <div className="filter-group">
                  <label>Car Type</label>
                  <select
                    value={carType}
                    onChange={(e) => setCarType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="HATCHBACK">Hatchback</option>
                    <option value="COUPE">Coupe</option>
                    <option value="CONVERTIBLE">Convertible</option>
                    <option value="WAGON">Wagon</option>
                  </select>
                </div>

                {/* Gender Preference */}
                <div className="filter-group">
                  <label>Gender Preference</label>
                  <select
                    value={genderPreference}
                    onChange={(e) => setGenderPreference(e.target.value)}
                  >
                    <option value="">All Rides</option>
                    <option value="MALE_ONLY">Male Only</option>
                    <option value="FEMALE_ONLY">Female Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* RESULTS */}
      <div className="results-container">
        <h3>Results</h3>

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
  );
}
