import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Bike,
  ArrowRight,
  Sparkles,
  Info,
  Navigation,
  User
} from "lucide-react";
import "../styles/SavingsCalculator.css";

// ── Offer a Ride 4-Image Story Loop ──
// 1st: Car solo -> 3rd: Car shared -> 5th: Bike solo -> 4th: Bike shared
const offerSlides = [
  {
    image: "/calc-car-solo.jpg",
    tag: "Empty Seats • Car",
    title: "Driving alone with empty seats?",
    vehicle: "car"
  },
  {
    image: "/calc-car-shared.jpg",
    tag: "Shared Carpool • Car",
    title: "Share your ride, save fuel & travel together.",
    vehicle: "car"
  },
  {
    image: "/calc-bike-solo.jpg",
    tag: "Solo Commute • Bike",
    title: "Riding daily with an empty pillion seat?",
    vehicle: "bike"
  },
  {
    image: "/calc-bike-shared.jpg",
    tag: "Shared Pillion • Bike",
    title: "Offer a lift, split daily fuel costs.",
    vehicle: "bike"
  }
];

// ── Find a Ride Story Loop ──
// 2nd: Bus vs Car comparison -> 4th: Shared Bike
const findSlides = [
  {
    image: "/calc-bus-vs-car.png",
    tag: "Comfort vs Crowds",
    title: "Skip crowded public transport — choose shared comfort.",
    vehicle: "car"
  },
  {
    image: "/calc-bike-shared.jpg",
    tag: "Affordable Shared Commute",
    title: "Quick, affordable shared daily bike rides.",
    vehicle: "bike"
  }
];

export default function SavingsCalculator() {
  const navigate = useNavigate();

  // Mode: "offer" (Driver) or "find" (Passenger)
  const [purpose, setPurpose] = useState("offer");
  // Vehicle: "car" or "bike"
  const [vehicle, setVehicle] = useState("car");

  // Carousel slide indexes
  const [offerIndex, setOfferIndex] = useState(0);
  const [findIndex, setFindIndex] = useState(0);

  // 3-second loop animation
  useEffect(() => {
    const timer = setInterval(() => {
      if (purpose === "offer") {
        setOfferIndex((prev) => (prev + 1) % offerSlides.length);
      } else {
        setFindIndex((prev) => (prev + 1) % findSlides.length);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [purpose]);

  // ── Driver State (Offer a Ride) ──
  // Streamlined: only daily travel distance (km/day)
  const [dailyKm, setDailyKm] = useState(40);

  // ── Passenger State (Find a Ride) ──
  // Kept intact: trips per month, alternative cost, and shared ride cost
  const [passengerTrips, setPassengerTrips] = useState(20);
  const [altCost, setAltCost] = useState(150);
  const [sharedCost, setSharedCost] = useState(80);

  // Quick distance presets for daily travel
  const distancePresets = [15, 30, 50, 80];

  // Vehicle change handler
  const handleVehicleChange = (newVehicle) => {
    setVehicle(newVehicle);
    if (newVehicle === "bike") {
      if (sharedCost > 60) setSharedCost(50);
      if (altCost > 120) setAltCost(100);
      if (purpose === "offer") setOfferIndex(2); // Jump to Bike slide
      else setFindIndex(1);
    } else {
      if (sharedCost < 70) setSharedCost(80);
      if (altCost < 130) setAltCost(150);
      if (purpose === "offer") setOfferIndex(0); // Jump to Car slide
      else setFindIndex(0);
    }
  };

  // ── Calculations ──
  // Driver: ~24 commuting days/month
  // Car offsets ~₹4.0/km in fuel & running cost; Bike offsets ~₹1.75/km
  const monthlyKm = dailyKm * 24;
  const driverRate = vehicle === "car" ? 4.0 : 1.75;
  const driverMonthly = Math.round(monthlyKm * driverRate);
  const driverYearly = driverMonthly * 12;
  const dailySavings = Math.round(dailyKm * driverRate);

  // Passenger: difference between alternative travel and ChalRe shared ride
  const savingPerTrip = altCost - sharedCost;
  const passengerMonthly = savingPerTrip * passengerTrips;
  const passengerYearly = passengerMonthly * 12;

  const handleCta = () => {
    if (purpose === "offer") {
      navigate("/offer");
    } else {
      navigate("/search", {
        state: { from: "", to: "", date: "", passengers: 1 }
      });
    }
  };

  return (
    <section className="chalre-calc-section" aria-labelledby="calc-heading">
      <div className="chalre-calc-container">

        {/* ── HEADER ── */}
        <div className="chalre-calc-header">
          <span className="chalre-calc-eyebrow">CAR OR BIKE</span>
          <h2 id="calc-heading" className="chalre-calc-title">
            Your journey. <span className="chalre-calc-title-accent">More value.</span>
          </h2>
          <p className="chalre-calc-subtitle">
            Share the ride you're already taking. See what it could mean for you.
          </p>
        </div>

        {/* ── MAIN MINIMAL CARD ── */}
        <div className="chalre-calc-card">

          {/* Top Control Bar: Purpose & Vehicle */}
          <div className="chalre-calc-topbar">
            
            <div className="chalre-pill-group" role="tablist" aria-label="Mode">
              <button
                type="button"
                role="tab"
                aria-selected={purpose === "offer"}
                className={`chalre-pill-btn ${purpose === "offer" ? "chalre-pill-btn--active" : ""}`}
                onClick={() => setPurpose("offer")}
              >
                <span>Offer a Ride &bull; Earn</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={purpose === "find"}
                className={`chalre-pill-btn ${purpose === "find" ? "chalre-pill-btn--active" : ""}`}
                onClick={() => setPurpose("find")}
              >
                <span>Find a Ride &bull; Save</span>
              </button>
            </div>

            <div className="chalre-pill-group" role="radiogroup" aria-label="Vehicle">
              <button
                type="button"
                role="radio"
                aria-checked={vehicle === "car"}
                className={`chalre-pill-btn ${vehicle === "car" ? "chalre-pill-btn--active" : ""}`}
                onClick={() => handleVehicleChange("car")}
              >
                <Car size={15} />
                <span>Car</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={vehicle === "bike"}
                className={`chalre-pill-btn ${vehicle === "bike" ? "chalre-pill-btn--active" : ""}`}
                onClick={() => handleVehicleChange("bike")}
              >
                <Bike size={15} />
                <span>Bike</span>
              </button>
            </div>

          </div>

          {/* Body: Inputs Left, Result Right */}
          <div className="chalre-calc-body">

            {/* Left Column: Contextual Inputs & Visual Showcase */}
            <div className="chalre-calc-inputs">
              <AnimatePresence mode="wait">
                {purpose === "offer" ? (
                  <motion.div
                    key="offer-inputs"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="chalre-inputs-stack chalre-inputs-stack--offer"
                  >
                    {/* Animated 4-Image Story Banner (1st -> 3rd -> 5th -> 4th) */}
                    <div className="chalre-calc-media-banner" aria-label="Ride sharing photo story">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={offerSlides[offerIndex].image}
                          className="chalre-media-slide"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.02 }}
                          transition={{ duration: 0.45 }}
                        >
                          <img
                            src={offerSlides[offerIndex].image}
                            alt={offerSlides[offerIndex].title}
                            className="chalre-media-img"
                          />
                          <div className="chalre-media-overlay" />
                          <div className="chalre-media-content">
                            <span className="chalre-media-badge">
                              {offerSlides[offerIndex].tag}
                            </span>
                            <p className="chalre-media-caption">
                              {offerSlides[offerIndex].title}
                            </p>
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      {/* Progress Dots */}
                      <div className="chalre-media-dots" role="tablist" aria-label="Slide dots">
                        {offerSlides.map((slide, idx) => (
                          <button
                            key={idx}
                            type="button"
                            role="tab"
                            aria-label={`Show ${slide.tag}`}
                            aria-selected={offerIndex === idx}
                            className={`chalre-media-dot ${offerIndex === idx ? "chalre-media-dot--active" : ""}`}
                            onClick={() => {
                              setOfferIndex(idx);
                              setVehicle(slide.vehicle);
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Streamlined Input: How much do you travel a day? */}
                    <div className="chalre-simple-group">
                      <div className="chalre-group-header">
                        <label htmlFor="daily-km-slider" className="chalre-simple-label">
                          How much do you travel a day?
                        </label>
                        <span className="chalre-simple-badge">{dailyKm} km / day</span>
                      </div>

                      <input
                        id="daily-km-slider"
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        value={dailyKm}
                        onChange={(e) => setDailyKm(Number(e.target.value))}
                        className="chalre-simple-slider"
                        aria-label="Daily travel distance in kilometers"
                      />

                      {/* Quick Distance Presets */}
                      <div className="chalre-presets-row" role="group" aria-label="Common daily travel distances">
                        {distancePresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`chalre-preset-chip ${dailyKm === preset ? "chalre-preset-chip--active" : ""}`}
                            onClick={() => setDailyKm(preset)}
                          >
                            {preset} km
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="find-inputs"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="chalre-inputs-stack"
                  >
                    {/* Find a Ride Story Banner (2nd: Bus vs Car -> 4th: Shared Bike) */}
                    <div className="chalre-calc-media-banner chalre-calc-media-banner--find" aria-label="Passenger ride story">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={findSlides[findIndex].image}
                          className="chalre-media-slide"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.02 }}
                          transition={{ duration: 0.45 }}
                        >
                          <img
                            src={findSlides[findIndex].image}
                            alt={findSlides[findIndex].title}
                            className="chalre-media-img"
                          />
                          <div className="chalre-media-overlay" />
                          <div className="chalre-media-content">
                            <span className="chalre-media-badge">
                              {findSlides[findIndex].tag}
                            </span>
                            <p className="chalre-media-caption">
                              {findSlides[findIndex].title}
                            </p>
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      {/* Progress Dots */}
                      <div className="chalre-media-dots" role="tablist" aria-label="Slide dots">
                        {findSlides.map((slide, idx) => (
                          <button
                            key={idx}
                            type="button"
                            role="tab"
                            aria-label={`Show ${slide.tag}`}
                            aria-selected={findIndex === idx}
                            className={`chalre-media-dot ${findIndex === idx ? "chalre-media-dot--active" : ""}`}
                            onClick={() => {
                              setFindIndex(idx);
                              setVehicle(slide.vehicle);
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Passenger Input 1: Trips per Month */}
                    <div className="chalre-simple-group">
                      <div className="chalre-group-header">
                        <label htmlFor="pass-trips-slider" className="chalre-simple-label">
                          Trips per month
                        </label>
                        <span className="chalre-simple-badge">{passengerTrips} trips</span>
                      </div>
                      <input
                        id="pass-trips-slider"
                        type="range"
                        min="10"
                        max="60"
                        step="2"
                        value={passengerTrips}
                        onChange={(e) => setPassengerTrips(Number(e.target.value))}
                        className="chalre-simple-slider"
                      />
                    </div>

                    {/* Passenger Input 2: Alternative Cost */}
                    <div className="chalre-simple-group">
                      <div className="chalre-group-header">
                        <label htmlFor="alt-slider" className="chalre-simple-label">
                          Alternative travel cost / trip
                        </label>
                        <span className="chalre-simple-badge">₹{altCost}</span>
                      </div>
                      <input
                        id="alt-slider"
                        type="range"
                        min="50"
                        max="350"
                        step="10"
                        value={altCost}
                        onChange={(e) => setAltCost(Number(e.target.value))}
                        className="chalre-simple-slider"
                      />
                    </div>

                    {/* Passenger Input 3: Shared Ride Cost */}
                    <div className="chalre-simple-group">
                      <div className="chalre-group-header">
                        <label htmlFor="shared-slider" className="chalre-simple-label">
                          ChalRe shared ride / trip
                        </label>
                        <span className="chalre-simple-badge">₹{sharedCost}</span>
                      </div>
                      <input
                        id="shared-slider"
                        type="range"
                        min="30"
                        max="250"
                        step="10"
                        value={sharedCost}
                        onChange={(e) => setSharedCost(Number(e.target.value))}
                        className="chalre-simple-slider"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Clean, Bold Result Box */}
            <div className="chalre-calc-result-box">
              
              <div className="chalre-result-content">
                <span className="chalre-result-tag">
                  <Sparkles size={13} />
                  Estimated Monthly Savings
                </span>

                <div className="chalre-result-amount">
                  {purpose === "offer" ? (
                    <>
                      ₹{driverMonthly.toLocaleString("en-IN")}
                      <span className="chalre-result-unit">/mo</span>
                    </>
                  ) : passengerMonthly >= 0 ? (
                    <>
                      ₹{passengerMonthly.toLocaleString("en-IN")}
                      <span className="chalre-result-unit">/mo</span>
                    </>
                  ) : (
                    <>
                      +₹{Math.abs(passengerMonthly).toLocaleString("en-IN")}
                      <span className="chalre-result-unit">/mo</span>
                    </>
                  )}
                </div>

                <div className="chalre-result-sub">
                  {purpose === "offer"
                    ? `Estimated annual savings: ₹${driverYearly.toLocaleString("en-IN")}/yr by sharing your regular commute.`
                    : passengerMonthly >= 0
                    ? `Save ≈ ₹${passengerYearly.toLocaleString("en-IN")}/yr (₹${savingPerTrip} saved × ${passengerTrips} trips/mo).`
                    : `Shared ride is ₹${Math.abs(savingPerTrip)} more per trip.`}
                </div>

                {/* Animated micro-road: Car approaches, stops, passenger sits, car drives ahead */}
                <div className="chalre-mini-road" aria-hidden="true">
                  <div className="chalre-mini-road-dashes" />

                  {/* Roadside pickup marker */}
                  <div className="chalre-mini-pickup-marker">
                    <span className="chalre-mini-pickup-dot" />
                  </div>

                  {/* Waiting passenger on roadside */}
                  <motion.div
                    className="chalre-mini-passenger"
                    key={`passenger-${vehicle}-${purpose}`}
                    animate={{
                      left: ["48%", "48%", "40%", "40%", "48%"],
                      scale: [1, 1, 0, 0, 1],
                      opacity: [1, 1, 0, 0, 1]
                    }}
                    transition={{
                      duration: 5.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      times: [0, 0.36, 0.48, 0.94, 1]
                    }}
                  >
                    <User size={13} strokeWidth={2.5} />
                  </motion.div>

                  {/* Vehicle: stops at 34%, passenger gets in, vehicle drives off */}
                  <motion.div
                    className="chalre-mini-car"
                    key={`vehicle-${vehicle}-${purpose}`}
                    animate={{
                      left: ["-14%", "34%", "34%", "106%", "106%"]
                    }}
                    transition={{
                      duration: 5.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      times: [0, 0.34, 0.54, 0.92, 1]
                    }}
                  >
                    {vehicle === "car" ? <Car size={16} /> : <Bike size={16} />}

                    {/* Passenger boarded badge */}
                    <motion.span
                      className="chalre-mini-boarded-badge"
                      animate={{
                        scale: [0, 0, 1, 1, 0],
                        opacity: [0, 0, 1, 1, 0]
                      }}
                      transition={{
                        duration: 5.5,
                        repeat: Infinity,
                        times: [0, 0.44, 0.52, 0.92, 0.95]
                      }}
                    >
                      +1
                    </motion.span>
                  </motion.div>
                </div>

                {/* Commute Value Breakdown to balance card height */}
                <div className="chalre-breakdown-list">
                  {purpose === "offer" ? (
                    <>
                      <div className="chalre-breakdown-item">
                        <span className="chalre-breakdown-dot" />
                        <span className="chalre-breakdown-label">Daily Fuel Offset:</span>
                        <span className="chalre-breakdown-val">~₹{dailySavings} / day</span>
                      </div>
                      <div className="chalre-breakdown-item">
                        <span className="chalre-breakdown-dot" />
                        <span className="chalre-breakdown-label">Monthly Commute:</span>
                        <span className="chalre-breakdown-val">~{monthlyKm.toLocaleString("en-IN")} km</span>
                      </div>
                      <div className="chalre-breakdown-item">
                        <span className="chalre-breakdown-dot" />
                        <span className="chalre-breakdown-label">CO₂ Offset:</span>
                        <span className="chalre-breakdown-val">~{Math.round(monthlyKm * 0.12)} kg / mo</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="chalre-breakdown-item">
                        <span className="chalre-breakdown-dot" />
                        <span className="chalre-breakdown-label">ChalRe Shared Ride:</span>
                        <span className="chalre-breakdown-val">₹{sharedCost} / trip</span>
                      </div>
                      <div className="chalre-breakdown-item">
                        <span className="chalre-breakdown-dot" />
                        <span className="chalre-breakdown-label">Alternative Travel:</span>
                        <span className="chalre-breakdown-val">₹{altCost} / trip</span>
                      </div>
                      <div className="chalre-breakdown-item">
                        <span className="chalre-breakdown-dot" />
                        <span className="chalre-breakdown-label">Savings Per Trip:</span>
                        <span className="chalre-breakdown-val">
                          {savingPerTrip >= 0 ? `₹${savingPerTrip} / trip` : `+₹${Math.abs(savingPerTrip)} / trip`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="chalre-minimal-cta-btn"
                onClick={handleCta}
              >
                <span>{purpose === "offer" ? "Offer a Ride" : "Find a Ride"}</span>
                <ArrowRight size={15} />
              </button>

            </div>

          </div>

          {/* Bottom Footnote */}
          <div className="chalre-calc-footnote">
            <Info size={13} />
            <span>
              Estimates are calculated client-side based on standard commute fuel offset (~24 travel days/month). Savings help offset travel expenses.
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}
