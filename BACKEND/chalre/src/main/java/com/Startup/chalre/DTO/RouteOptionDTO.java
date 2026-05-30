package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One alternative route option returned by POST /api/rides/preview.
 * The frontend renders one card per RouteOptionDTO and allows the driver to pick one.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RouteOptionDTO {
    private int routeIndex;          // 0-based index (0 = fastest ORS suggestion)
    private double distanceKm;       // total driving distance in km
    private double durationMins;     // estimated driving time in minutes
    private String polyline;         // Google-encoded polyline for map rendering
    private String viaSummary;       // e.g. "Via SH130, SH132" derived from step names
    private boolean fallback;        // true when no ORS alternatives available (>85 km)
}
