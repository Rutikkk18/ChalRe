package com.Startup.chalre.controller;



import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.Startup.chalre.DTO.LocationDTO;
import com.Startup.chalre.service.LocationService;

@RestController
@RequestMapping("/api/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<LocationDTO>> searchLocations(
            @RequestParam String q
    ) {
        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(locationService.searchLocations(q));
    }
}
