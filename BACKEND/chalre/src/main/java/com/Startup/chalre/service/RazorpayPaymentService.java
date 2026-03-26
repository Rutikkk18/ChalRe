package com.Startup.chalre.service;

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
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
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

    // STEP 1: Create order (no money charged yet)
    public Map<String, Object> createOrder(Long userId, Long rideId, Long amountPaise) {
        try {
            rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));
            userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (amountPaise == null || amountPaise <= 0) {
                throw new RuntimeException("Invalid amount: " + amountPaise);
            }

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "ride_" + rideId + "_" + userId);
            orderRequest.put("notes", new JSONObject()
                    .put("rideId", rideId.toString())
                    .put("userId", userId.toString()));

            logger.info("Creating order - Amount: {} paise, RideId: {}", amountPaise, rideId);
            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String orderId = razorpayOrder.get("id").toString();
            logger.info("Order created - OrderId: {}", orderId);

            Map<String, Object> result = new HashMap<>();
            result.put("orderId", orderId);
            result.put("amount", amountPaise);
            result.put("currency", "INR");
            result.put("rideId", rideId);
            result.put("userId", userId);
            return result;

        } catch (RazorpayException e) {
            logger.error("Razorpay error: {}", e.getMessage());
            throw new RuntimeException("Failed to create order: " + e.getMessage());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error creating order: " + e.getMessage(), e);
        }
    }

    // STEP 2: Verify payment after Razorpay popup success
    @Transactional
    public Payment verifyAndCreatePayment(Long userId, Long rideId, Long amountPaise,
                                          String razorpayOrderId, String razorpayPaymentId,
                                          String razorpaySignature) {
        try {
            boolean valid = verifyPaymentSignature(
                    razorpayOrderId, razorpayPaymentId, razorpaySignature);
            if (!valid) {
                throw new RuntimeException(
                        "Payment signature invalid. Contact support if amount was deducted.");
            }

            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Payment payment = new Payment();
            payment.setUser(user);
            payment.setRide(ride);
            payment.setAmount(amountPaise);
            payment.setStatus(Payment.PaymentStatus.SUCCESS);
            payment.setPaymentMethod("ONLINE");
            payment.setRazorpayOrderId(razorpayOrderId);
            payment.setRazorpayPaymentId(razorpayPaymentId);
            payment.setRazorpaySignature(razorpaySignature);
            payment.setCreatedAt(LocalDateTime.now());

            Payment saved = paymentRepository.save(payment);
            logger.info("Payment saved - Id: {}", saved.getId());

            notificationService.sendNotification(
                    user,
                    "Payment Successful",
                    "Payment of ₹" + (amountPaise / 100.0) + " confirmed!",
                    "PAYMENT_SUCCESS",
                    Map.of(
                            "paymentId", saved.getId().toString(),
                            "rideId", rideId.toString()
                    )
            );

            return saved;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error verifying payment: " + e.getMessage(), e);
        }
    }

    // STEP 3: Passenger confirms ride done → release to driver
    @Transactional
    public String confirmRideAndRelease(Long rideId, User passenger) {
        // Use latest successful payment — handles duplicate test payments gracefully
        Payment payment = paymentRepository.findLatestSuccessfulPaymentByRideId(rideId)
                .orElseThrow(() -> new RuntimeException("Payment not found for this ride"));

        if (payment.getReleasedAt() != null) {
            return "Payment already released to driver";
        }

        payment.setReleasedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        notificationService.sendNotification(
                payment.getRide().getDriver(),
                "Payment Released",
                "₹" + (payment.getAmount() / 100.0) + " released for your ride.",
                "PAYMENT_RELEASED",
                Map.of("rideId", payment.getRide().getId().toString())
        );

        logger.info("Payment released - PaymentId: {}", payment.getId());
        return "Ride confirmed. Payment released to driver.";
    }

    private boolean verifyPaymentSignature(String razorpayOrderId,
                                           String razorpayPaymentId,
                                           String razorpaySignature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", razorpayOrderId);
            options.put("razorpay_payment_id", razorpayPaymentId);
            options.put("razorpay_signature", razorpaySignature);
            return Utils.verifyPaymentSignature(options, razorpaySecret);
        } catch (Exception e) {
            logger.error("Signature verification error", e);
            return false;
        }
    }

    public Payment getPaymentByOrderId(String orderId) {
        return paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Payment not found: " + orderId));
    }
}