package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.BookingService;
import com.Startup.chalre.service.RazorpayPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final RazorpayPaymentService razorpayPaymentService;
    private final BookingService bookingService;
    private final String razorpayKey;

    public PaymentController(
            RazorpayPaymentService razorpayPaymentService,
            BookingService bookingService,
            @Qualifier("razorpayKey") String razorpayKey) {
        this.razorpayPaymentService = razorpayPaymentService;
        this.bookingService = bookingService;
        this.razorpayKey = razorpayKey;
    }

    // Frontend gets key to init Razorpay popup
    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        return ResponseEntity.ok(Map.of("key", razorpayKey));
    }

    // STEP 1: Create Razorpay order
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        try {
            Long rideId = Long.valueOf(body.get("rideId").toString());
            Long amountPaise = Long.valueOf(body.get("amount").toString());
            Map<String, Object> order = razorpayPaymentService.createOrder(
                    user.getId(), rideId, amountPaise);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // STEP 2: Verify payment + auto create booking
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

            // Verify and save payment
            Payment payment = razorpayPaymentService.verifyAndCreatePayment(
                    user.getId(), rideId, amountPaise,
                    razorpayOrderId, razorpayPaymentId, razorpaySignature);

            // Auto-create booking
            BookingDTO dto = new BookingDTO();
            dto.setRideId(rideId);
            dto.setSeats(seats);
            dto.setPaymentMethod("ONLINE");
            dto.setTxnId(razorpayPaymentId);
            bookingService.bookRide(dto, user);

            return ResponseEntity.ok(Map.of(
                    "message", "Payment verified. Booking confirmed!",
                    "paymentId", payment.getId(),
                    "status", "SUCCESS"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
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
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
