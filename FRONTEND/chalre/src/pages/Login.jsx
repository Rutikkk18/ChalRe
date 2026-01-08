import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { handleError } from "../utils/errorHandler";
import { auth } from "../../Firebfase";
import {
  signInWithEmailAndPassword
} from "firebase/auth";
import "../styles/auth.css";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      
      // Force refresh the Firebase user to get latest emailVerified status
      await credential.user.reload();

      // Check email verification status after reload
      if (!credential.user.emailVerified) {
        // Redirect to verify-email page (do NOT send email again, just show the page)
        // Do NOT show error message - just redirect silently
        setLoading(false);
        navigate("/verify-email");
        return;
      }

      // User is verified - proceed with login
      const idToken = await credential.user.getIdToken();
      const registrationProfile = localStorage.getItem("registrationProfile");
      const parsedProfile = registrationProfile ? JSON.parse(registrationProfile) : {};

      const payload = {
        idToken,
        phone: parsedProfile.phone || undefined,
        name: parsedProfile.name || undefined
      };

      const res = await api.post("/auth/firebase-login", payload);
      console.log("LOGIN RESPONSE", res.data);
      const token = res.data.token;

      // MUST WAIT SO USER GETS STORED BEFORE REDIRECT
      await login(token);

      // Clear registration profile after successful login
      localStorage.removeItem("registrationProfile");

      navigate("/dashboard");
    } catch (err) {
      // Only show error for actual login failures (not for unverified email)
      const errorMessage = handleError(err, { showAlert: false }) || "Login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Login</h2>

        {error && <p className="error">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={loading}>
          Login
        </button>

        <p>
          Don't have an account?
          <a href="/register"> Register</a>
        </p>
      </form>
    </div>
  );
}
