import "../styles/AboutChalRe.css";

const AboutChalRe = () => {
  return (
    <div className="about-container">
      {/* Hero Section */}
      <section className="about-hero">
        <h1>About ChalRe</h1>
        <p>
          ChalRe is a community-based ride-sharing platform designed to make
          everyday travel affordable, social, and sustainable.
        </p>
      </section>

      {/* Mission Section */}
      <section className="about-section">
        <h2>Our Mission</h2>
        <p>
          We aim to connect people traveling in the same direction so they can
          share rides, reduce travel costs, and minimize environmental impact.
          ChalRe is built for local and intercity travel across India.
        </p>
      </section>

      {/* How It Works */}
      <section className="about-section light">
        <h2>How ChalRe Works</h2>
        <div className="about-steps">
          <div className="step-card">
            <h3>1. Offer or Find a Ride</h3>
            <p>
              Users can offer rides if they are traveling or search for available
              rides posted by others.
            </p>
          </div>
          <div className="step-card">
            <h3>2. Request & Confirm</h3>
            <p>
              Riders send booking requests. The ride owner reviews and approves
              requests.
            </p>
          </div>
          <div className="step-card">
            <h3>3. Travel Together</h3>
            <p>
              Meet at the agreed pickup point, travel together, and share the
              journey.
            </p>
          </div>
        </div>
      </section>

      {/* Why ChalRe */}
      <section className="about-section">
        <h2>Why Choose ChalRe?</h2>
        <ul className="about-list">
          <li>✔ Affordable shared travel</li>
          <li>✔ Built for local Indian routes</li>
          <li>✔ Simple booking & approvals</li>
          <li>✔ Community-driven & transparent</li>
          <li>✔ Reduces traffic and pollution</li>
        </ul>
      </section>

      {/* Vision */}
      <section className="about-section light">
        <h2>Our Vision</h2>
        <p>
          We believe that every empty seat is a missed opportunity. ChalRe
          envisions a future where shared mobility becomes the first choice for
          everyday travel.
        </p>
      </section>
    </div>
  );
};

export default AboutChalRe;
