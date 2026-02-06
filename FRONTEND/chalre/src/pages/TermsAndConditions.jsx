import "../styles/TermsAndConditions.css";

const TermsAndConditions = () => {
  return (
    <div className="terms-container">
      <h1>Terms & Conditions</h1>

      <p className="terms-updated">
        Last updated: January 2026
      </p>

      <section className="terms-section">
        <h2>1. Introduction</h2>
        <p>
          Welcome to ChalRe. By accessing or using our website or mobile
          application, you agree to comply with and be bound by these
          Terms & Conditions.
        </p>
      </section>

      <section className="terms-section">
        <h2>2. About ChalRe</h2>
        <p>
          ChalRe is a ride-sharing platform that connects people traveling in
          the same direction. ChalRe does not provide transportation services
          and is not responsible for the conduct of users.
        </p>
      </section>

      <section className="terms-section">
        <h2>3. User Responsibilities</h2>
        <p>
          Users must provide accurate information, follow local laws, and
          behave respectfully. Any misuse of the platform may result in
          account suspension or termination.
        </p>
      </section>

      <section className="terms-section">
        <h2>4. Bookings & Payments</h2>
        <p>
          Ride prices are set by ride owners. ChalRe only facilitates
          communication and booking between users and is not responsible
          for payments made outside the platform.
        </p>
      </section>

      <section className="terms-section">
        <h2>5. Cancellations</h2>
        <p>
          Cancellation and refund policies may vary depending on the ride.
          Users are encouraged to review ride details before booking.
        </p>
      </section>

      <section className="terms-section">
        <h2>6. Limitation of Liability</h2>
        <p>
          ChalRe shall not be liable for any direct or indirect damages
          arising from the use of the platform, including travel incidents
          or disputes between users.
        </p>
      </section>

      <section className="terms-section">
        <h2>7. Changes to Terms</h2>
        <p>
          ChalRe reserves the right to update these Terms & Conditions at
          any time. Continued use of the platform indicates acceptance
          of the updated terms.
        </p>
      </section>
    </div>
  );
};

export default TermsAndConditions;
