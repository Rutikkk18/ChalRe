import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { handleError } from "../utils/errorHandler";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/auth/register", form);
      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      handleError(err, { showAlert: true });
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Register</h2>

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
          placeholder="Phone (Optional)" 
          onChange={handleChange}
          autoComplete="tel"
          pattern="[0-9]{10}"
          title="Please enter a valid 10-digit phone number"
        />

        <button type="submit">Create Account</button>
      </form>
    </div>
  );
}
