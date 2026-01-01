package com.Startup.chalre.controller;

import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final RideRepository rideRepository;

    // ✅ Direct UPI initiate (NO DB WRITE)
    @PostMapping("/initiate-upi")
    public ResponseEntity<?> initiateUpi(@RequestBody Map<String, Object> body) {

        Long rideId = Long.valueOf(body.get("rideId").toString());

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        String upiId = ride.getDriver().getUpiId();

        if (upiId == null || upiId.isBlank()) {
            throw new RuntimeException("Driver has not added UPI ID");
        }

        return ResponseEntity.ok(Map.of(
                "upiId", upiId,
                "amount", Math.round(ride.getPrice())
        ));
    }
}
