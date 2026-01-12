import React from "react";
import "../styles/Scamm.css";

function Scamm() {
  return (
    <div className="scam-main">

      {/* TOP HERO SECTION */}
      <section className="scam-hero">
        <div className="scam-hero-inner">

          <div className="scam-image">
            <img src="/fraud.png" alt="Stay safe from scams" />
          </div>

          <div className="scam-hero-text">
            <h2>Help us keep you safe from scams</h2>
            <p>
              We work continuously to make our platform secure. Learn how to
              spot, avoid, and report scams to protect yourself.
            </p>
          </div>

        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="scam-content">

       <div className="scam-card">
  <h3 className="scam-title">What you can do to avoid a scam</h3>

  <div className="scam-grid">
    <div className="scam-item">
      <div className="scam-icon">🚫</div>
      <h4>Never visit links sent by drivers</h4>
      <p>
        Avoid clicking on links, phone numbers, or email addresses shared by
        drivers. Scammers may try to move payments outside the app.
      </p>
    </div>

    <div className="scam-item">
      <div className="scam-icon">💵</div>
      <h4>For cash-only rides, always pay in the car</h4>
      <p>
        If your ride requires cash payment, pay only after getting into the
        vehicle. Never send money in advance.
      </p>
    </div>

    <div className="scam-item">
      <div className="scam-icon">📱</div>
      <h4>Only pay the service fee on our app</h4>
      <p>
        Even if a website looks legitimate, never pay outside our app. All
        service fees must be paid securely within the platform.
      </p>
    </div>
  </div>
</div>


       <div className="scam-card dark">
  <h3 className="scam-dark-title">
    How scammers attempt to steal your money or payment details
  </h3>

  <div className="scam-dark-grid">
    {/* Left block */}
    <div className="scam-dark-item">
      <div className="scam-dark-icon">⚠️</div>
      <h4>Using fake websites that look genuine</h4>
      <p>
        Fraudsters often create websites that closely resemble our platform.
        They may redirect you to these pages and trick you into entering your
        payment information or sending money outside the app.
      </p>
      <p className="scam-note">
        Always complete payments only on our official app or website.
      </p>
    </div>

    {/* Right block */}
    <div className="scam-dark-item">
      <div className="scam-dark-icon">👤</div>
      <h4>Creating fake user profiles</h4>
      <p>
        Some scammers set up new or unverified profiles with no reviews and
        unusually low prices. They might try to contact you outside the
        platform via phone or messaging apps.
      </p>
      <p className="scam-note">
        If you suspect a fake profile, report it immediately.
      </p>
    </div>
  </div>
</div>
<div className="scam-action-section">
  <h2 className="scam-action-title">
  What to do if you suspect a scam
  </h2>

  <div className="scam-action-grid">
    <div className="scam-action-item">
      <h4>If a driver shares a payment link</h4>
      <p>
        You can reply:
“I don’t feel safe using external links. I’ll stick to the platform’s rules and pay in cash during the ride.”
      </p>
    </div>

    <div className="scam-action-item">
      <h4>If a driver asks you to pay before the trip</h4>
      <p>
        You can reply:
“I only make payments at the start of the journey, in the car. I don’t pay online in advance.”
      </p>
    </div>

    <div className="scam-action-item">
      <h4>If a driver demands additional fees</h4>
      <p>
       You can reply:
“The service charge has already been paid through the app. I will pay only the agreed fare in cash at departure.”
      </p>
    </div>
  </div>
</div>

<div className="security-section">
      <h2 className="security-title">Online security tips</h2>

      <div className="security-block">
        <h4>Strong passwords</h4>
        <p>
          Create passwords with at least 8 characters, combining letters,
          numbers, and special symbols. Using unique and complex passwords
          across all your accounts helps reduce security risks.
        </p>
      </div>

      <hr />

      <div className="security-block">
        <h4>Staying safe online</h4>
        <ul>
          <li>
            <strong>Check for a secure connection:</strong> Ensure the website
            starts with <code>https://</code> and shows a lock icon.
          </li>
          <li>
            <strong>Confirm the website address:</strong> Always verify the full
            URL matches the official platform before entering any details.
          </li>
          <li>
            <strong>Use your own device:</strong> Avoid signing in on shared or
            public devices.
          </li>
          <li>
            <strong>Keep everything updated:</strong> Regular updates improve
            security and protect against vulnerabilities.
          </li>
        </ul>
      </div>

      <hr />

      <div className="security-block">
        <h4>Payments and messages outside the platform</h4>
        <ul>
          <li>
            Communicate only within the app and avoid switching to external
            messaging platforms before booking.
          </li>
          <li>
            Never share personal details such as phone numbers, emails, or
            payment information.
          </li>
          <li>
            Do not click on links received through suspicious or unexpected
            messages.
          </li>
        </ul>
      </div>

      <div className="security-btn">
        <button onClick={() => navigate("/help-center")} >Visit our Help Centre</button>
      </div>
    </div>
  );


        <div className="scam-card">
          <h3>Think you’re being scammed?</h3>
          <p className="sc-p">
            Stop communication immediately and report the user so we can take
            action.
          </p>
          <button className="scam-btn">Report a scam</button>
        </div>


      

     
       
      </section>

    </div>
    
  );
}

export default Scamm;
