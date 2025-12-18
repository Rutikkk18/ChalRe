import { useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { handleError } from "../utils/errorHandler";
import '../styles/auth.css';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", { email, password });

      const token = res.data.token;

      // MUST WAIT SO USER GETS STORED BEFORE REDIRECT
      await login(token);

      navigate("/dashboard");
    } catch (err) {
      const errorMessage = handleError(err, { showAlert: false });
      setError(errorMessage);
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

        <button type="submit">Login</button>

        <p>
          Don't have an account?
          <a href="/register"> Register</a>
        </p>
      </form>
    </div>
  );
}
