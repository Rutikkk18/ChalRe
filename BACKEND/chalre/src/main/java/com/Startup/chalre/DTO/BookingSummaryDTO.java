package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight DTO for the My Bookings list screen (?filter=separated).
 * Contains only the fields actually rendered by MyBookings.jsx, BookingSuccess.jsx,
 * and ChatModal.jsx. Excludes polyline, coordinates, vehicle details, passenger
 * User object, txnId, and bookingTime — none used on list screens.
 *
 * IMPORTANT:
 *  - driver.phone is retained: BookingSuccess.jsx L126-128 renders a click-to-call link.
 *  - driver.id + driver.name are retained: ChatModal.jsx uses id as receiverId and name in header.
 *  - paymentMethod is the correct field name (NOT paymentMode — that was a pre-existing typo).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingSummaryDTO {

    private Long   id;
    private String status;
    private String paymentStatus;
    private String paymentMethod;
    private int    seatsBooked;

    private RideInfo ride;

    // ── Nested ride summary (fields used by list screens) ──────────────────────
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RideInfo {
        private Long   id;
        private String startLocation;
        private String endLocation;
        private String date;
        private String time;
        private double price;
        private DriverInfo driver;
    }

    // ── Minimal driver info (required by ChatModal + BookingSuccess) ────────────
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverInfo {
        private Long   id;
        private String name;
        private String phone;   // BookingSuccess.jsx renders click-to-call with this
    }
}
