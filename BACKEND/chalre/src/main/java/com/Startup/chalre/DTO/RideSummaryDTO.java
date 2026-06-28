package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight DTO for the My Rides list screen (?filter=separated).
 * Contains only the fields actually rendered by MyRides.jsx, plus
 * embedded booking counts that eliminate the previous N+1 frontend loop.
 *
 * DOES NOT include: polyline, coordinates, distance, carModel, carType,
 * vehicleType, genderPreference, note, status, isFallbackRoute, endTime,
 * or the full driver User object — none of these are used on the list screen.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RideSummaryDTO {

    private Long   id;
    private String startLocation;
    private String endLocation;
    private String date;
    private String time;
    private int    availableSeats;
    private double price;
    private String vehicleType;

    /**
     * Number of bookings whose status = 'BOOKED' for this ride.
     * Embedded via a single JOIN query — eliminates the N+1 /rides/{id}/bookings loop.
     */
    private long activeBookingsCount;

    /**
     * Total number of bookings (any status) for this ride.
     */
    private long totalBookings;
}
