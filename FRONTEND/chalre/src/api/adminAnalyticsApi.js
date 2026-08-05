import api from "./axios";

/**
 * Admin Analytics API calls.
 * Uses the pre-configured axios instance so JWT Authorization header is automatically attached.
 * Protected backend routes: /api/admin/analytics/* (requires ROLE_ADMIN)
 */

export const fetchAnalyticsOverview = async () => {
  const res = await api.get("/admin/analytics/overview");
  return res.data;
};

export const fetchUserAnalytics = async () => {
  const res = await api.get("/admin/analytics/users");
  return res.data;
};

export const fetchRideAnalytics = async () => {
  const res = await api.get("/admin/analytics/rides");
  return res.data;
};

export const fetchBookingAnalytics = async () => {
  const res = await api.get("/admin/analytics/bookings");
  return res.data;
};

export const fetchPaymentAnalytics = async () => {
  const res = await api.get("/admin/analytics/payments");
  return res.data;
};

export const fetchRouteAnalytics = async () => {
  const res = await api.get("/admin/analytics/routes");
  return res.data;
};
