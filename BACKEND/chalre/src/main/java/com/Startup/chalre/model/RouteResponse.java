package com.Startup.chalre.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RouteResponse {
    private double distance;   // in km
    private double duration;   // in seconds
    private String polyline;   // encoded polyline string
}