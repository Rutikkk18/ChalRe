import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from "firebase/auth";
import { auth } from "../../Firebfase";
import { Eye, EyeOff } from "lucide-react";
import "../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    sessionStorage.clear();

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

      await updateProfile(userCred.user, {
        displayName: form.name
      }).catch(() => {});

      await sendEmailVerification(userCred.user);

      // ✅ TEMPORARILY STORE DETAILS FOR FIRST LOGIN
      sessionStorage.setItem("pendingName", form.name);
      sessionStorage.setItem("pendingPhone", form.phone);

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
    <div className="auth-register-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Register</h2>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-flex-column">
          <label>Name</label>
        </div>
        <div className="auth-inputForm">
          <svg
            height="20"
            viewBox="0 0 32 32"
            width="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <path d="M16,16A7,7,0,1,0,9,9,7,7,0,0,0,16,16ZM16,4a5,5,0,1,1-5,5A5,5,0,0,1,16,4Z"></path>
              <path d="M17,18H15A11,11,0,0,0,4,29a1,1,0,0,0,1,1H27a1,1,0,0,0,1-1A11,11,0,0,0,17,18ZM6.06,28A9,9,0,0,1,15,20h2a9,9,0,0,1,8.94,8Z"></path>
            </g>
          </svg>
          <input
            type="text"
            className="auth-input"
            name="name"
            placeholder="Enter your Name"
            onChange={handleChange}
            autoComplete="name"
            required
          />
        </div>

        <div className="auth-flex-column">
          <label>Email</label>
        </div>
        <div className="auth-inputForm">
          <svg
            height="20"
            viewBox="0 0 32 32"
            width="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="Layer_3" data-name="Layer 3">
              <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z"></path>
            </g>
          </svg>
          <input
            type="email"
            className="auth-input"
            name="email"
            placeholder="Enter your Email"
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-flex-column">
          <label>Password</label>
        </div>
        <div className="auth-inputForm">
          <svg
            height="20"
            viewBox="-64 0 512 512"
            width="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"></path>
            <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"></path>
          </svg>
          <input
            type={showPassword ? "text" : "password"}
            className="auth-input"
            name="password"
            placeholder="Enter your Password"
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="auth-password-toggle-btn"
            onClick={togglePasswordVisibility}
            tabIndex="-1"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="auth-flex-column">
          <label>Phone</label>
        </div>
        <div className="auth-inputForm">
          <svg
            height="20"
            viewBox="0 0 32 32"
            width="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <path d="M23.45,20.93a3,3,0,0,0-4.25,0l-1.45,1.45a26.14,26.14,0,0,1-4.51-3.62,26.62,26.62,0,0,1-3.62-4.51l1.45-1.45a3,3,0,0,0,0-4.25L8.24,5.73a2.93,2.93,0,0,0-2.11-.88h0A3,3,0,0,0,4,5.73L2.64,7.08A6.37,6.37,0,0,0,1,11.37,29.14,29.14,0,0,0,8.47,24.53,29.14,29.14,0,0,0,21.63,32a6.37,6.37,0,0,0,4.29-1.64L27.27,29a3,3,0,0,0,0-4.25ZM25.86,28.64a4.37,4.37,0,0,1-2.88,1.27A27.41,27.41,0,0,1,9.7,23.3,27.41,27.41,0,0,1,3.09,10a4.37,4.37,0,0,1,1.27-2.88L5.71,5.73h0a1,1,0,0,1,.71-.29,1,1,0,0,1,.71.29L9.95,8.55a1,1,0,0,1,0,1.41l-2,2a1,1,0,0,0-.15,1.15,28.21,28.21,0,0,0,4.31,5.33,28.21,28.21,0,0,0,5.33,4.31,1,1,0,0,0,1.15-.15l2-2a1,1,0,0,1,1.41,0l2.82,2.82a1,1,0,0,1,.29.71,1,1,0,0,1-.29.71Z"></path>
            </g>
          </svg>
          <input
            type="tel"
            className="auth-input"
            name="phone"
            placeholder="Enter your Phone"
            onChange={handleChange}
            autoComplete="tel"
            pattern="[0-9]{10}"
            title="Please enter a valid 10-digit phone number"
            required
          />
        </div>

        <button className="auth-button-submit" type="submit" disabled={loading}>
          {loading ? "Sending verification..." : "Sign Up"}
        </button>

        <p className="auth-p">
          Already have an account?
          <span className="auth-span">
            <a href="/login" style={{ textDecoration: 'none', color: 'inherit' }}>Sign In</a>
          </span>
        </p>

        {/* ✅ FIXED: Or With divider using flexbox instead of border-bottom trick */}
        <div className="auth-divider">
          <span>Or With</span>
        </div>

        <div className="auth-flex-row">
          <button className="auth-btn google" type="button">
            <svg
              version="1.1"
              width="20"
              id="Layer_1"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              viewBox="0 0 512 512"
              style={{ enableBackground: "new 0 0 512 512" }}
              xmlSpace="preserve"
            >
              <path
                style={{ fill: "#FBBB00" }}
                d="M113.47,309.408L95.648,375.94l-65.139,1.378C11.042,341.211,0,299.9,0,256
	c0-42.451,10.324-82.483,28.624-117.732h0.014l57.992,10.632l25.404,57.644c-5.317,15.501-8.215,32.141-8.215,49.456
	C103.821,274.792,107.225,292.797,113.47,309.408z"
              ></path>
              <path
                style={{ fill: "#518EF8" }}
                d="M507.527,208.176C510.467,223.662,512,239.655,512,256c0,18.328-1.927,36.206-5.598,53.451
	c-12.462,58.683-45.025,109.925-90.134,146.187l-0.014-0.014l-73.044-3.727l-10.338-64.535
	c29.932-17.554,53.324-45.025,65.646-77.911h-136.89V208.176h138.887L507.527,208.176L507.527,208.176z"
              ></path>
              <path
                style={{ fill: "#28B446" }}
                d="M416.253,455.624l0.014,0.014C372.396,490.901,316.666,512,256,512
	c-97.491,0-182.252-54.491-225.491-134.681l82.961-67.91c21.619,57.698,77.278,98.771,142.53,98.771
	c28.047,0,54.323-7.582,76.87-20.818L416.253,455.624z"
              ></path>
              <path
                style={{ fill: "#F14336" }}
                d="M419.404,58.936l-82.933,67.896c-23.335-14.586-50.919-23.012-80.471-23.012
	c-66.729,0-123.429,42.957-143.965,102.724l-83.397-68.276h-0.014C71.23,56.123,157.06,0,256,0
	C318.115,0,375.068,22.126,419.404,58.936z"
              ></path>
            </svg>
            Google
          </button>
          <button className="auth-btn apple" type="button">
            <svg
              version="1.1"
              height="20"
              width="20"
              id="Capa_1"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              viewBox="0 0 22.773 22.773"
              style={{ enableBackground: "new 0 0 22.773 22.773" }}
              xmlSpace="preserve"
            >
              <g>
                <g>
                  <path d="M15.769,0c0.053,0,0.106,0,0.162,0c0.13,1.606-0.483,2.806-1.228,3.675c-0.731,0.863-1.732,1.7-3.351,1.573 c-0.108-1.583,0.506-2.694,1.25-3.561C13.292,0.879,14.557,0.16,15.769,0z"></path>
                  <path d="M20.67,16.716c0,0.016,0,0.03,0,0.045c-0.455,1.378-1.104,2.559-1.896,3.655c-0.723,0.995-1.609,2.334-3.191,2.334 c-1.367,0-2.275-0.879-3.676-0.903c-1.482-0.024-2.297,0.735-3.652,0.926c-0.155,0-0.31,0-0.462,0 c-0.995-0.144-1.798-0.932-2.383-1.642c-1.725-2.098-3.058-4.808-3.306-8.276c0-0.34,0-0.679,0-1.019 c0.105-2.482,1.311-4.5,2.914-5.478c0.846-0.52,2.009-0.963,3.304-0.765c0.555,0.086,1.122,0.276,1.619,0.464 c0.471,0.181,1.06,0.502,1.618,0.485c0.378-0.011,0.754-0.208,1.135-0.347c1.116-0.403,2.21-0.865,3.652-0.648 c1.733,0.262,2.963,1.032,3.723,2.22c-1.466,0.933-2.625,2.339-2.427,4.74C17.818,14.688,19.086,15.964,20.67,16.716z"></path>
                </g>
              </g>
            </svg>
            Apple
          </button>
        </div>
      </form>
    </div>
  );
}