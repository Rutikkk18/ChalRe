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
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Integer seats,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String carType,
            @RequestParam(required = false) String genderPreference,
            @AuthenticationPrincipal User user
    ) {
        String userGender = user != null ? user.getGender() : null;
        return ResponseEntity.ok(rideService.searchRides(from, to, date, seats, 
                minPrice, maxPrice, carType, genderPreference, userGender));
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
}
