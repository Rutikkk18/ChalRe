import { useState, useEffect } from "react";
import api from "../api/axios";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function BankDetailsForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("");

  useEffect(() => {
    checkBankDetails();
  }, []);

  const checkBankDetails = async () => {
    try {
      const res = await api.get("/payouts/bank-details/check");
      setHasBankDetails(res.data.hasBankDetails);
      
      if (res.data.hasBankDetails) {
        fetchBankDetails();
      }
    } catch (err) {
      console.error("Error checking bank details:", err);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const res = await api.get("/payouts/bank-details");
      setFormData({
        accountHolderName: res.data.accountHolderName || "",
        bankName: res.data.bankName || "",
        accountNumber: res.data.accountNumber || "", // This will be masked
        ifscCode: res.data.ifscCode || "",
      });
    } catch (err) {
      console.error("Error fetching bank details:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validation
    if (!formData.accountHolderName.trim()) {
      setError("Account holder name is required");
      setLoading(false);
      return;
    }
    if (!formData.bankName.trim()) {
      setError("Bank name is required");
      setLoading(false);
      return;
    }
    if (!formData.accountNumber.trim() || !/^\d{9,18}$/.test(formData.accountNumber)) {
      setError("Account number must be 9-18 digits");
      setLoading(false);
      return;
    }
    if (!formData.ifscCode.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
      setError("Invalid IFSC code format. Format: AAAA0XXXXXX");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        ifscCode: formData.ifscCode.toUpperCase(),
      };

      await api.post("/payouts/bank-details", payload);
      setSuccess("Bank details saved successfully!");
      setHasBankDetails(true);
      if (onSuccess) onSuccess();
      
      // Refresh bank details to get masked account number
      setTimeout(() => {
        fetchBankDetails();
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to save bank details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bank-details-form">
      <h3>Bank Account Details</h3>
      <p className="form-description">
        Add your bank account details to receive payouts. Your account number will be securely stored.
      </p>

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

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="accountHolderName">Account Holder Name *</label>
          <input
            type="text"
            id="accountHolderName"
            name="accountHolderName"
            value={formData.accountHolderName}
            onChange={handleChange}
            placeholder="Enter account holder name"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="bankName">Bank Name *</label>
          <input
            type="text"
            id="bankName"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            placeholder="Enter bank name"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="accountNumber">Account Number *</label>
          <input
            type="text"
            id="accountNumber"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            placeholder="Enter account number (9-18 digits)"
            required
            disabled={loading || (hasBankDetails && formData.accountNumber.startsWith("****"))}
            pattern="[0-9]{9,18}"
          />
          {hasBankDetails && formData.accountNumber.startsWith("****") && (
            <small className="form-hint">Account number is masked for security</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="ifscCode">IFSC Code *</label>
          <input
            type="text"
            id="ifscCode"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            placeholder="Enter IFSC code (e.g., HDFC0001234)"
            required
            disabled={loading}
            pattern="[A-Z]{4}0[A-Z0-9]{6}"
            style={{ textTransform: "uppercase" }}
          />
          <small className="form-hint">Format: AAAA0XXXXXX</small>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Saving..." : hasBankDetails ? "Update Bank Details" : "Add Bank Details"}
        </button>
      </form>
    </div>
  );
}

