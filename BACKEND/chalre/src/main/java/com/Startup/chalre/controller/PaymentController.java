package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.entity.Booking;
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

            if (body.get("passengerPickup") != null) dto.setPassengerPickup(body.get("passengerPickup").toString());
            if (body.get("passengerDrop") != null) dto.setPassengerDrop(body.get("passengerDrop").toString());
            if (body.get("pickupLat") != null) dto.setPickupLat(Double.valueOf(body.get("pickupLat").toString()));
            if (body.get("pickupLng") != null) dto.setPickupLng(Double.valueOf(body.get("pickupLng").toString()));
            if (body.get("dropLat") != null) dto.setDropLat(Double.valueOf(body.get("dropLat").toString()));
            if (body.get("dropLng") != null) dto.setDropLng(Double.valueOf(body.get("dropLng").toString()));
            // Derive bookedPrice from the verified payment amount (per-seat price in rupees)
            dto.setBookedPrice(amountPaise / (100.0 * seats));
            Booking savedBooking = bookingService.bookRide(dto, user);

            return ResponseEntity.ok(Map.of(
                    "message",   "Payment verified. Booking confirmed!",
                    "paymentId", payment.getId(),
                    "bookingId", savedBooking.getId(),
                    "status",    "SUCCESS"
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
