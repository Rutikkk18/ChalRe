package com.Startup.chalre.controller;

import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/payouts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPayoutController {

    private final PaymentRepository paymentRepository;

    // Get all payments where passenger confirmed but driver not paid yet
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingPayouts() {
        List<Payment> payments = paymentRepository.findAll()
                .stream()
                .filter(p -> p.getReleasedAt() != null)
                .filter(p -> p.getDriverPaid() == null || !p.getDriverPaid())
                .filter(p -> Payment.PaymentStatus.SUCCESS.equals(p.getStatus()))
                .collect(Collectors.toList());

        List<Map<String, Object>> result = payments.stream().map(p -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("paymentId", p.getId());
            map.put("amount", p.getAmount());
            map.put("amountRupees", p.getAmount() / 100.0);
            map.put("driverAmount", Math.round(p.getAmount() * 0.85) / 100.0); // 85% to driver
            map.put("chalreCut", Math.round(p.getAmount() * 0.15) / 100.0);   // 15% platform fee
            map.put("releasedAt", p.getReleasedAt());
            map.put("createdAt", p.getCreatedAt());
            map.put("razorpayPaymentId", p.getRazorpayPaymentId());

            // Ride info
            if (p.getRide() != null) {
                map.put("rideId", p.getRide().getId());
                map.put("from", p.getRide().getStartLocation());
                map.put("to", p.getRide().getEndLocation());
                map.put("rideDate", p.getRide().getDate());
            }

            // Driver info
            if (p.getRide() != null && p.getRide().getDriver() != null) {
                map.put("driverName", p.getRide().getDriver().getName());
                map.put("driverPhone", p.getRide().getDriver().getPhone());
                map.put("driverUpiId", p.getRide().getDriver().getUpiId());
            }

            // Passenger info
            if (p.getUser() != null) {
                map.put("passengerName", p.getUser().getName());
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // Get all completed payouts (already paid to driver)
    @GetMapping("/completed")
    public ResponseEntity<?> getCompletedPayouts() {
        List<Payment> payments = paymentRepository.findAll()
                .stream()
                .filter(p -> p.getDriverPaid() != null && p.getDriverPaid())
                .collect(Collectors.toList());

        List<Map<String, Object>> result = payments.stream().map(p -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("paymentId", p.getId());
            map.put("amountRupees", p.getAmount() / 100.0);
            map.put("driverAmount", Math.round(p.getAmount() * 0.85) / 100.0);
            map.put("driverPaidAt", p.getDriverPaidAt());
            map.put("driverPayoutNote", p.getDriverPayoutNote());

            if (p.getRide() != null && p.getRide().getDriver() != null) {
                map.put("driverName", p.getRide().getDriver().getName());
                map.put("driverUpiId", p.getRide().getDriver().getUpiId());
                map.put("rideDate", p.getRide().getDate());
                map.put("from", p.getRide().getStartLocation());
                map.put("to", p.getRide().getEndLocation());
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // Mark driver as paid
    @PostMapping("/mark-paid/{paymentId}")
    public ResponseEntity<?> markDriverPaid(
            @PathVariable Long paymentId,
            @RequestBody Map<String, String> body) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (payment.getDriverPaid() != null && payment.getDriverPaid()) {
            return ResponseEntity.badRequest().body("Driver already marked as paid");
        }

        payment.setDriverPaid(true);
        payment.setDriverPaidAt(LocalDateTime.now());
        payment.setDriverPayoutNote(body.getOrDefault("note", ""));
        paymentRepository.save(payment);

        return ResponseEntity.ok(Map.of(
                "message", "Driver marked as paid successfully",
                "paymentId", paymentId,
                "paidAt", payment.getDriverPaidAt().toString()
        ));
    }
}