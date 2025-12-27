import { useState } from "react";
import api from "../api/axios";
import { X, AlertCircle, CheckCircle } from "lucide-react";

export default function PayoutRequestModal({ isOpen, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {};
      if (amount && parseFloat(amount) > 0) {
        // Convert rupees to paise
        payload.amount = Math.round(parseFloat(amount) * 100);
      }
      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      await api.post("/payouts/initiate", payload);
      setSuccess("Payout request submitted successfully!");
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to initiate payout. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request Payout</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="amount">Amount (₹)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Leave empty to payout all pending earnings"
              min="100"
              step="0.01"
              disabled={loading}
            />
            <small className="form-hint">
              Leave empty to payout all pending earnings. Minimum: ₹100
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this payout"
              rows="3"
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Processing..." : "Request Payout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

