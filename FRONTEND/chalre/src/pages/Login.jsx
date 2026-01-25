import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { handleError } from "../utils/errorHandler";
import { auth } from "../../Firebfase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import "../styles/auth.css";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      await credential.user.reload();

      if (!credential.user.emailVerified) {
        setLoading(false);
        navigate("/verify-email");
        return;
      }

      const idToken = await credential.user.getIdToken();

      // 🔥 READ TEMP DATA FROM REGISTER
      const payload = {
        idToken,
        name: sessionStorage.getItem("pendingName") || undefined,
        phone: sessionStorage.getItem("pendingPhone") || undefined
      };

      const res = await api.post("/auth/firebase-login", payload);
      const token = res.data.token;

      await login(token);

      // ✅ CLEANUP
      sessionStorage.removeItem("pendingName");
      sessionStorage.removeItem("pendingPhone");

      const storedUser = JSON.parse(localStorage.getItem("user"));

      if (storedUser?.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      const errorMessage =
        handleError(err, { showAlert: false }) ||
        "Login failed. Please try again.";
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

        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={togglePasswordVisibility}
            tabIndex="-1"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p>
          Don't have an account?
          <a href="/register"> Register</a>
        </p>
      </form>
    </div>
  );
}
