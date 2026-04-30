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
  const { t }    = useLanguage();

  const hasAutoSearched = useRef(false);

  const [startLocation, setStartLocation] = useState("");
  const [endLocation,   setEndLocation]   = useState("");
  const [date,          setDate]          = useState("");
  const [seats,         setSeats]         = useState(1);

  const [minPrice,         setMinPrice]         = useState("");
  const [maxPrice,         setMaxPrice]         = useState("");
  const [vehicleCategory,  setVehicleCategory]  = useState("");
  const [carType,          setCarType]          = useState("");
  const [genderPreference, setGenderPreference] = useState("");
  const [seatsAvailable,   setSeatsAvailable]   = useState("");
  const [rideType,         setRideType]         = useState([]);
  const [driverRating,     setDriverRating]     = useState([]);
  const [timePreference,   setTimePreference]   = useState([]);

  const [results,     setResults]     = useState([]);
  const [allRides,    setAllRides]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const [hasSearched, setHasSearched] = useState(false);

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords,   setDropCoords]   = useState(null);
  const pickupCoordsRef = useRef(null);
  const dropCoordsRef   = useRef(null);

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
      if (!isNaN(min)) filtered = filtered.filter((r) => Number(r.price) >= min);
    }
    if (fMaxPrice) {
      const max = parseFloat(fMaxPrice);
      if (!isNaN(max)) filtered = filtered.filter((r) => Number(r.price) <= max);
    }
    if (fVehicleCategory) {
      filtered = filtered.filter(
        (r) => getRideVehicleCategory(r) === fVehicleCategory.toLowerCase()
      );
    }
    if (fCarType) {
      filtered = filtered.filter((r) => {
        const model = (r.carType || "").toLowerCase().trim();
        return model === fCarType.toLowerCase().trim();
      });
    }
    if (fSeatsAvailable) {
      if (fSeatsAvailable === "1")       filtered = filtered.filter((r) => Number(r.availableSeats) >= 1);
      else if (fSeatsAvailable === "2")  filtered = filtered.filter((r) => Number(r.availableSeats) >= 2);
      else if (fSeatsAvailable === "3+") filtered = filtered.filter((r) => Number(r.availableSeats) >= 3);
    }
    if (fRideType.length > 0) {
      filtered = filtered.filter((r) => {
        if (r.bookingType) {
          if (fRideType.includes("instant") && r.bookingType === "INSTANT") return true;
          if (fRideType.includes("request") && r.bookingType === "REQUEST") return true;
          return false;
        }
        return true;
      });
    }
    if (fDriverRating.length > 0) {
      filtered = filtered.filter((r) => {
        if (r.driver?.rating || r.driver?.averageRating) {
          const rating = Number(r.driver.rating || r.driver.averageRating);
          if (fDriverRating.includes("4") && rating >= 4) return true;
          if (fDriverRating.includes("3") && rating >= 3 && rating < 4) return true;
          return false;
        }
        return true;
      });
    }
    if (fTimePreference.length > 0) {
      filtered = filtered.filter((r) => {
        if (!r.time) return false;
        const [hours] = r.time.split(":").map(Number);
        if (fTimePreference.includes("morning")   && hours >= 6  && hours < 12) return true;
        if (fTimePreference.includes("afternoon") && hours >= 12 && hours < 18) return true;
        if (fTimePreference.includes("evening")   && hours >= 18)               return true;
        return false;
      });
    }

    setResults(filtered);
  };

  const fetchCoordsFromText = async (text, type) => {
    try {
      const res    = await api.get("/locations/search", { params: { q: text } });
      const places = res.data || [];
      if (places.length > 0) {
        const place = places[0];
        const lat   = parseFloat(place.lat);
        const lng   = parseFloat(place.lon ?? place.lng);
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
        const coords = { lat, lng };
        if (type === "pickup") {
          setPickupCoords(coords);
          pickupCoordsRef.current = coords;
        } else {
          setDropCoords(coords);
          dropCoordsRef.current = coords;
        }
      }
    } catch (e) {
      console.error("Geocode from text failed:", e);
    }
  };

  const extractCoords = (place) => {
  if (!place) return null;
  const lat = place.lat ? Number(place.lat) : null;
  // ✅ check lon first, then lng
  const lng = place.lon ? Number(place.lon)
            : place.lng ? Number(place.lng)
            : null;
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) return { lat, lng };
  return null;
};

  const setPickupCoordsAndRef = (coords) => {
    setPickupCoords(coords);
    pickupCoordsRef.current = coords;
  };

  const setDropCoordsAndRef = (coords) => {
    setDropCoords(coords);
    dropCoordsRef.current = coords;
  };

  const fetchAllRides = async () => {
  // ── Never overwrite search results with all rides ──
  if (hasAutoSearched.current) return;
  setLoading(true);
  setError("");
  try {
    const res = await api.get("/rides");
    // ── Check again after await — search may have started while fetching ──
    if (hasAutoSearched.current) return;
    const fetchedRides = (res.data || []).filter(
      (ride) => Number(ride.availableSeats) > 0
    );
    setAllRides(fetchedRides);
    setResults(fetchedRides);
  } catch (err) {
    console.error(err);
    setError(t("srErrorFetch"));
  } finally {
    setLoading(false);
  }
};
  const forceGeocode = async (text) => {
    try {
      const res = await api.get("/locations/search", { params: { q: text } });
      const place = res.data?.[0];

      if (!place) return null;

      return {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon ?? place.lng),
      };
    } catch (e) {
      console.error("forceGeocode failed", e);
      return null;
    }
  };

  const performSearch = async (fromVal, toVal, dateVal, seatsVal, pCoords, dCoords) => {
    setLoading(true);
    setError("");

    // ── FIX 2: Clear old rides immediately so stale results never show ──
    setAllRides([]);
    setResults([]);

    try {
      if (!fromVal?.trim() || !toVal?.trim()) {
        setError(t("srErrorBothLocations"));
        setLoading(false);
        return;
      }

      let resolvedPickup = pCoords ?? pickupCoordsRef.current;
      let resolvedDrop   = dCoords ?? dropCoordsRef.current;

      if (!resolvedPickup) {
        resolvedPickup = await forceGeocode(fromVal);
      }
      if (!resolvedDrop) {
        resolvedDrop = await forceGeocode(toVal);
      }

      if (!resolvedPickup || !resolvedDrop) {
        setError("Please select valid locations from dropdown");
        setLoading(false);
        return;
      }

      const params = {};

      if (resolvedPickup?.lat && resolvedPickup?.lng &&
          !isNaN(resolvedPickup.lat) && !isNaN(resolvedPickup.lng)) {
        params.pickupLat = Number(resolvedPickup.lat);
        params.pickupLng = Number(resolvedPickup.lng);
      } 

      if (resolvedDrop?.lat && resolvedDrop?.lng &&
          !isNaN(resolvedDrop.lat) && !isNaN(resolvedDrop.lng)) {
        params.dropLat = Number(resolvedDrop.lat);
        params.dropLng = Number(resolvedDrop.lng);
      }

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

      // ── FIX 2: Strict overwrite — never merge with stale data ──
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

  // ── Only fetch all rides on mount if NOT coming from Home with search state ──
useEffect(() => {
  if (!location.state?.from) {
    fetchAllRides();
  }
// eslint-disable-next-line
}, []);

  // ── Handle navigation from Home page ──
  useEffect(() => {
    if (location.state && !hasAutoSearched.current) {
      const { from, to, date: stateDate, passengers, fromCoords, toCoords } = location.state;

      if (from) setStartLocation(from);
      if (to)   setEndLocation(to);
      if (stateDate)  setDate(stateDate);
      if (passengers) setSeats(Number(passengers));

      if (fromCoords?.lat && fromCoords?.lng) {
        setPickupCoordsAndRef({ lat: Number(fromCoords.lat), lng: Number(fromCoords.lng) });
      }
      if (toCoords?.lat && toCoords?.lng) {
        setDropCoordsAndRef({ lat: Number(toCoords.lat), lng: Number(toCoords.lng) });
      }

      if (from && to) {
        hasAutoSearched.current = true;
        setHasSearched(true);
        const pCoords = fromCoords?.lat ? { lat: Number(fromCoords.lat), lng: Number(fromCoords.lng) } : null;
        const dCoords = toCoords?.lat   ? { lat: Number(toCoords.lat),   lng: Number(toCoords.lng)   } : null;
        performSearch(from, to, stateDate || "", passengers || 1, pCoords, dCoords);
      }
    }
  // eslint-disable-next-line
  }, [location.state]);

  // ── Search button clicked ──
  const handleSearch = async (e) => {
    e?.preventDefault();
    setHasSearched(true);
    performSearch(
      startLocation,
      endLocation,
      date,
      seats,
      pickupCoordsRef.current,
      dropCoordsRef.current
    );
  };

  useEffect(() => {
    if (allRides.length > 0) {
      applyClientFilters(allRides, {
        minPrice, maxPrice, vehicleCategory, carType,
        seatsAvailable, rideType, driverRating, timePreference,
      });
    }
  // eslint-disable-next-line
  }, [seatsAvailable, rideType, driverRating, timePreference, minPrice, maxPrice, vehicleCategory, carType]);

  const handleVehicleCategoryChange = (category) => {
    setVehicleCategory(category);
    setCarType("");
  };

 // ── THE FIX: Only pass the search text/coords to the cards IF a search is active ──
  // This prevents the cards from live-updating while the user is still typing.
  const cardPickupCoords = hasSearched ? pickupCoords : null;
  const cardDropCoords   = hasSearched ? dropCoords : null;
  const cardPickupName   = hasSearched ? startLocation : null;
  const cardDropName     = hasSearched ? endLocation : null;
  return (
    <div className="search-page">

      <div className="search-hero">
        <form className="search-form" onSubmit={handleSearch}>

          {/* FROM */}
          <div className="search-item">
            <LocationAutocomplete
              value={startLocation}
              placeholder={t("leavingFrom")}
              onChange={(val) => {
                setStartLocation(val);
                setPickupCoordsAndRef(null);
                if (hasSearched) {
                  setHasSearched(false);
                  setResults(allRides);
                }
              }}
              onSelect={(place) => {
                setStartLocation(place.name);
                const coords = extractCoords(place);
                if (coords) {
                  setPickupCoordsAndRef(coords);
                }
                if (hasSearched) {
                  setHasSearched(false);
                  setResults(allRides);
                }
              }}
            />
          </div>

          <div className="sr-divider" />

          {/* TO */}
          <div className="search-item">
            <LocationAutocomplete
              value={endLocation}
              placeholder={t("goingTo")}
              onChange={(val) => {
                setEndLocation(val);
                setDropCoordsAndRef(null);
                if (hasSearched) {
                  setHasSearched(false);
                  setResults(allRides);
                }
              }}
              onSelect={(place) => {
                setEndLocation(place.name);
                const coords = extractCoords(place);
                if (coords) {
                  setDropCoordsAndRef(coords);
                }
                if (hasSearched) {
                  setHasSearched(false);
                  setResults(allRides);
                }
              }}
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
            <button type="submit" className="btn-search">{t("search")}</button>
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
                setPickupCoords(null);
                setDropCoords(null);
                pickupCoordsRef.current = null;
                dropCoordsRef.current   = null;
                setHasSearched(false);
                fetchAllRides();
              }}
            >
              {t("srReset")}
            </button>
          </div>
        </form>
      </div>

      <div className="search-body">
        <div className="search-content-layout">

          <aside className="filters-sidebar">
            <h3>{t("srFilters")}</h3>
            <div className="filters-section">
              <div className="filters-grid">

                <div className="filter-group">
                  <label>{t("srPriceRange")}</label>
                  <div className="price-inputs">
                    <input type="number" placeholder={t("srMin")} value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)} min="0" step="0.01" />
                    <span>-</span>
                    <input type="number" placeholder={t("srMax")} value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)} min="0" step="0.01" />
                  </div>
                </div>

                <div className="filter-group">
                  <label>{t("srVehicleType")}</label>
                  <div className="vehicle-category-toggle">
                    {[{ value: "car", label: t("srCar") }, { value: "bike", label: t("srBike") }].map(({ value, label }) => (
                      <button key={value} type="button"
                        className={`vehicle-cat-btn ${vehicleCategory === value ? "active" : ""}`}
                        onClick={() => handleVehicleCategoryChange(vehicleCategory === value ? "" : value)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {vehicleCategory && (
                    <select value={carType} onChange={(e) => setCarType(e.target.value)} className="vehicle-submodel-select">
                      <option value="">{t("srAll")} {vehicleCategory === "car" ? t("srCars") : t("srBikes")}</option>
                      {vehicleModels[vehicleCategory].map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="filter-group">
                  <label>{t("srSeatsAvailable")}</label>
                  <div className="checkbox-group">
                    {["1", "2", "3+", ""].map((val) => (
                      <label className="checkbox-label" key={val || "all"}>
                        <input type="radio" name="seatsAvailable" value={val}
                          checked={seatsAvailable === val} onChange={() => setSeatsAvailable(val)} />
                        <span>
                          {val === "" ? t("srAll") : val === "3+" ? t("sr3PlusSeats")
                            : val === "1" ? t("sr1Seat") : t("sr2Seats")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <label>{t("srDriverRating")}</label>
                  <div className="checkbox-group">
                    {[["4", t("sr4Star")], ["3", t("sr3Star")]].map(([val, label]) => (
                      <label className="checkbox-label" key={val}>
                        <input type="checkbox" checked={driverRating.includes(val)}
                          onChange={(e) => {
                            if (e.target.checked) setDriverRating([...driverRating, val]);
                            else setDriverRating(driverRating.filter((r) => r !== val));
                          }} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <label>{t("srTimePreference")}</label>
                  <div className="checkbox-group">
                    {[["morning", t("srMorning")], ["afternoon", t("srAfternoon")], ["evening", t("srEvening")]].map(([val, label]) => (
                      <label className="checkbox-label" key={val}>
                        <input type="checkbox" checked={timePreference.includes(val)}
                          onChange={(e) => {
                            if (e.target.checked) setTimePreference([...timePreference, val]);
                            else setTimePreference(timePreference.filter((t) => t !== val));
                          }} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </aside>

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
                  <RideCard
                    key={`${ride.id}-${cardPickupCoords?.lat}-${cardDropCoords?.lat}`}
                    ride={ride}
                    pickupCoords={cardPickupCoords}
                    dropCoords={cardDropCoords}
                    pickupName={cardPickupName || null}
                    dropName={cardDropName || null}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}