import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/profile.css";
import { User, Mail, Phone, Camera, Save, X } from "lucide-react";
import { BACKEND_URL } from "../config";

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

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post(
        "/upload/profile-image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setForm((prev) => ({ ...prev, profileImage: res.data.imageUrl }));
      setSuccess("Profile image uploaded successfully");
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

      setUser(res.data);
      setSuccess("Profile updated successfully!");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      console.error(err);
      setError("Failed to update profile");
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

        {/* ── LEFT IDENTITY PANEL ── */}
        <div className="profile-left">

          {/* Avatar */}
          <div className="profile-image-section">
            <div className="image-container">
              <img
                src={form.profileImage || "/profileimage.png"}
                alt="Profile"
                className="profile-avatar"
              />
              <label className="image-upload-label">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  hidden
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          {/* Name + email */}
          <div className="profile-identity">
            <p className="profile-identity-name">{form.name || "Your Name"}</p>
            <p className="profile-identity-email">{form.email}</p>

            <div className="profile-left-divider" />

            {/* Info pills */}
            <div className="profile-left-info">
              <div className="profile-left-pill">
                <Mail size={15} />
                <span>{form.email}</span>
              </div>
              {form.phone && (
                <div className="profile-left-pill">
                  <Phone size={15} />
                  <span>{form.phone}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="profile-right">

          {/* Header */}
          <div className="profile-header">
            <div>
              <h2>My Profile</h2>
              <p className="profile-header-sub">Update your personal information</p>
            </div>
            <button className="btn-close" onClick={() => navigate("/dashboard")}>
              <X size={16} />
            </button>
          </div>

          {error   && <div className="error-message"><span>{error}</span></div>}
          {success && <div className="success-message"><span>{success}</span></div>}

          <form onSubmit={handleSubmit} className={`profile-form${loading ? " loading" : ""}`}>

            <div className="form-group">
              <label><User size={15} /> Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label><Mail size={15} /> Email</label>
              <input
                type="email"
                value={form.email}
                disabled
                className="readonly-input"
              />
              <span className="readonly-note">Email cannot be changed</span>
            </div>

            <div className="form-group">
              <label><Phone size={15} /> Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Your phone number"
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={loading}>
                <Save size={17} />
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
    </div>
  );
}