// src/pages/Home.jsx
import "../styles/Home.css";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Footer from "../components/Footer";
import CustomDatePicker from "../components/CustomDatePicker";
export default function Home() {
  const navigate = useNavigate();

  const [search, setSearch] = useState({
    from: "",
    to: "",
    date: "",
    passengers: 1,
  });

  const updateSearch = (field, value) => {
    setSearch((prev) => ({ ...prev, [field]: value }));
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 120);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="home-wrapper">
      {/* HERO SECTION */}
      <header className="hero">
        <h1>Miles Better Together </h1>
        <p>
          A modern way to connect with nearby people. Safe, fast & affordable travel.
        </p>

        <div className={`home-search-bar ${scrolled ? "search-sticky" : ""}`}>
  <div className="search-item location-from">
    <LocationAutocomplete
      value={search.from}
      onChange={(val) => updateSearch("from", val)}
      placeholder="Leaving From"
    />
  </div>

  <div className="divider" />

  <div className="search-item location-to">
    <LocationAutocomplete
      value={search.to}
      onChange={(val) => updateSearch("to", val)}
      placeholder="Going to"
    />
  </div>

  <div className="divider" />

<div className="search-item small cdp-search-item">
  <CustomDatePicker
    value={search.date}
    onChange={(val) => updateSearch("date", val)}
    placeholder="Date"
  />
</div>

  <div className="divider" />

  <div className="search-item small seats-input">
    <div className="seat-input">
      <span className="seat-label">Seats </span>
      <input
        type="number"
        min="1"
        max="10"
        value={search.passengers}
        onChange={(e) =>
          updateSearch("passengers", e.target.value)
        }
      />
    </div>
  </div>

  <button
    className="search-action"
    onClick={() => {
      // Validate from and to
      if (!search.from.trim() || !search.to.trim()) {
        alert("Please enter both 'Leaving From' and 'Going to' locations.");
        return;
      }
      // Navigate to /search with state
      navigate("/search", { state: { from: search.from, to: search.to, date: search.date, passengers: search.passengers } });
    }}
  >
    Search
  </button>
</div>
</header>
<div className="divider gradient"></div>

     {/* FEATURES SECTION */}
<section className="features">
  <div className="feature-card">
    <div className="feature-icon">✔</div>
    <h3>Verified Users</h3>
    <p>Every rider undergoes document verification for safety and trust.</p>
  </div>

  <div className="feature-card">
    <div className="feature-icon">🤖</div>
    <h3>Smart Matching</h3>
    <p>
      Find rides going your way in seconds using our auto-matching engine.
    </p>
  </div>

  <div className="feature-card">
    <div className="feature-icon">🛡️</div>
    <h3>Secure Payments</h3>
    <p>
      Pay securely with multiple payment options. Fast and reliable transactions.
    </p>
  </div>
        <div class="divider gradient" />
      </section>

      <div className="ride-sharehome">

        <h2 className="h2hr">Share your ride. Save more.</h2>
        <p className="phr">Post your trip, fill empty seats, and split fuel and toll costs effortlessly.</p>
        <button className="btn-hssr" onClick={() => navigate("/offer")} >Share your ride</button>


      </div>
      <div class="divider gradient" />

      <div className="fraud-div">
        <div className="fraud-image">
          <img src="/fraud.png" alt="Stay safe from scams" />
        </div>

        <div className="fraud-content">
          <h2>Your safety matters to us.</h2>
          <p>
            At ChalRe, we continuously work to keep our platform safe and secure.
            If scams occur, we make sure you know how to identify, avoid, and report them.
            Follow these tips to help protect yourself.
          </p>

          <button className="fraud-btn" onClick={() => navigate("/scam")}>
      Learn more
      <span className="btn-icon">→</span>
    </button>
        </div>
      </div>

      <div class="divider gradient" />
      <section className="why-chalre">
        <div className="why-header">
          <h2>Why ChalRe?</h2>
          <p>What we do differently for you</p>
        </div>

        <div className="why-grid">
          <div className="why-card">
            <span className="why-icon">🚗 🏍️</span>
            <h3>Bike & Car Options</h3>
            <p>
              Choose between bike and car rides for faster, flexible, and
              comfortable travel — perfect for short and local trips.
            </p>
          </div>

          <div className="why-card">
            <span className="why-icon">📍</span>
            <h3>Strong Local Focus</h3>
            <p>
              From small villages to narrow lanes and nearby towns, ChalRe makes
              booking or offering local rides simple and accessible.
            </p>
          </div>

          <div className="why-card">
            <span className="why-icon">🛣️</span>
            <h3>Long-Distance Sharing</h3>
            <p>
              We also support long-route ride sharing, helping you travel farther
              together at a lower cost and with more convenience.
            </p>
          </div>
        </div>
      </section>

      <div class="divider gradient" />
      <div className="help-centre">
        <h2 className="help-title">ChalRe Help Centre</h2>

        <div className="help-grid">
          {/* LEFT COLUMN */}
          <div className="help-col">
            <div className="help-item">
              <h4>How can I reserve a ChalRe seat?</h4>
              <p>
                You can find and book a ChalRe ride using our mobile app or website.
                Just enter your route, select your travel date, and choose the ride
                that fits you best. Some rides confirm instantly, while others may
                need the driver’s approval. Either way, booking is quick and simple.
              </p>
            </div>

            <div className="help-item">
              <h4>Can I cancel a booked ride?</h4>
              <p>
                Plans changed? No worries. You can cancel your ride anytime from the
                “Your rides” section in the app. Cancelling early helps drivers find
                other passengers. Refunds depend on how early you cancel — cancelling
                well before departure may get you most of your money back.
              </p>
            </div>

          
          </div>

          {/* RIGHT COLUMN */}
          <div className="help-col">
            <div className="help-item">
              <h4>How do I offer a ChalRe ride?</h4>
              <p>
                Posting a ride is easy. Use the app or website to enter your start and
                end points, travel date and time, available seats, and price per seat.
                You can choose whether bookings are automatic or need approval, then
                publish your ride and you’re good to go.
              </p>
            </div>

            <div className="help-item">
              <h4>Why choose ChalRe?</h4>
              <p>
                <p>
                  Ride sharing saves money, reduces traffic, and lowers pollution. With Chalre,
                  you can choose both car and bike rides, making local travel faster and more
                  affordable. Fewer vehicles on the road also mean a safer and smoother
                  experience. Bike rides are especially useful for short, local travel,
                  offering faster movement through traffic.
                </p>

              </p>
            </div>

          
          </div>
        </div>

        <div className="help-btn-wrap">
          <button className="help-btn" onClick={() => navigate("/help-center")} >Read our Help Centre</button>
        </div>

        <div class="divider gradient" />
      </div>

      <Footer />

    </div>
  );
}



