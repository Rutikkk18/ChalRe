import { useState, useEffect } from "react";
import api from "../api/axios";
import { DollarSign, TrendingUp, Wallet, AlertCircle } from "lucide-react";

export default function EarningsDisplay({ onRequestPayout }) {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payouts/earnings");
      setEarnings(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch earnings");
      console.error("Error fetching earnings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (paise) => {
    if (paise === null || paise === undefined) return "₹0.00";
    return `₹${(paise / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="earnings-display">
        <h3>Earnings</h3>
        <div className="loading">Loading earnings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="earnings-display">
        <h3>Earnings</h3>
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      </div>
    );
  }

  if (!earnings) {
    return null;
  }

  return (
    <div className="earnings-display">
      <h3>Your Earnings</h3>
      
      <div className="earnings-grid">
        <div className="earnings-card total">
          <div className="earnings-icon">
            <TrendingUp size={24} />
          </div>
          <div className="earnings-info">
            <span className="earnings-label">Total Earnings</span>
            <span className="earnings-amount">{formatCurrency(earnings.totalEarnings)}</span>
          </div>
        </div>

        <div className="earnings-card pending">
          <div className="earnings-icon">
            <Wallet size={24} />
          </div>
          <div className="earnings-info">
            <span className="earnings-label">Pending Payout</span>
            <span className="earnings-amount">{formatCurrency(earnings.pendingPayout)}</span>
          </div>
        </div>

        <div className="earnings-card paid">
          <div className="earnings-icon">
            <DollarSign size={24} />
          </div>
          <div className="earnings-info">
            <span className="earnings-label">Total Paid</span>
            <span className="earnings-amount">{formatCurrency(earnings.paidAmount)}</span>
          </div>
        </div>
      </div>

      {earnings.pendingPayout > 0 && (
        <div className="payout-action">
          <p className="payout-hint">
            You have {formatCurrency(earnings.pendingPayout)} available for payout
          </p>
          <button
            className="btn-primary"
            onClick={() => onRequestPayout && onRequestPayout()}
          >
            Request Payout
          </button>
        </div>
      )}

      {earnings.platformCommission > 0 && (
        <div className="commission-info">
          <small>
            Platform Commission: {formatCurrency(earnings.platformCommission)} (
            {earnings.commissionPercentage || 10}%)
          </small>
        </div>
      )}
    </div>
  );
}

