package com.Startup.chalre.DTO;

import lombok.Data;

/**
 * Request payload for POST /api/rides/preview.
 * Carries origin and destination coordinates to fetch alternative route options.
 */
@Data
public class RoutePreviewRequest {
    private Double startLat;
    private Double startLng;
    private Double endLat;
    private Double endLng;
}
