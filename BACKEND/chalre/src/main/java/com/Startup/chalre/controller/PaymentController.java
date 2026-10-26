package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.Exception.SeatUnavailableException;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.BookingService;
import com.Startup.chalre.service.PaymentFinalizationService;
import com.Startup.chalre.service.RazorpayPaymentService;
import com.Startup.chalre.service.SeatHoldService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    private final RazorpayPaymentService razorpayPaymentService;
    private final BookingService bookingService;
    private final PaymentFinalizationService paymentFinalizationService;
    private final SeatHoldService seatHoldService;
    private final String razorpayKey;

    public PaymentController(
            RazorpayPaymentService razorpayPaymentService,
            BookingService bookingService,
            PaymentFinalizationService paymentFinalizationService,
            SeatHoldService seatHoldService,
            @Qualifier("razorpayKey") String razorpayKey) {
        this.razorpayPaymentService = razorpayPaymentService;
        this.bookingService = bookingService;
        this.paymentFinalizationService = paymentFinalizationService;
        this.seatHoldService = seatHoldService;
        this.razorpayKey = razorpayKey;
    }

    // Frontend gets key to init Razorpay popup
    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        return ResponseEntity.ok(Map.of("key", razorpayKey));
    }

    // STEP 1: Create Razorpay order with atomic seat hold
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        try {
            Long rideId = Long.valueOf(body.get("rideId").toString());
            Long amountPaise = Long.valueOf(body.get("amount").toString());
            Integer seats = body.get("seats") != null
                    ? Integer.valueOf(body.get("seats").toString()) : 1;
            Double pickupLat = body.get("pickupLat") != null
                    ? Double.valueOf(body.get("pickupLat").toString()) : null;
            Double pickupLng = body.get("pickupLng") != null
                    ? Double.valueOf(body.get("pickupLng").toString()) : null;
            Double dropLat = body.get("dropLat") != null
                    ? Double.valueOf(body.get("dropLat").toString()) : null;
            Double dropLng = body.get("dropLng") != null
                    ? Double.valueOf(body.get("dropLng").toString()) : null;
            Map<String, Object> order = razorpayPaymentService.createOrder(
                    user.getId(), rideId, amountPaise, seats,
                    pickupLat, pickupLng, dropLat, dropLng);
            return ResponseEntity.ok(order);
        } catch (SeatUnavailableException e) {
            return ResponseEntity.status(409).body(Map.of(
                    "error", "SEAT_CURRENTLY_HELD",
                    "message", e.getMessage()
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            logger.warn("Validation error creating order: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "BAD_REQUEST",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Unexpected error creating order: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "CHECKOUT_INITIATION_FAILED",
                    "message", "Unable to initiate checkout. Please try again."
            ));
        }
    }

    // STEP 1.5: Explicitly release hold on checkout dismissal
    @PostMapping("/release-hold")
    public ResponseEntity<?> releaseHold(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        try {
            Long holdId = body.get("holdId") != null ? Long.valueOf(body.get("holdId").toString()) : null;
            String razorpayOrderId = body.get("orderId") != null ? body.get("orderId").toString()
                    : (body.get("razorpayOrderId") != null ? body.get("razorpayOrderId").toString() : null);

            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED", "message", "User must be authenticated"));
            }

            boolean released = seatHoldService.releaseHold(holdId, razorpayOrderId, user.getId());
            return ResponseEntity.ok(Map.of(
                    "released", released,
                    "message", released ? "Seat hold released successfully" : "Hold not found or already inactive"
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error releasing hold: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "INTERNAL_SERVER_ERROR", "message", "Failed to release hold."));
        }
    }

    // STEP 2: Verify payment via the shared PaymentFinalizationService
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        try {
            Long rideId = Long.valueOf(body.get("rideId").toString());
            Long amountPaise = Long.valueOf(body.get("amount").toString());
            String razorpayOrderId = body.get("razorpayOrderId").toString();
            String razorpayPaymentId = body.get("razorpayPaymentId").toString();
            String razorpaySignature = body.get("razorpaySignature").toString();
            Integer seats = Integer.valueOf(body.get("seats").toString());

            Double bookedPrice = null;
            if (body.get("bookedPrice") != null) {
                bookedPrice = Double.valueOf(body.get("bookedPrice").toString());
            } else if (amountPaise != null && seats != null && seats > 0) {
                bookedPrice = amountPaise / (100.0 * seats);
            }

            PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                    .rideId(rideId)
                    .userId(user.getId())
                    .amountPaise(amountPaise)
                    .seats(seats)
                    .razorpayOrderId(razorpayOrderId)
                    .razorpayPaymentId(razorpayPaymentId)
                    .razorpaySignature(razorpaySignature)
                    .signaturePreVerified(false)
                    .passengerPickup(body.get("passengerPickup") != null ? body.get("passengerPickup").toString() : null)
                    .passengerDrop(body.get("passengerDrop") != null ? body.get("passengerDrop").toString() : null)
                    .pickupLat(body.get("pickupLat") != null ? Double.valueOf(body.get("pickupLat").toString()) : null)
                    .pickupLng(body.get("pickupLng") != null ? Double.valueOf(body.get("pickupLng").toString()) : null)
                    .dropLat(body.get("dropLat") != null ? Double.valueOf(body.get("dropLat").toString()) : null)
                    .dropLng(body.get("dropLng") != null ? Double.valueOf(body.get("dropLng").toString()) : null)
                    .bookedPrice(bookedPrice)
                    .build();

            PaymentFinalizationResult result = paymentFinalizationService.finalizePaymentAndBooking(cmd, user);

            if (result.isSuccess()) {
                return ResponseEntity.ok(Map.of(
                        "message", result.getMessage() != null ? result.getMessage() : "Payment verified. Booking confirmed!",
                        "paymentId", result.getPaymentId() != null ? result.getPaymentId() : 0,
                        "bookingId", result.getBookingId() != null ? result.getBookingId() : 0,
                        "status", "SUCCESS",
                        "alreadyProcessed", result.isAlreadyProcessed()
                ));
            } else if (result.isRefundInitiated()) {
                return ResponseEntity.status(409).body(Map.of(
                        "message", result.getMessage(),
                        "paymentId", result.getPaymentId() != null ? result.getPaymentId() : 0,
                        "status", result.getStatus(),
                        "refundInitiated", true
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "FINALIZATION_FAILED",
                        "message", result.getMessage() != null ? result.getMessage() : "Payment finalization failed"
                ));
            }
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error during payment verification: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "INTERNAL_SERVER_ERROR", "message", "Payment verification encountered an internal error. Please contact support."));
        }
    }

    // STEP 3: Passenger confirms ride completed
    @PostMapping("/confirm-ride/{rideId}")
    public ResponseEntity<?> confirmRide(
            @PathVariable Long rideId,
            @AuthenticationPrincipal User user) {
        try {
            String result = razorpayPaymentService.confirmRideAndRelease(rideId, user);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error confirming ride {}: {}", rideId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "INTERNAL_SERVER_ERROR", "message", "Unable to confirm ride. Please try again."));
        }
    }
}