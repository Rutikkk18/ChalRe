package com.Startup.chalre.controller;

import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.PaymentRepository;
import com.Startup.chalre.service.NotificationService;
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
    private final NotificationService notificationService;

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
            map.put("driverAmount", p.getAmount() / 100.0);  // 100% to driver
            map.put("chalreCut", 0.0);                        // 0% commission
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
        String note = body.getOrDefault("note", "");
        payment.setDriverPayoutNote(note);
        paymentRepository.save(payment);

        // Send push notification to the driver
        if (payment.getRide() != null && payment.getRide().getDriver() != null) {
            User driver = payment.getRide().getDriver();
            double rupees = payment.getAmount() / 100.0;
            String notificationBody = "Payout of ₹" + rupees + " has been transferred to your bank account.";
            if (note != null && !note.trim().isEmpty()) {
                notificationBody += " (Note: " + note + ")";
            }
            try {
                notificationService.sendNotification(
                        driver,
                        "Payout Transferred",
                        notificationBody,
                        "PAYMENT_TRANSFERRED",
                        Map.of(
                                "paymentId", payment.getId().toString(),
                                "rideId", payment.getRide().getId().toString()
                        )
                );
            } catch (Exception e) {
                // Log and continue so the transaction succeeds even if notification fails
                System.err.println("⚠️ Failed to send payout notification to driver: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Driver marked as paid successfully",
                "paymentId", paymentId,
                "paidAt", payment.getDriverPaidAt().toString()
        ));
    }

    // Get all pending refunds (passenger cancelled paid booking)
    @GetMapping("/refunds/pending")
    public ResponseEntity<?> getPendingRefunds() {
        List<Payment> payments = paymentRepository.findAll()
                .stream()
                .filter(p -> Payment.PaymentStatus.REFUNDED.equals(p.getStatus()))
                .filter(p -> p.getRefundProcessed() == null || !p.getRefundProcessed())
                .collect(Collectors.toList());

        List<Map<String, Object>> result = payments.stream().map(p -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("paymentId", p.getId());
            map.put("amount", p.getAmount());
            map.put("amountRupees", p.getAmount() / 100.0);
            map.put("createdAt", p.getCreatedAt());
            map.put("razorpayPaymentId", p.getRazorpayPaymentId());

            // Passenger info
            if (p.getUser() != null) {
                map.put("passengerName", p.getUser().getName());
                map.put("passengerPhone", p.getUser().getPhone());
                map.put("passengerUpiId", p.getUser().getUpiId());
            }

            // Ride info
            if (p.getRide() != null) {
                map.put("rideId", p.getRide().getId());
                map.put("from", p.getRide().getStartLocation());
                map.put("to", p.getRide().getEndLocation());
                map.put("rideDate", p.getRide().getDate());
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // Get all completed refunds
    @GetMapping("/refunds/completed")
    public ResponseEntity<?> getCompletedRefunds() {
        List<Payment> payments = paymentRepository.findAll()
                .stream()
                .filter(p -> Payment.PaymentStatus.REFUNDED.equals(p.getStatus()))
                .filter(p -> p.getRefundProcessed() != null && p.getRefundProcessed())
                .collect(Collectors.toList());

        List<Map<String, Object>> result = payments.stream().map(p -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("paymentId", p.getId());
            map.put("amountRupees", p.getAmount() / 100.0);
            map.put("refundProcessedAt", p.getRefundProcessedAt());
            map.put("refundNote", p.getRefundNote());
            map.put("razorpayPaymentId", p.getRazorpayPaymentId());

            if (p.getUser() != null) {
                map.put("passengerName", p.getUser().getName());
                map.put("passengerUpiId", p.getUser().getUpiId());
            }

            if (p.getRide() != null) {
                map.put("rideDate", p.getRide().getDate());
                map.put("from", p.getRide().getStartLocation());
                map.put("to", p.getRide().getEndLocation());
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // Mark refund as processed
    @PostMapping("/mark-refunded/{paymentId}")
    public ResponseEntity<?> markRefundProcessed(
            @PathVariable Long paymentId,
            @RequestBody Map<String, String> body) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (!Payment.PaymentStatus.REFUNDED.equals(payment.getStatus())) {
            return ResponseEntity.badRequest().body("Payment is not eligible for refund");
        }

        if (payment.getRefundProcessed() != null && payment.getRefundProcessed()) {
            return ResponseEntity.badRequest().body("Refund already marked as processed");
        }

        payment.setRefundProcessed(true);
        payment.setRefundProcessedAt(LocalDateTime.now());
        String note = body.getOrDefault("note", "");
        payment.setRefundNote(note);
        paymentRepository.save(payment);

        // Send push notification to the passenger
        if (payment.getUser() != null) {
            User passenger = payment.getUser();
            double rupees = payment.getAmount() / 100.0;
            String notificationBody = "Refund of ₹" + rupees + " has been processed to your account.";
            if (note != null && !note.trim().isEmpty()) {
                notificationBody += " (Note: " + note + ")";
            }
            try {
                notificationService.sendNotification(
                        passenger,
                        "Refund Processed",
                        notificationBody,
                        "REFUND_PROCESSED",
                        Map.of(
                                "paymentId", payment.getId().toString(),
                                "rideId", payment.getRide() != null ? payment.getRide().getId().toString() : ""
                        )
                );
            } catch (Exception e) {
                // Log and continue so the transaction succeeds even if notification fails
                System.err.println("⚠️ Failed to send refund notification to passenger: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Refund marked as processed successfully",
                "paymentId", paymentId,
                "refundProcessedAt", payment.getRefundProcessedAt().toString()
        ));
    }
}