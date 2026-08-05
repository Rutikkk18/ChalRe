/**
 * usePageTracking — Automatic screen view tracking via React Router.
 *
 * Add this hook ONCE in App.jsx. It fires logScreenView on every
 * navigation change. No individual page needs to be modified.
 *
 * Safe: logScreenView internally catches all errors silently.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logScreenView } from "./analyticsService";

/** Maps a pathname to a readable analytics screen name. */
function resolveScreenName(pathname) {
  if (pathname === "/")                         return "home";
  if (pathname === "/search")                   return "search_rides";
  if (pathname === "/offer")                    return "offer_ride";
  if (pathname.startsWith("/ridedetails/"))     return "ride_details";
  if (pathname.startsWith("/book-ride/"))       return "booking";
  if (pathname.startsWith("/booking/success"))  return "booking_success";
  if (pathname === "/login")                    return "login";
  if (pathname === "/register")                 return "register";
  if (pathname === "/blog")                     return "blog_list";
  if (pathname.startsWith("/blog/"))            return "blog_article";
  if (pathname === "/dashboard")                return "user_dashboard";
  if (pathname === "/mybookings")               return "my_bookings";
  if (pathname === "/myrides")                  return "my_rides";
  if (pathname === "/inbox")                    return "inbox";
  if (pathname === "/profile")                  return "profile";
  if (pathname === "/notifications")            return "notifications";
  if (pathname === "/help-center")              return "help_center";
  if (pathname === "/about")                    return "about";
  if (pathname === "/careers")                  return "careers";
  if (pathname === "/terms")                    return "terms";
  if (pathname === "/privacy-policy")           return "privacy_policy";
  if (pathname === "/scam")                     return "safety_tips";
  if (pathname === "/verification")             return "verification";
  if (pathname === "/verify-email")             return "verify_email";
  if (pathname.startsWith("/admin/analytics"))  return "admin_analytics";
  if (pathname.startsWith("/admin"))            return "admin";
  return "unknown_page";
}

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // logScreenView is internally wrapped in try/catch — cannot throw
    logScreenView(resolveScreenName(location.pathname));
  }, [location.pathname]);
}
