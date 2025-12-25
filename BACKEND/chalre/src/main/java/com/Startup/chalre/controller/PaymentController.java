package com.Startup.chalre.controller;

import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.PaymentService;
import com.Startup.chalre.service.RazorpayPaymentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    
    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);
    
    private final PaymentService paymentService;
    private final RazorpayPaymentService razorpayPaymentService;
    private final String razorpayKey;
    
    public PaymentController(
            PaymentService paymentService,
            RazorpayPaymentService razorpayPaymentService,
            @Qualifier("razorpayKey") String razorpayKey) {
        this.paymentService = paymentService;
        this.razorpayPaymentService = razorpayPaymentService;
        this.razorpayKey = razorpayKey;
        
        // Log key type for debugging (first few chars only)
        String keyType = razorpayKey.startsWith("rzp_test_") ? "TEST" : 
                        razorpayKey.startsWith("rzp_live_") ? "LIVE" : "UNKNOWN";
        logger.info("PaymentController initialized with {} key: {}...", 
            keyType, 
            razorpayKey.length() > 15 ? razorpayKey.substring(0, 15) : razorpayKey
        );
    }
    
    /**
     * Create Razorpay order for payment
     * POST /api/payments/order
     * Body: { rideId, amountPaise }
     * Returns: { orderId, amount, key, paymentId }
     */
    @PostMapping("/order")
    public ResponseEntity<?> createOrder(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        
        // Validate required fields
        if (request == null) {
            return ResponseEntity.badRequest().body("Request body is required");
        }
        
        if (request.get("rideId") == null) {
            return ResponseEntity.badRequest().body("rideId is required");
        }
        
        if (request.get("amountPaise") == null) {
            return ResponseEntity.badRequest().body("amountPaise is required");
        }
        
        try {
            // Parse and validate rideId
            Long rideId;
            try {
                rideId = Long.valueOf(request.get("rideId").toString());
                if (rideId <= 0) {
                    return ResponseEntity.badRequest().body("rideId must be a positive number");
                }
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body("Invalid rideId format");
            }
            
            // Parse and validate amountPaise
            Long amountPaise;
            try {
                amountPaise = Long.valueOf(request.get("amountPaise").toString());
                if (amountPaise <= 0) {
                    return ResponseEntity.badRequest().body("amountPaise must be a positive number");
                }
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body("Invalid amountPaise format");
            }
            
            // REFACTORED: Create Razorpay order ONLY (no payment record yet)
            Map<String, Object> orderDetails = razorpayPaymentService.createOrder(user.getId(), rideId, amountPaise);
            
            // Validate order was created successfully
            String orderId = (String) orderDetails.get("orderId");
            if (orderId == null || orderId.isEmpty()) {
                return ResponseEntity.status(500).body("Failed to create Razorpay order: Order ID is null");
            }
            
            // Log for debugging (key prefix only for security)
            logger.info("Razorpay order created - OrderId: {}, Amount: {} paise, Key: {}...", 
                orderId, 
                orderDetails.get("amount"),
                razorpayKey.length() > 15 ? razorpayKey.substring(0, 15) + "..." : razorpayKey
            );
            
            // REFACTORED: Return order details WITHOUT paymentId (payment not created yet)
            Map<String, Object> response = new HashMap<>();
            response.put("orderId", orderId);
            response.put("amount", orderDetails.get("amount")); // Amount in paise
            response.put("key", razorpayKey); // Key ID (not secret!)
            response.put("currency", orderDetails.get("currency")); // Currency (INR)
            // NOTE: No paymentId returned - payment record will be created after verification
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error creating order: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Internal server error: " + e.getMessage());
        }
    }
    
    /**
     * REFACTORED: Verify Razorpay payment and create payment record
     * POST /api/payments/verify
     * Body: { rideId, amountPaise, razorpayOrderId, razorpayPaymentId, razorpaySignature }
     * 
     * Flow:
     * 1. Verify signature FIRST (using Razorpay Utils)
     * 2. Only if signature is valid, create Payment record with SUCCESS status
     * 3. Return created Payment entity
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        
        // Validate required fields
        if (request == null) {
            return ResponseEntity.badRequest().body("Request body is required");
        }
        
        if (request.get("rideId") == null) {
            return ResponseEntity.badRequest().body("rideId is required");
        }
        
        if (request.get("amountPaise") == null) {
            return ResponseEntity.badRequest().body("amountPaise is required");
        }
        
        if (request.get("razorpayOrderId") == null) {
            return ResponseEntity.badRequest().body("razorpayOrderId is required");
        }
        
        if (request.get("razorpayPaymentId") == null) {
            return ResponseEntity.badRequest().body("razorpayPaymentId is required");
        }
        
        if (request.get("razorpaySignature") == null) {
            return ResponseEntity.badRequest().body("razorpaySignature is required");
        }
        
        try {
            // Parse request parameters
            Long rideId = Long.valueOf(request.get("rideId").toString());
            Long amountPaise = Long.valueOf(request.get("amountPaise").toString());
            String razorpayOrderId = request.get("razorpayOrderId").toString();
            String razorpayPaymentId = request.get("razorpayPaymentId").toString();
            String razorpaySignature = request.get("razorpaySignature").toString();
            
            logger.info("Verifying payment - OrderId: {}, PaymentId: {}, UserId: {}, RideId: {}", 
                razorpayOrderId, razorpayPaymentId, user.getId(), rideId);
            
            // REFACTORED: Verify signature FIRST, then create payment record
            Payment payment = razorpayPaymentService.verifyAndCreatePayment(
                    user.getId(),
                    rideId,
                    amountPaise,
                    razorpayOrderId,
                    razorpayPaymentId,
                    razorpaySignature
            );
            
            logger.info("✅ Payment verified and created successfully - PaymentId: {}", payment.getId());
            
            return ResponseEntity.ok(payment);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Invalid format: " + e.getMessage());
        } catch (RuntimeException e) {
            logger.error("Payment verification failed", e);
            return ResponseEntity.badRequest().body("Error verifying payment: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Internal error during payment verification", e);
            return ResponseEntity.status(500).body("Internal server error: " + e.getMessage());
        }
    }
    
    /**
     * Confirm payment success
     * POST /api/payments/{paymentId}/confirm
     */
    @PostMapping("/{paymentId}/confirm")
    public ResponseEntity<?> confirmPayment(
            @PathVariable Long paymentId,
            @AuthenticationPrincipal User user) {
        
        try {
            Payment payment = paymentService.confirmPayment(paymentId, user.getId());
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error confirming payment: " + e.getMessage());
        }
    }
    
    /**
     * Mark payment as failed
     * POST /api/payments/{paymentId}/fail
     */
    @PostMapping("/{paymentId}/fail")
    public ResponseEntity<?> failPayment(
            @PathVariable Long paymentId,
            @AuthenticationPrincipal User user) {
        
        try {
            Payment payment = paymentService.failPayment(paymentId, user.getId());
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error failing payment: " + e.getMessage());
        }
    }
    
    /**
     * Get payment details
     * GET /api/payments/{paymentId}
     */
    @GetMapping("/{paymentId}")
    public ResponseEntity<?> getPayment(
            @PathVariable Long paymentId,
            @AuthenticationPrincipal User user) {
        
        try {
            Payment payment = paymentService.getPayment(paymentId);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching payment: " + e.getMessage());
        }
    }
}
