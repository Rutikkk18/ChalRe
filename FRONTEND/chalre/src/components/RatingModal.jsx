// src/components/RatingModal.jsx
import { useState } from "react";
import { Star, X } from "lucide-react";
import api from "../api/axios";
import "../styles/ratingModal.css";

export default function RatingModal({ rideId, driverName, onClose, onSuccess }) {
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (stars === 0) {
      setError("Please select a rating");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post(`/ratings/${rideId}`, {
        stars: stars,
        comment: comment.trim() || null
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to submit rating";
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && errorData.error) {
          errorMsg = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Rate Your Ride</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="driver-name">Driver: <strong>{driverName}</strong></p>

          <div className="stars-section">
            <label>Rating</label>
            <div className="stars-container">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="star-btn"
                  onClick={() => setStars(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                >
                  <Star
                    size={32}
                    fill={star <= (hoveredStar || stars) ? "#fbbf24" : "none"}
                    color={star <= (hoveredStar || stars) ? "#fbbf24" : "#d1d5db"}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="rating-text">
                {stars === 1 && "Poor"}
                {stars === 2 && "Fair"}
                {stars === 3 && "Good"}
                {stars === 4 && "Very Good"}
                {stars === 5 && "Excellent"}
              </p>
            )}
          </div>

          <div className="comment-section">
            <label htmlFor="comment">Comment (Optional)</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows="4"
              maxLength={500}
            />
            <span className="char-count">{comment.length}/500</span>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            onClick={handleSubmit}
            disabled={loading || stars === 0}
          >
            {loading ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
