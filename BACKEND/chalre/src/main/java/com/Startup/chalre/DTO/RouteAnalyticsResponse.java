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
public class RouteAnalyticsResponse {

    private long totalUniqueRoutes;
    private String topRoutePair;      // e.g. "Kolhapur → Pune"

    // Top 10 origins — each: { city: "...", count: N }
    private List<Map<String, Object>> topOrigins;

    // Top 10 destinations — each: { city: "...", count: N }
    private List<Map<String, Object>> topDestinations;

    // Top OD pairs — each: { from: "...", to: "...", count: N, avgPrice: N }
    private List<Map<String, Object>> topOdPairs;
}
