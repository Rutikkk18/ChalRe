// src/pages/ProfilePage.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/profile.css";
import { User, Mail, Phone, Camera, Save, X } from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    profileImage: ""
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        profileImage: user.profileImage || ""
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError("Image size should be less than 5MB");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post("/upload/driver-doc", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setForm({ ...form, profileImage: res.data.url });
      setSuccess("Image uploaded successfully");
    } catch (err) {
      console.error(err);
      setError("Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.put("/auth/profile", {
        name: form.name,
        phone: form.phone,
        profileImage: form.profileImage
      });

      // Update auth context
      setUser(res.data);
      setSuccess("Profile updated successfully!");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to update profile";
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

  if (!user) {
    return <div className="profile-wrapper">Loading...</div>;
  }

  return (
    <div className="profile-wrapper">
      <div className="profile-card">
        <div className="profile-header">
          <h2>My Profile</h2>
          <button className="btn-close" onClick={() => navigate("/dashboard")}>
            <X size={20} />
          </button>
        </div>

        {/* Profile Image Section */}
        <div className="profile-image-section">
          <div className="image-container">
            <img
              src={form.profileImage || "/profileimage.png"}
              alt="Profile"
              className="profile-avatar"
            />
            <label className="image-upload-label">
              <Camera size={20} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Name */}
          <div className="form-group">
            <label>
              <User size={18} /> Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          {/* Email (Readonly) */}
          <div className="form-group">
            <label>
              <Mail size={18} /> Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              disabled
              className="readonly-input"
            />
            <small className="readonly-note">Email cannot be changed</small>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>
              <Phone size={18} /> Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              pattern="[0-9]{10}"
              title="Please enter a valid 10-digit phone number"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate("/dashboard")}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
