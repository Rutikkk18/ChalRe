import { useState, useEffect } from "react";
import api from "../api/axios";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

export default function PayoutHistory() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPayoutHistory();
  }, []);

  const fetchPayoutHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payouts/history");
      setPayouts(res.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch payout history");
      console.error("Error fetching payout history:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (paise) => {
    if (paise === null || paise === undefined) return "₹0.00";
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
      case "PROCESSED":
        return <CheckCircle size={16} className="status-icon success" />;
      case "FAILED":
        return <XCircle size={16} className="status-icon failed" />;
      case "PENDING":
      case "PROCESSING":
      case "QUEUED":
        return <Clock size={16} className="status-icon pending" />;
      default:
        return <AlertCircle size={16} className="status-icon unknown" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
      case "PROCESSED":
        return "status-success";
      case "FAILED":
        return "status-failed";
      case "PENDING":
      case "PROCESSING":
      case "QUEUED":
        return "status-pending";
      default:
        return "status-unknown";
    }
  };

  if (loading) {
    return (
      <div className="payout-history">
        <h3>Payout History</h3>
        <div className="loading">Loading payout history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payout-history">
        <h3>Payout History</h3>
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="payout-history">
      <h3>Payout History</h3>
      
      {payouts.length === 0 ? (
        <div className="empty-state">
          <p>No payout history yet. Your payouts will appear here once you request them.</p>
        </div>
      ) : (
        <div className="payout-list">
          {payouts.map((payout) => (
            <div key={payout.id} className="payout-item">
              <div className="payout-header">
                <div className="payout-amount">{formatCurrency(payout.amount)}</div>
                <div className={`payout-status ${getStatusClass(payout.status)}`}>
                  {getStatusIcon(payout.status)}
                  <span>{payout.status}</span>
                </div>
              </div>
              
              <div className="payout-details">
                <div className="payout-date">
                  <strong>Initiated:</strong> {formatDate(payout.initiatedAt)}
                </div>
                {payout.processedAt && (
                  <div className="payout-date">
                    <strong>Processed:</strong> {formatDate(payout.processedAt)}
                  </div>
                )}
                {payout.razorpayPayoutId && (
                  <div className="payout-id">
                    <strong>Transaction ID:</strong> {payout.razorpayPayoutId}
                  </div>
                )}
                {payout.failureReason && (
                  <div className="payout-failure">
                    <strong>Failure Reason:</strong> {payout.failureReason}
                  </div>
                )}
                {payout.notes && (
                  <div className="payout-notes">
                    <strong>Notes:</strong> {payout.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

