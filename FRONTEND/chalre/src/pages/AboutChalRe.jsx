import "../styles/AboutChalRe.css";

const AboutChalRe = () => {
  return (
    <div className="about-container">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-content">
          <h1>About ChalRe</h1>
          <p>
            A community-based ride-sharing platform designed to make
            everyday travel affordable, social, and sustainable.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-section">
        <div className="section-content">
          <h2>Our Mission</h2>
          <p>
            We connect people traveling in the same direction to share rides,
            reduce travel costs, and minimize environmental impact.
            ChalRe is built for local and intercity travel across India.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="about-section how-it-works">
        <div className="section-content">
          <h2>How ChalRe Works</h2>
          <div className="about-steps">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Offer or Find a Ride</h3>
              <p>
                Users can offer rides if they are traveling or search for available
                rides posted by others.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Search & Confirm</h3>
              <p>
                Select your ride, pay charges online or in cash, and confirm your booking instantly.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Travel Together</h3>
              <p>
                Meet at the agreed pickup point, travel together, and share the
                journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why ChalRe */}
      <section className="about-section why-section">
        <div className="section-content">
          <h2>Why Choose ChalRe?</h2>
          <ul className="about-list">
            <li>
              <span className="check-icon">✓</span>
              <span>Affordable shared travel</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Built for local Indian routes</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Simple booking & approvals</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Community-driven & transparent</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Reduces traffic and pollution</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Vision */}
      <section className="about-section vision-section">
        <div className="section-content">
          <h2>Our Vision</h2>
          <p>
            We believe that every empty seat is a missed opportunity. ChalRe
            envisions a future where shared mobility becomes the first choice for
            everyday travel.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutChalRe;