// src/pages/SearchRides.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import CustomDatePicker from "../components/CustomDatePicker";
import LocationAutocomplete from "../components/LocationAutocomplete";
import RideCard from "../components/RideCard";
import { useLanguage } from "../context/LanguageContext";
import "../styles/SearchRide.css";

const vehicleModels = {
  car: ["SEDAN", "SUV", "HATCHBACK"],
  bike: ["Bullet", "Splendor", "Shine"],
};

const carSubModels  = vehicleModels.car.map((m) => m.toLowerCase());
const bikeSubModels = vehicleModels.bike.map((m) => m.toLowerCase());

export default function SearchRides() {
  const location = useLocation();
  const { t } = useLanguage();
  const hasAutoSearched = useRef(false);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState(1);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [carType, setCarType] = useState("");
  const [genderPreference, setGenderPreference] = useState("");

  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [rideType, setRideType] = useState([]);
  const [driverRating, setDriverRating] = useState([]);
  const [timePreference, setTimePreference] = useState([]);

  const [results, setResults] = useState([]);
  const [allRides, setAllRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getRideVehicleCategory = (ride) => {
    if (ride.vehicleType && ride.vehicleType.trim() !== "") {
      return ride.vehicleType.toLowerCase().trim();
    }
    const subModel = (ride.carType || "").toLowerCase().trim();
    if (carSubModels.includes(subModel)) return "car";
    if (bikeSubModels.includes(subModel)) return "bike";
    return "";
  };

  const applyClientFilters = (rides, filters = {}) => {
    const {
      minPrice:        fMinPrice        = minPrice,
      maxPrice:        fMaxPrice        = maxPrice,
      vehicleCategory: fVehicleCategory = vehicleCategory,
      carType:         fCarType         = carType,
      seatsAvailable:  fSeatsAvailable  = seatsAvailable,
      rideType:        fRideType        = rideType,
      driverRating:    fDriverRating    = driverRating,
      timePreference:  fTimePreference  = timePreference,
    } = filters;

    let filtered = [...rides];

    if (fMinPrice) {
      const min = parseFloat(fMinPrice);
      if (!isNaN(min)) filtered = filtered.filter((ride) => Number(ride.price) >= min);
    }
    if (fMaxPrice) {
      const max = parseFloat(fMaxPrice);
      if (!isNaN(max)) filtered = filtered.filter((ride) => Number(ride.price) <= max);
    }

    if (fVehicleCategory) {
      filtered = filtered.filter(
        (ride) => getRideVehicleCategory(ride) === fVehicleCategory.toLowerCase()
      );
    }

    if (fCarType) {
      filtered = filtered.filter((ride) => {
        const model = (ride.carType || "").toLowerCase().trim();
        return model === fCarType.toLowerCase().trim();
      });
    }

    if (fSeatsAvailable) {
      if (fSeatsAvailable === "1")       filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 1);
      else if (fSeatsAvailable === "2")  filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 2);
      else if (fSeatsAvailable === "3+") filtered = filtered.filter((ride) => Number(ride.availableSeats) >= 3);
    }

    if (fRideType.length > 0) {
      filtered = filtered.filter((ride) => {
        if (ride.bookingType) {
          if (fRideType.includes("instant") && ride.bookingType === "INSTANT") return true;
          if (fRideType.includes("request") && ride.bookingType === "REQUEST") return true;
          return false;
        }
        return true;
      });
    }

    if (fDriverRating.length > 0) {
      filtered = filtered.filter((ride) => {
        if (ride.driver?.rating || ride.driver?.averageRating) {
          const rating = Number(ride.driver.rating || ride.driver.averageRating);
          if (fDriverRating.includes("4") && rating >= 4) return true;
          if (fDriverRating.includes("3") && rating >= 3 && rating < 4) return true;
          return false;
        }
        return true;
      });
    }

    if (fTimePreference.length > 0) {
      filtered = filtered.filter((ride) => {
        if (!ride.time) return false;
        const [hours] = ride.time.split(":").map(Number);
        if (fTimePreference.includes("morning")   && hours >= 6  && hours < 12) return true;
        if (fTimePreference.includes("afternoon") && hours >= 12 && hours < 18) return true;
        if (fTimePreference.includes("evening")   && hours >= 18)               return true;
        return false;
      });
    }

    setResults(filtered);
  };

  const performSearch = async (fromVal, toVal, dateVal, seatsVal) => {
    setLoading(true);
    setError("");

    try {
      if (!fromVal?.trim() || !toVal?.trim()) {
        setError(t("srErrorBothLocations"));
        setLoading(false);
        return;
      }

     const params = {};

// ── NEW: geo-based search (polyline matching) ──
if (fromVal) params.pickup = fromVal;
if (toVal)   params.drop   = toVal;

// ── KEEP: fallback text filters still sent ──
if (dateVal)          params.date             = dateVal;
if (seatsVal)         params.seats            = seatsVal;
if (minPrice)         params.minPrice         = parseFloat(minPrice);
if (maxPrice)         params.maxPrice         = parseFloat(maxPrice);
if (carType)          params.carType          = carType;
if (genderPreference) params.genderPreference = genderPreference;

      const res = await api.get("/rides/search", { params });

      const fetchedRides = (res.data || []).filter(
        (ride) => Number(ride.availableSeats) > 0
      );

      setAllRides(fetchedRides);
      applyClientFilters(fetchedRides, {
        minPrice, maxPrice, vehicleCategory, carType,
        seatsAvailable, rideType, driverRating, timePreference,
      });
    } catch (err) {
      console.error(err);
      setError(t("srErrorSearch"));
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
      applyClientFilters(fetchedRides, {
        minPrice, maxPrice, vehicleCategory, carType,
        seatsAvailable, rideType, driverRating, timePreference,
      });
    } catch (err) {
      console.error(err);
      setError(t("srErrorFetch"));
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

      if (from)       setStartLocation(from);
      if (to)         setEndLocation(to);
      if (stateDate)  setDate(stateDate);
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

  useEffect(() => {
    if (allRides.length > 0) {
      applyClientFilters(allRides, {
        minPrice, maxPrice, vehicleCategory, carType,
        seatsAvailable, rideType, driverRating, timePreference,
      });
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
              placeholder={t("leavingFrom")}
              onChange={setStartLocation}
            />
          </div>

          <div className="sr-divider" />

          {/* TO */}
          <div className="search-item">
            <LocationAutocomplete
              value={endLocation}
              placeholder={t("goingTo")}
              onChange={setEndLocation}
            />
          </div>

          <div className="sr-divider" />

          {/* DATE */}
          <div className="search-item small cdp-search-item">
            <CustomDatePicker
              value={date}
              onChange={(val) => setDate(val)}
              placeholder={t("date")}
            />
          </div>

          <div className="sr-divider" />

          {/* SEATS */}
          <div className="search-item small">
            <div className="sr-seat-input">
              <span className="sr-seat-label">{t("seats")}</span>
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
              {t("search")}
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
              {t("srReset")}
            </button>
          </div>
        </form>
      </div>

      {/* ── BOTTOM: GRAY BODY (FILTERS + RESULTS) ── */}
      <div className="search-body">
        <div className="search-content-layout">

          {/* LEFT SIDEBAR - FILTERS */}
          <aside className="filters-sidebar">
            <h3>{t("srFilters")}</h3>
            <div className="filters-section">
              <div className="filters-grid">

                {/* Price Range */}
                <div className="filter-group">
                  <label>{t("srPriceRange")}</label>
                  <div className="price-inputs">
                    <input
                      type="number"
                      placeholder={t("srMin")}
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder={t("srMax")}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Vehicle Type */}
                <div className="filter-group">
                  <label>{t("srVehicleType")}</label>
                  <div className="vehicle-category-toggle">
                    {[
                      { value: "car",  label: t("srCar")  },
                      { value: "bike", label: t("srBike") },
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
                      <option value="">
                        {t("srAll")} {vehicleCategory === "car" ? t("srCars") : t("srBikes")}
                      </option>
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
                  <label>{t("srSeatsAvailable")}</label>
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
                        <span>
                          {val === ""    ? t("srAll")
                          : val === "3+" ? t("sr3PlusSeats")
                          : val === "1"  ? t("sr1Seat")
                          : t("sr2Seats")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Driver Rating */}
                <div className="filter-group">
                  <label>{t("srDriverRating")}</label>
                  <div className="checkbox-group">
                    {[["4", t("sr4Star")], ["3", t("sr3Star")]].map(([val, label]) => (
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
                  <label>{t("srTimePreference")}</label>
                  <div className="checkbox-group">
                    {[
                      ["morning",   t("srMorning")],
                      ["afternoon", t("srAfternoon")],
                      ["evening",   t("srEvening")],
                    ].map(([val, label]) => (
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
            {error && <div className="error">{error}</div>}

            {!loading && results.length === 0 && (
              <div className="empty">
                {t("srNoRides")}{" "}
                <a href="/offer">{t("srOfferRideLink")}</a>.
              </div>
            )}

            {!loading && (
              <div className="cards-grid">
                {results.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}