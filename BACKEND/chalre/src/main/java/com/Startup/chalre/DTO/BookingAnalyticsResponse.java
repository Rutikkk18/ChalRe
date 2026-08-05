package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingAnalyticsResponse {

    private long totalBookings;
    private long confirmedBookings;
    private long cancelledBookings;
    private double cancellationRate;  // percentage 0-100
    private double avgSeatsPerBooking;
    private long partialRouteBookings;

    // Breakdown lists
    private List<Map<String, Object>> paymentMethodBreakdown;
}
