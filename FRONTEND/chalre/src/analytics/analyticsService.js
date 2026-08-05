/**
 * ChalRe Analytics Service — Phase 1
 * ─────────────────────────────────────────────────────────────────────────────
 * Central analytics module. Every analytics call made from ChalRe goes through
 * this file ONLY. No page should import firebase/analytics directly.
 *
 * SAFETY GUARANTEES:
 *  - Every function is fire-and-forget (void return, never awaited by callers)
 *  - Every Firebase call is wrapped in try/catch — failure is completely silent
 *  - Analytics can resolve to null (unsupported browser) — handled gracefully
 *  - Zero PII sent — only internal userId (number) and role (string)
 *  - If this entire file is deleted, the app works exactly as before
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { analyticsPromise } from "../../Firebfase";
import { logEvent, setUserId, setUserProperties } from "firebase/analytics";

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Safely resolves the Analytics instance or null. Never throws. */
async function getA() {
  try {
    return await analyticsPromise;
  } catch {
    return null;
  }
}

/**
 * Core tracking function — wraps logEvent in try/catch.
 * Called internally only. External callers use named exports below.
 */
async function track(eventName, params = {}) {
  try {
    const a = await getA();
    if (!a) return; // Analytics not supported — silently skip
    logEvent(a, eventName, params);
  } catch {
    // Any Firebase failure is completely silent — never reaches the user
  }
}

// ── Screen Views ─────────────────────────────────────────────────────────────

/** Called automatically by usePageTracking on every route change. */
export function logScreenView(screenName) {
  track("screen_view", {
    screen_name: screenName,
    screen_class: screenName,
  });
}

// ── Authentication ────────────────────────────────────────────────────────────

/** @param {"email"|"google"} method */
export function logLogin(method) {
  track("login", { method: String(method || "unknown") });
}

/** @param {"email"|"google"} method */
export function logSignUp(method) {
  track("sign_up", { method: String(method || "unknown") });
}

export function logLogout() {
  track("logout");
}

// ── Ride Search ───────────────────────────────────────────────────────────────

/** Fired when a search is submitted. */
export function logSearch(from, to, date, seats) {
  track("search", {
    search_term: `${from || ""} to ${to || ""}`,
    origin:      String(from  || ""),
    destination: String(to    || ""),
    travel_date: String(date  || ""),
    seats:       Number(seats) || 1,
  });
}

/**
 * Fired when a search returns zero results.
 * Valuable for identifying unserved routes.
 */
export function logSearchNoResults(from, to, date, vehicleType) {
  track("search_no_results", {
    origin:       String(from        || ""),
    destination:  String(to          || ""),
    travel_date:  String(date        || ""),
    vehicle_type: String(vehicleType || "any"),
  });
}

// ── Ride Details ──────────────────────────────────────────────────────────────

export function logViewRideDetails(rideId, from, to, price) {
  track("view_ride_details", {
    ride_id:     String(rideId || ""),
    route:       `${from || ""} → ${to || ""}`,
    price:       Number(price) || 0,
  });
}

// ── Booking Funnel ────────────────────────────────────────────────────────────

/** Step 1 of funnel: booking page loaded with ride data. */
export function logBeginCheckout(rideId, from, to, price, seats) {
  track("begin_checkout", {
    ride_id:  String(rideId || ""),
    route:    `${from || ""} → ${to || ""}`,
    value:    Number(price) || 0,
    seats:    Number(seats) || 1,
    currency: "INR",
  });
}

/** Step 2 of funnel: Razorpay order created, modal about to open. */
export function logPaymentInitiated(rideId, amountRupees) {
  track("payment_initiated", {
    ride_id:        String(rideId       || ""),
    value:          Number(amountRupees) || 0,
    currency:       "INR",
    payment_method: "razorpay",
  });
}

/** Step 3 of funnel: payment verified successfully. */
export function logPaymentSuccess(rideId, bookingId, amountRupees, seats) {
  track("purchase", {
    ride_id:    String(rideId       || ""),
    booking_id: String(bookingId    || ""),
    value:      Number(amountRupees) || 0,
    seats:      Number(seats)        || 1,
    currency:   "INR",
  });
}

/** Razorpay modal dismissed before payment. */
export function logPaymentCancelled(rideId, amountRupees) {
  track("payment_cancelled", {
    ride_id:  String(rideId       || ""),
    value:    Number(amountRupees) || 0,
    currency: "INR",
  });
}

/** Payment or verification failed. */
export function logPaymentFailed(rideId, amountRupees, reason) {
  track("payment_failed", {
    ride_id:      String(rideId       || ""),
    value:        Number(amountRupees) || 0,
    error_reason: String(reason        || "unknown").substring(0, 100),
    currency:     "INR",
  });
}

export function logBookingCancelled(bookingId) {
  track("booking_cancelled", {
    booking_id: String(bookingId || ""),
  });
}

// ── Driver Events ─────────────────────────────────────────────────────────────

export function logRideCreated(from, to, price, vehicleType) {
  track("ride_created", {
    route:        `${from || ""} → ${to || ""}`,
    price:        Number(price)  || 0,
    vehicle_type: String(vehicleType || "unknown"),
  });
}

// ── Website CTA Events ────────────────────────────────────────────────────────

/** @param {"home_cta"|"navbar"|"blog"} source */
export function logOfferRideClicked(source) {
  track("offer_ride_clicked", { source: String(source || "unknown") });
}

/** @param {"android"|"ios"} platform */
export function logDownloadAppClicked(platform) {
  track("download_app_clicked", { platform: String(platform || "unknown") });
}

export function logFaqExpanded(questionText) {
  track("faq_expanded", {
    question: String(questionText || "").substring(0, 100),
  });
}

// ── Blog Events ───────────────────────────────────────────────────────────────

export function logBlogOpened(slug, title, category) {
  track("blog_article_opened", {
    slug:     String(slug     || ""),
    title:    String(title    || "").substring(0, 100),
    category: String(category || ""),
  });
}

// ── User Identity ─────────────────────────────────────────────────────────────
// ONLY sends internal userId (number) and role — ZERO PII

export function setAnalyticsUser(userId, role) {
  // Wrapped in IIFE so this function returns void immediately
  (async () => {
    try {
      const a = await getA();
      if (!a) return;
      setUserId(a, String(userId));
      setUserProperties(a, { user_role: String(role || "USER") });
    } catch {
      // Silent — identity failure must never surface to the user
    }
  })();
}

export function clearAnalyticsUser() {
  (async () => {
    try {
      const a = await getA();
      if (!a) return;
      setUserId(a, null);
    } catch {
      // Silent
    }
  })();
}
