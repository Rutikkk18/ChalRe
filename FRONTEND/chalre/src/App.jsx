import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./utils/ProtectedRoute";
import Home from "./pages/Home";
import SearchRides from "./pages/SearchRides";
import OfferRide from "./pages/OfferRide";
import RideDetails from "./pages/RideDetails";
import BookingPage from "./pages/BookingPage";
import WalletPage from "./pages/WalletPage";
import MyBookings from "./pages/MyBookings";
import BookingSuccess from "./pages/BookingSuccess";
import NotificationPage from "./pages/NotificationPage";
import VerificationPage from "./pages/VerificationPage";
import MyRides from "./pages/MyRides";
import ProfilePage from "./pages/ProfilePage";
import PhoneVerificationPage from "./pages/PhoneVerificationPage";

export default function App() {
  return (
      <Routes>
      {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/search" element={<SearchRides />} />
      <Route path="/offer" element={<OfferRide />} />
      <Route path="/ridedetails/:id" element={<RideDetails />} />
        <Route path="/book-ride/:id" element={<BookingPage />} />
    <Route path="/booking/success/:id" element={<BookingSuccess />} />

      {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        /> 
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mybookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verification"
        element={
          <ProtectedRoute>
            <VerificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/myrides"
        element={
          <ProtectedRoute>
            <MyRides />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verify-phone"
        element={
          <ProtectedRoute>
            <PhoneVerificationPage />
          </ProtectedRoute>
        }
      />
      </Routes>
  );
}
