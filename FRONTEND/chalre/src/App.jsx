import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./utils/ProtectedRoute";
import Home from "./pages/Home";
import SearchRides from "./pages/searchRides";
import OfferRide from "./pages/OfferRide";
import RideDetails from "./pages/RideDetails";
import BookingPage from "./pages/BookingPage";
import MyBookings from "./pages/MyBookings";
import BookingSuccess from "./pages/BookingSuccess";
import NotificationPage from "./pages/NotificationPage";
import VerificationPage from "./pages/VerificationPage";
import VerifyEmail from "./pages/VerifyEmail";
import MyRides from "./pages/MyRides";
import ProfilePage from "./pages/ProfilePage";
import MainLayout from "./layouts/MainLayout";
import Scamm from "./pages/Scamm";
import TermsAndConditions from "./pages/TermsAndConditions"
import HelpCenter from "./pages/HelpCenter"
import AboutChalRe from "./pages/AboutChalRe";

export default function App() {
  return (

    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchRides />} />
        <Route
          path="/offer"
          element={
            <ProtectedRoute>
              <OfferRide />
            </ProtectedRoute>
          }
        />
        <Route path="/ridedetails/:id" element={<RideDetails />} />
        <Route
          path="/book-ride/:id"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/success/:id"
          element={
            <ProtectedRoute>
              <BookingSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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
        <Route path="scam" element={<Scamm/>}/>
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/about" element={<AboutChalRe />} />

      </Route>
      
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/verification"
        element={
          <ProtectedRoute>
            <VerificationPage />
          </ProtectedRoute>
        }
      />
     
      <Route path="/verify-email" element={<VerifyEmail />} />
    </Routes>
  );
}
