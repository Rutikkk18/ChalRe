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
    if (autoLoginAttempted.current) return; // Prevent multiple attempts
    autoLoginAttempted.current = true;

    try {
      // Get ID token from Firebase
      const idToken = await user.getIdToken();
      
      // Get registration profile data
      const registrationProfile = localStorage.getItem("registrationProfile");
      const parsedProfile = registrationProfile ? JSON.parse(registrationProfile) : {};

      // Send to backend to create user and get JWT token
      const payload = {
        idToken,
        phone: parsedProfile.phone || undefined,
        name: parsedProfile.name || undefined
      };

      const res = await api.post("/auth/firebase-login", payload);
      const token = res.data.token;

      // Store token and fetch user via AuthContext
      await login(token);

      // Clear registration profile after successful login
      localStorage.removeItem("registrationProfile");

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Auto-login failed:", err);
      autoLoginAttempted.current = false; // Allow retry on error
      // Don't show error to user, let them manually login if needed
    }
  };

  // Check if user email is verified
  const checkEmailVerification = async (user) => {
    if (!user) return false;

    try {
      // Reload user to get latest emailVerified status
      await user.reload();
      
      if (user.emailVerified) {
        // Stop checking once verified
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        
        // Perform auto-login
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
    
    // Check initial state
    const currentUser = auth.currentUser;
    if (currentUser) {
      setMessage("Please verify your email to continue. Check your inbox.");
      
      // Check immediately if already verified
      checkEmailVerification(currentUser);
    } else {
      setMessage("Verification email sent. Please verify and then login.");
    }

    // Listen to Firebase auth state changes
    authStateUnsubscribeRef.current = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        // User verified via auth state change
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        await performAutoLogin(user);
      } else if (user && !user.emailVerified) {
        setMessage("Please verify your email to continue. Check your inbox.");
      }
    });

    // Periodically check email verification status (every 3 seconds)
    if (currentUser && !currentUser.emailVerified) {
      checkIntervalRef.current = setInterval(() => {
        const user = auth.currentUser;
        if (user) {
          checkEmailVerification(user);
        }
      }, 3000);
    }

    // Cleanup on unmount
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
    <div className="login-container">
      <div className="login-box">
        <h2>Verify Your Email</h2>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <p>
          We sent a verification email to your inbox. After verifying your email,
          you'll be automatically logged in.
        </p>

        <button onClick={handleResend} disabled={loading}>
          {loading ? "Sending..." : "Resend Verification Email"}
        </button>

        <p>
          Already verified?{" "}
          <a href="/login" onClick={(e) => {
            e.preventDefault();
            navigate("/login");
          }}>
            Go to Login
          </a>
        </p>
      </div>
    </div>
  );
}

