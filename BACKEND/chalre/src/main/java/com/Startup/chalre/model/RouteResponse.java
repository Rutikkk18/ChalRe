package com.Startup.chalre.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RouteResponse {
    private double distance;   // in km
    private double duration;   // in seconds
    private String polyline;   // encoded polyline string
    private boolean fallback;

    public RouteResponse(double distance, double duration, String polyline) {
        this.distance = distance;
        this.duration = duration;
        this.polyline = polyline;
        this.fallback = false;
    }

    public RouteResponse(double distance, double duration, String polyline, boolean fallback) {
        this.distance = distance;
        this.duration = duration;
        this.polyline = polyline;
        this.fallback = fallback;
    }

    public boolean isFallback() {
        return fallback;
    }

    public void setFallback(boolean fallback) {
        this.fallback = fallback;
    }
}