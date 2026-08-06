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
public class RideAnalyticsResponse {

    private long totalRides;
    private long liveBookableRides; // ✅ Renamed from activeRides (uses RideService.isRideLiveAndBookable)
    private long cancelledRides;
    private double averagePrice;

    // Breakdown lists — each entry is { label: "...", count: N }
    private List<Map<String, Object>> vehicleTypeBreakdown;
    private List<Map<String, Object>> topOrigins;
    private List<Map<String, Object>> topDestinations;
}
