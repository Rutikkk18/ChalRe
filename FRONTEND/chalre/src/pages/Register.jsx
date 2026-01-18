import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from "firebase/auth";
import { auth } from "../../Firebfase";
import "../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!form.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    try {
      setLoading(true);

      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // best-effort profile update for display name
      await updateProfile(userCred.user, { displayName: form.name }).catch(() => {});

      await sendEmailVerification(userCred.user);

      localStorage.setItem(
        "registrationProfile",
        JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email
        })
      );

      navigate("/verify-email");
    } catch (err) {
      const message =
        err?.code === "auth/email-already-in-use"
          ? "Email already registered. Please login."
          : err?.code === "auth/weak-password"
            ? "Password should be at least 6 characters."
            : err?.message || "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Register</h2>

        {error && <p className="error">{error}</p>}

        <input 
          name="name" 
          placeholder="Name" 
          onChange={handleChange}
          autoComplete="name"
          required
        />
        <input 
          type="email" 
          name="email" 
          placeholder="Email" 
          onChange={handleChange}
          autoComplete="email"
          required
        />
        <input 
          type="password" 
          name="password" 
          placeholder="Password" 
          onChange={handleChange}
          autoComplete="new-password"
          required
        />
        <input 
          type="tel" 
          name="phone" 
          placeholder="Phone" 
          onChange={handleChange}
          autoComplete="tel"
          pattern="[0-9]{10}"
          title="Please enter a valid 10-digit phone number"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending verification..." : "Create Account"}
        </button>

        
        <p>
          Already have an account?
          <a href="/login"> Login</a>
        </p>
      </form>
    </div>
  );
}
