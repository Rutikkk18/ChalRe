import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../Firebfase";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import "../styles/auth.css";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const autoLoginAttempted = useRef(false);
  const checkIntervalRef = useRef(null);
  const authStateUnsubscribeRef = useRef(null);

  // Auto-login function when email is verified
  const performAutoLogin = async (user) => {
    if (autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;

    try {
      const idToken = await user.getIdToken();
      const registrationProfile = localStorage.getItem("registrationProfile");
      const parsedProfile = registrationProfile ? JSON.parse(registrationProfile) : {};

      const payload = {
        idToken,
        phone: parsedProfile.phone || undefined,
        name: parsedProfile.name || undefined
      };

      const res = await api.post("/auth/firebase-login", payload);
      const token = res.data.token;

      await login(token);
      localStorage.removeItem("registrationProfile");
      navigate("/dashboard");
    } catch (err) {
      console.error("Auto-login failed:", err);
      autoLoginAttempted.current = false;
    }
  };

  const checkEmailVerification = async (user) => {
    if (!user) return false;

    try {
      await user.reload();

      if (user.emailVerified) {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        await performAutoLogin(user);
        return true;
      }
    } catch (err) {
      console.error("Error checking email verification:", err);
    }

    return false;
  };

  useEffect(() => {
    setError("");

    const currentUser = auth.currentUser;
    if (currentUser) {
      setMessage("Please verify your email to continue. Check your inbox.");
      checkEmailVerification(currentUser);
    } else {
      setMessage("Verification email sent. Please check your inbox (and spam folder if needed) to verify your account, then login.");
    }

    authStateUnsubscribeRef.current = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        await performAutoLogin(user);
      } else if (user && !user.emailVerified) {
        setMessage("Please verify your email to continue. Check your inbox.");
      }
    });

    if (currentUser && !currentUser.emailVerified) {
      checkIntervalRef.current = setInterval(() => {
        const user = auth.currentUser;
        if (user) {
          checkEmailVerification(user);
        }
      }, 3000);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (authStateUnsubscribeRef.current) {
        authStateUnsubscribeRef.current();
      }
    };
  }, []);

  const handleResend = async () => {
    setError("");
    setMessage("");

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Please login again to resend the verification email.");
      return;
    }

    try {
      setLoading(true);
      await sendEmailVerification(currentUser);
      setMessage("Verification email re-sent. Check your inbox or spam folder.");
    } catch (err) {
      setError(err?.message || "Failed to resend verification email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-login-container">
      <div className="auth-form">
        <h2>Verify Your Email ✉️</h2>

        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}

        <p className="auth-p">
          We sent a verification email to your inbox. After verifying your email,
          you'll be automatically logged in.
        </p>

        <button
          className="auth-button-submit"
          onClick={handleResend}
          disabled={loading}
        >
          {loading ? "Sending..." : "Resend Verification Email"}
        </button>

        <p className="auth-p">
          Already verified?{" "}
          <span
            className="auth-span"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </span>
        </p>
      </div>
    </div>
  );
}