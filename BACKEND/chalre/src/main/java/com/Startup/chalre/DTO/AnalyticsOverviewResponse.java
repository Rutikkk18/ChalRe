package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsOverviewResponse {

    private long totalUsers;
    private long totalRides;
    private long totalBookings;
    private double totalRevenue;   // in rupees

    private long liveBookableRides; // ✅ Renamed from activeRides (uses RideService.isRideLiveAndBookable)
    private long cancelledRides;

    private long confirmedBookings;
    private long cancelledBookings;

    private long pendingPayouts;
    private long completedPayouts;

    private double avgBookingValue;  // in rupees
}
