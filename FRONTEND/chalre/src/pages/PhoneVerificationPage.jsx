// src/pages/PhoneVerificationPage.jsx
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/phoneVerification.css";
import { Phone, Shield, ArrowLeft } from "lucide-react";

export default function PhoneVerificationPage() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Verify OTP
  const [phone, setPhone] = useState(user?.phone || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState(""); // For development - remove in production

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/otp/generate", {
        phone: phone.trim(),
        email: user.email
      });
      
      setOtpSent(true);
      setStep(2);
      setSuccess("OTP sent to " + phone);
      // In development, show OTP. Remove in production!
      if (res.data.otp) {
        setReceivedOtp(res.data.otp);
      }
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to send OTP";
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/otp/verify", {
        phone: phone.trim(),
        email: user.email,
        otp: otp.trim()
      });
      
      setSuccess("Phone number verified successfully!");
      
      // Update user context
      const userRes = await api.get("/auth/me");
      setUser(userRes.data);
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to verify OTP";
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
    <div className="phone-verification-wrapper">
      <div className="verification-card">
        <div className="verification-header">
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={20} />
          </button>
          <h2>Verify Phone Number</h2>
        </div>

        {step === 1 ? (
          <div className="verification-step">
            <div className="step-icon">
              <Phone size={48} />
            </div>
            <p className="step-description">
              Enter your phone number to receive a verification code
            </p>

            <form onSubmit={handleSendOtp} className="verification-form">
              <div className="form-group">
                <label>
                  <Phone size={18} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          </div>
        ) : (
          <div className="verification-step">
            <div className="step-icon">
              <Shield size={48} />
            </div>
            <p className="step-description">
              Enter the 6-digit code sent to <strong>{phone}</strong>
            </p>

            {receivedOtp && (
              <div className="dev-otp-hint">
                <strong>Development Mode:</strong> Your OTP is <code>{receivedOtp}</code>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="verification-form">
              <div className="form-group">
                <label>OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  disabled={loading}
                  className="otp-input"
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setError("");
                    setSuccess("");
                  }}
                  disabled={loading}
                >
                  Change Number
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </form>

            <button
              className="resend-link"
              onClick={handleSendOtp}
              disabled={loading}
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
