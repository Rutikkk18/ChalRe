package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.RideDTO;
import com.Startup.chalre.DTO.RideUpdateDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    @PostMapping("/create")
    public ResponseEntity<?> createRide(
            @Valid @RequestBody RideDTO dto,
            BindingResult bindingResult,
            @AuthenticationPrincipal User user) {

        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getFieldErrors().stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(java.util.stream.Collectors.joining(", "));
            return ResponseEntity.badRequest().body(errorMessage);
        }

        return ResponseEntity.ok(rideService.createRide(dto, user));
    }

    @GetMapping
    public ResponseEntity<?> getAllRides() {
        return ResponseEntity.ok(rideService.getallRides());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRide(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.getRideById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchRides(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Integer seats,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String carType,
            @RequestParam(required = false) String genderPreference,
            @RequestParam(required = false) Double pickupLat,
            @RequestParam(required = false) Double pickupLng,
            @RequestParam(required = false) Double dropLat,
            @RequestParam(required = false) Double dropLng,
            @RequestParam(required = false) String pickup,
            @RequestParam(required = false) String drop,
            @AuthenticationPrincipal User user
    ) {
        try {
            // ── CASE 1: Direct coords (fastest, most accurate) ──
            // 🔥 Now returns List<Map> with calculatedPrice + isPartial embedded — zero extra calls
            if (pickupLat != null && pickupLng != null
                    && dropLat != null && dropLng != null) {
                List<Map<String, Object>> results = rideService.searchRidesByCoords(
                        pickupLat, pickupLng, dropLat, dropLng, date
                );
                return ResponseEntity.ok(results);
            }

            // ── CASE 2: Text → backend geocodes via locationiq ──
            // 🔥 Now returns List<Map> with calculatedPrice + isPartial embedded — zero extra calls
            if (pickup != null && !pickup.isBlank()
                    && drop != null && !drop.isBlank()) {
                List<Map<String, Object>> geoResults = rideService.searchRidesByRoute(
                        pickup, drop, date
                );
                return ResponseEntity.ok(geoResults);
            }

            // ── CASE 3: No valid params — return empty ──
            // Never do text search for geo matching — it's unreliable
            return ResponseEntity.ok(List.of());

        } catch (Exception e) {
            System.err.println("Search error: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> myRides(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String filter
    ) {
        if ("separated".equals(filter)) {
            return ResponseEntity.ok(rideService.getMyRidesSeparated(user));
        }
        return ResponseEntity.ok(rideService.getMyRides(user));
    }

    @GetMapping("/{id}/bookings")
    public ResponseEntity<?> getRideBookings(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(rideService.getRideBookings(id, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRide(
            @PathVariable Long id,
            @RequestBody RideUpdateDTO dto,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(rideService.updateRide(id, dto, user));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelRide(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(rideService.cancelRide(id, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRide(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(rideService.deleteRide(id, user));
    }

    @GetMapping("/{id}/calculate-price")
    public ResponseEntity<?> calculatePrice(
            @PathVariable Long id,
            @RequestParam(required = false) Double pickupLat,
            @RequestParam(required = false) Double pickupLng,
            @RequestParam(required = false) Double dropLat,
            @RequestParam(required = false) Double dropLng
    ) {
        try {
            return ResponseEntity.ok(
                    rideService.calculatePrice(id, pickupLat, pickupLng, dropLat, dropLng)
            );
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("error", e.getMessage()));
        }
    }
}