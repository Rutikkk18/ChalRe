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

  // ── hasSearched: controls whether partial price/route shows on cards ──
  const hasSearchedRef = useRef(false);
  const [hasSearched,  setHasSearched] = useState(false);

  // ── Coords stored in both state AND ref ──
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords,   setDropCoords]   = useState(null);
  const pickupCoordsRef = useRef(null);
  const dropCoordsRef   = useRef(null);

  // ── Committed coords — only set after Search is clicked ──
  const [committedPickup, setCommittedPickup] = useState(null);
  const [committedDrop,   setCommittedDrop]   = useState(null);
  const [committedFrom,   setCommittedFrom]   = useState(null);
  const [committedTo,     setCommittedTo]     = useState(null);

  // ────────────────────────────────────────────────────────
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
    const lng = place.lng ? Number(place.lng)
              : place.lon ? Number(place.lon)
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

  // ── Fetch all rides — shown before any search ──
  const fetchAllRides = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/rides");
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

  // ── Core search — called from button OR home navigation ──
  const performSearch = async (
    fromVal, toVal, dateVal, seatsVal,
    pCoords, dCoords,
    fromName, toName
  ) => {
    setLoading(true);
    setError("");

    try {
      if (!fromVal?.trim() || !toVal?.trim()) {
        setError(t("srErrorBothLocations"));
        setLoading(false);
        return;
      }

      const resolvedPickup = pCoords ?? pickupCoordsRef.current;
      const resolvedDrop   = dCoords ?? dropCoordsRef.current;

      const params = {};

      if (resolvedPickup?.lat && resolvedPickup?.lng &&
          !isNaN(resolvedPickup.lat) && !isNaN(resolvedPickup.lng)) {
        params.pickupLat = Number(resolvedPickup.lat);
        params.pickupLng = Number(resolvedPickup.lng);
      } else if (fromVal) {
        params.pickup = fromVal;
      }

      if (resolvedDrop?.lat && resolvedDrop?.lng &&
          !isNaN(resolvedDrop.lat) && !isNaN(resolvedDrop.lng)) {
        params.dropLat = Number(resolvedDrop.lat);
        params.dropLng = Number(resolvedDrop.lng);
      } else if (toVal) {
        params.drop = toVal;
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

      setAllRides(fetchedRides);

      // ── Geocode from text if coords still missing ──
      if (!pickupCoordsRef.current?.lat && fromVal) {
        await fetchCoordsFromText(fromVal, "pickup");
      }
      if (!dropCoordsRef.current?.lat && toVal) {
        await fetchCoordsFromText(toVal, "drop");
      }

      // ── Commit coords and names for RideCard display ──
      const finalPickup = resolvedPickup?.lat ? resolvedPickup : pickupCoordsRef.current;
      const finalDrop   = resolvedDrop?.lat   ? resolvedDrop   : dropCoordsRef.current;

      setCommittedPickup(finalPickup || null);
      setCommittedDrop(finalDrop     || null);
      setCommittedFrom(fromName || fromVal || null);
      setCommittedTo(toName   || toVal   || null);

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

  // ── Mount: always load all rides ──
  useEffect(() => {
    fetchAllRides();
  // eslint-disable-next-line
  }, []);

  // ── Home navigation: auto-search with coords ──
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
        hasSearchedRef.current = true;

        const pCoords = fromCoords?.lat
          ? { lat: Number(fromCoords.lat), lng: Number(fromCoords.lng) }
          : null;
        const dCoords = toCoords?.lat
          ? { lat: Number(toCoords.lat), lng: Number(toCoords.lng) }
          : null;

        performSearch(from, to, stateDate || "", passengers || 1, pCoords, dCoords, from, to);
      }
    }
  // eslint-disable-next-line
  }, [location.state]);

  // ── Search button ──
  const handleSearch = async (e) => {
    e?.preventDefault();
    setHasSearched(true);
    hasSearchedRef.current = true;
    performSearch(
      startLocation,
      endLocation,
      date,
      seats,
      pickupCoordsRef.current,
      dropCoordsRef.current,
      startLocation,
      endLocation
    );
  };

  // ── Sidebar filters re-apply ──
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

  // ── Reset search state when user changes inputs ──
  const resetSearch = () => {
    if (hasSearchedRef.current) {
      setHasSearched(false);
      hasSearchedRef.current = false;
      setCommittedPickup(null);
      setCommittedDrop(null);
      setCommittedFrom(null);
      setCommittedTo(null);
      setResults(allRides);
    }
  };

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
                resetSearch();
              }}
              onSelect={(place) => {
                setStartLocation(place.name);
                const coords = extractCoords(place);
                if (coords) {
                  setPickupCoordsAndRef(coords);
                } else {
                  setPickupCoordsAndRef(null);
                  fetchCoordsFromText(place.name, "pickup");
                }
                resetSearch();
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
                resetSearch();
              }}
              onSelect={(place) => {
                setEndLocation(place.name);
                const coords = extractCoords(place);
                if (coords) {
                  setDropCoordsAndRef(coords);
                } else {
                  setDropCoordsAndRef(null);
                  fetchCoordsFromText(place.name, "drop");
                }
                resetSearch();
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
                pickupCoordsRef.current  = null;
                dropCoordsRef.current    = null;
                setHasSearched(false);
                hasSearchedRef.current   = false;
                setCommittedPickup(null);
                setCommittedDrop(null);
                setCommittedFrom(null);
                setCommittedTo(null);
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
                    key={`${ride.id}-${committedPickup?.lat}-${committedDrop?.lat}`}
                    ride={ride}
                    pickupCoords={committedPickup}
                    dropCoords={committedDrop}
                    pickupName={committedFrom}
                    dropName={committedTo}
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