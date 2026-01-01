/*package com.Startup.chalre.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.PaymentRepository;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class RazorpayPaymentService {
    
    private static final Logger logger = LoggerFactory.getLogger(RazorpayPaymentService.class);
    
    private final RazorpayClient razorpayClient;
    private final String razorpaySecret;
    private final PaymentRepository paymentRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    
    public RazorpayPaymentService(
            RazorpayClient razorpayClient,
            @Qualifier("razorpaySecret") String razorpaySecret,
            PaymentRepository paymentRepository,
            RideRepository rideRepository,
            UserRepository userRepository,
            NotificationService notificationService) {
        this.razorpayClient = razorpayClient;
        this.razorpaySecret = razorpaySecret;
        this.paymentRepository = paymentRepository;
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }
    

    public Map<String, Object> createOrder(Long userId, Long rideId, Long amountPaise) {
        try {
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));
            
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Validate amount
            if (amountPaise == null || amountPaise <= 0) {
                throw new RuntimeException("Invalid amount: " + amountPaise + ". Amount must be positive and in paise.");
            }
            
            // Create Razorpay order
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise); // Amount in paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "ride_" + rideId + "_" + userId);
            orderRequest.put("notes", new JSONObject()
                    .put("rideId", rideId.toString())
                    .put("userId", userId.toString())
            );
            
            logger.info("Creating Razorpay order - Amount: {} paise (₹{}), RideId: {}, UserId: {}", 
                amountPaise, amountPaise / 100.0, rideId, userId);
            
            Order razorpayOrder;
            try {
                razorpayOrder = razorpayClient.orders.create(orderRequest);
            } catch (RazorpayException e) {
                // Log detailed error for debugging
                String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown Razorpay error";
                logger.error("Razorpay API Error: {}", errorMessage);
                logger.error("Exception class: {}", e.getClass().getName());
                
                // Check error message for authentication issues
                String userMessage;
                if (errorMessage.contains("Authentication failed") || 
                    errorMessage.contains("BAD_REQUEST") ||
                    errorMessage.contains("401") ||
                    errorMessage.contains("authentication") ||
                    errorMessage.contains("Unauthorized")) {
                    userMessage = "Razorpay authentication failed. " +
                        "Please verify your RAZORPAY_KEY and RAZORPAY_SECRET are correct. " +
                        "Make sure you're using the correct key-secret pair (test keys with test secrets, live keys with live secrets). " +
                        "Error: " + errorMessage;
                } else {
                    userMessage = "Failed to create Razorpay order: " + errorMessage;
                }
                
                throw new RuntimeException(userMessage);
            } catch (Exception e) {
                logger.error("Unexpected error creating Razorpay order", e);
                throw new RuntimeException("Unexpected error creating Razorpay order: " + e.getMessage(), e);
            }
            
            // Extract order ID and validate
            String orderId = razorpayOrder.get("id").toString();
            if (orderId == null || orderId.isEmpty()) {
                throw new RuntimeException("Razorpay order created but order ID is null or empty");
            }
            
            // Validate order amount matches
            Long orderAmount = Long.valueOf(razorpayOrder.get("amount").toString());
            if (!orderAmount.equals(amountPaise)) {
                logger.warn("Order amount mismatch - Expected: {} paise, Got: {} paise", amountPaise, orderAmount);
            }
            
            // Log order creation for debugging
            logger.info("✅ Razorpay order created successfully - OrderId: {}, Amount: {} paise (₹{}), Currency: INR", 
                orderId, amountPaise, amountPaise / 100.0);
            
            // REFACTORED: Do NOT create Payment record here
            // Payment record will be created ONLY after successful payment verification
            // Return order details only (no paymentId)
            Map<String, Object> orderDetails = new java.util.HashMap<>();
            orderDetails.put("orderId", orderId);
            orderDetails.put("amount", amountPaise);
            orderDetails.put("currency", "INR");
            orderDetails.put("rideId", rideId);
            orderDetails.put("userId", userId);
            
            return orderDetails;
        } catch (RuntimeException e) {
            // Re-throw RuntimeException as-is (already has user-friendly message from inner catch)
            throw e;
        } catch (Exception e) {
            // Catch any other unexpected exceptions
            throw new RuntimeException("Error creating payment order: " + e.getMessage(), e);
        }
    }
    

    @Transactional
    public Payment verifyAndCreatePayment(Long userId, Long rideId, Long amountPaise,
                                          String razorpayOrderId, String razorpayPaymentId, 
                                          String razorpaySignature) {
        try {
            logger.info("Verifying payment - OrderId: {}, PaymentId: {}, UserId: {}, RideId: {}", 
                razorpayOrderId, razorpayPaymentId, userId, rideId);
            
            // Step 1: Verify signature FIRST (before creating any database record)
            boolean signatureValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
            
            if (!signatureValid) {
                logger.error("Payment signature verification FAILED - OrderId: {}, PaymentId: {}", 
                    razorpayOrderId, razorpayPaymentId);
                throw new RuntimeException("Payment failed due to invalid signature. Please contact support if amount was deducted.");
            }
            
            logger.info("✅ Payment signature verified successfully");
            
            // Step 2: Only after successful verification, fetch ride and user
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));
            
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Step 3: Validate amount matches (additional security check)
            if (!amountPaise.equals(ride.getPrice() * 100)) {
                logger.warn("Amount mismatch - Expected: {} paise, Got: {} paise", 
                    ride.getPrice() * 100, amountPaise);
                // Note: We still proceed if signature is valid, but log warning
            }
            
            // Step 4: Create Payment record ONLY after successful verification
            Payment payment = new Payment();
            payment.setUser(user);
            payment.setRide(ride);
            payment.setAmount(amountPaise);
            payment.setStatus(Payment.PaymentStatus.SUCCESS); // Directly set to SUCCESS (already verified)
            payment.setPaymentMethod("UPI");
            payment.setRazorpayOrderId(razorpayOrderId);
            payment.setRazorpayPaymentId(razorpayPaymentId);
            payment.setRazorpaySignature(razorpaySignature);
            payment.setCreatedAt(LocalDateTime.now());
            
            Payment saved = paymentRepository.save(payment);
            
            logger.info("✅ Payment record created successfully - PaymentId: {}, OrderId: {}, Amount: {} paise", 
                saved.getId(), razorpayOrderId, amountPaise);
            
            // 🔔 Notification: Payment Success
            notificationService.sendNotification(
                    user,
                    "Payment Successful",
                    "Payment of ₹" + (amountPaise / 100.0) + " completed successfully.",
                    "PAYMENT_SUCCESS",
                    java.util.Map.of(
                            "paymentId", saved.getId().toString(),
                            "rideId", rideId.toString(),
                            "orderId", razorpayOrderId
                    )
            );
            
            return saved;
        } catch (RuntimeException e) {
            // Re-throw RuntimeException as-is
            throw e;
        } catch (Exception e) {
            logger.error("Error verifying and creating payment", e);
            throw new RuntimeException("Error verifying payment: " + e.getMessage(), e);
        }
    }
    
   e
    private boolean verifyPaymentSignature(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        try {
            // Use Razorpay Utils.verifyPaymentSignature for official verification
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", razorpayOrderId);
            options.put("razorpay_payment_id", razorpayPaymentId);
            options.put("razorpay_signature", razorpaySignature);
            
            logger.debug("Verifying payment signature - OrderId: {}, PaymentId: {}, Signature: {}...", 
                razorpayOrderId, razorpayPaymentId,
                razorpaySignature != null && razorpaySignature.length() > 20 ? razorpaySignature.substring(0, 20) + "..." : razorpaySignature);
            
            boolean isValid = Utils.verifyPaymentSignature(options, razorpaySecret);
            
            if (!isValid) {
                logger.error("Payment signature verification FAILED - OrderId: {}, PaymentId: {}", 
                    razorpayOrderId, razorpayPaymentId);
            } else {
                logger.info("Payment signature verification SUCCESS - OrderId: {}, PaymentId: {}", 
                    razorpayOrderId, razorpayPaymentId);
            }
            
            return isValid;
        } catch (Exception e) {
            logger.error("Error verifying payment signature", e);
            return false; // Return false on any error
        }
    }
    

    public Payment getPaymentByOrderId(String orderId) {
        return paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Payment not found for order ID: " + orderId));
    }
}
*/
