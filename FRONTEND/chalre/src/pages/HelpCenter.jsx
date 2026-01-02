import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, HelpCircle, Mail } from "lucide-react";
import "../styles/HelpCenter.css";

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItem, setExpandedItem] = useState(null);

  const faqItems = [
    {
      id: 1,
      question: "How to reserve a ChalRe seat?",
      answer: "You can find and book a ChalRe ride using our mobile app or website. Just enter your route, select your travel date, and choose the ride that fits you best. Some rides confirm instantly, while others may need the driver's approval. Either way, booking is quick and simple."
    },
    {
      id: 2,
      question: "How do I offer a ChalRe ride?",
      answer: "Posting a ride is easy. Use the app or website to enter your start and end points, travel date and time, available seats, and price per seat. You can choose whether bookings are automatic or need approval, then publish your ride and you're good to go."
    },
    {
      id: 3,
      question: "Can I cancel a booked ride?",
      answer: "Plans changed? No worries. You can cancel your ride anytime from the 'Your rides' section in the app. Cancelling early helps drivers find other passengers. Refunds depend on how early you cancel — cancelling well before departure may get you most of your money back."
    },
    {
      id: 4,
      question: "What determines the price of a ride?",
      answer: "Ride prices vary based on distance, timing, and demand. Drivers set the cost per seat, so prices can differ between trips. You can browse popular routes to get an idea of typical prices or search directly for your journey."
    },
    {
      id: 5,
      question: "Why choose ChalRe?",
      answer: "Ride sharing saves money, reduces traffic, and lowers pollution. With ChalRe, you can choose both car and bike rides, making local travel faster and more affordable. Fewer vehicles on the road also mean a safer and smoother experience. Bike rides are especially useful for short, local travel, offering faster movement through traffic."
    },
    {
      id: 6,
      question: "How do I get started with ChalRe?",
      answer: "Getting started is free and easy. Create an account, add a few basic details, and you're ready to book or publish rides. Everything can be managed directly through our app or website."
    }
  ];

  const toggleItem = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const filteredItems = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="help-center-container">
      {/* HEADER */}
      <div className="help-center-header">
        <h1>Help Center</h1>
        <p className="help-center-subtitle">Find answers and learn how to use ChalRe</p>
      </div>

      {/* SEARCH BAR */}
      <div className="help-center-search">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* FAQ SECTION */}
      <div className="help-center-content">
        <div className="faq-section">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          
          {filteredItems.length === 0 ? (
            <div className="no-results">
              <HelpCircle size={48} />
              <p>No results found for "{searchQuery}"</p>
              <p className="no-results-hint">Try searching with different keywords</p>
            </div>
          ) : (
            <div className="faq-list">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`faq-item ${expandedItem === item.id ? "expanded" : ""}`}
                >
                  <div
                    className="faq-question"
                    onClick={() => toggleItem(item.id)}
                  >
                    <h3>{item.question}</h3>
                    <span className="faq-toggle">
                      {expandedItem === item.id ? "−" : "+"}
                    </span>
                  </div>
                  {expandedItem === item.id && (
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CONTACT SUPPORT SECTION */}
      <div className="help-center-support">
        <div className="support-card">
          <HelpCircle size={32} className="support-icon" />
          <h3>Still need help?</h3>
          <p>Can't find what you're looking for? Our support team is here to help.</p>
          <div className="support-contact">
            <Mail size={18} />
            <a href="mailto:chalre@gmail.com"></a>chalre@gmail.com
          </div>
        </div>
      </div>

      {/* BACK BUTTON */}
      <div className="help-center-actions">
        <button
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}