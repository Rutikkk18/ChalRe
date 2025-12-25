package com.Startup.chalre.service;

import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.PaymentRepository;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    
    /**
     * Initiate payment for a ride booking
     * Creates a payment record with PENDING status
     */
    @Transactional
    public Payment initiatePayment(Long userId, Long rideId, Long amountPaise, String paymentMethod) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Payment payment = new Payment();
        payment.setUser(user); // User making the payment (passenger)
        payment.setRide(ride);
        payment.setAmount(amountPaise);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setPaymentMethod(paymentMethod != null ? paymentMethod : "UPI");
        payment.setCreatedAt(LocalDateTime.now());
        
        Payment saved = paymentRepository.save(payment);
        
        // 🔔 Notification: Payment Initiated
        notificationService.sendNotification(
                user,
                "Payment Initiated",
                "Payment of ₹" + (amountPaise / 100.0) + " initiated for ride booking.",
                "PAYMENT_INITIATED",
                java.util.Map.of(
                        "paymentId", saved.getId().toString(),
                        "rideId", rideId.toString()
                )
        );
        
        return saved;
    }
    
    /**
     * Confirm payment success
     * Updates payment status to SUCCESS
     */
    @Transactional
    public Payment confirmPayment(Long paymentId, Long userId) {
        Payment payment = paymentRepository.findByIdAndUser_Id(paymentId, userId)
                .orElseThrow(() -> new RuntimeException("Payment not found or unauthorized"));
        
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new RuntimeException("Payment is not in PENDING status");
        }
        
        payment.setStatus(Payment.PaymentStatus.SUCCESS);
        paymentRepository.save(payment);
        
        // 🔔 Notification: Payment Success
        notificationService.sendNotification(
                payment.getUser(),
                "Payment Successful",
                "Payment of ₹" + (payment.getAmount() / 100.0) + " completed successfully.",
                "PAYMENT_SUCCESS",
                java.util.Map.of(
                        "paymentId", payment.getId().toString(),
                        "rideId", payment.getRide().getId().toString()
                )
        );
        
        return payment;
    }
    
    /**
     * Mark payment as failed
     */
    @Transactional
    public Payment failPayment(Long paymentId, Long userId) {
        Payment payment = paymentRepository.findByIdAndUser_Id(paymentId, userId)
                .orElseThrow(() -> new RuntimeException("Payment not found or unauthorized"));
        
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new RuntimeException("Payment is not in PENDING status");
        }
        
        payment.setStatus(Payment.PaymentStatus.FAILED);
        paymentRepository.save(payment);
        
        // 🔔 Notification: Payment Failed
        notificationService.sendNotification(
                payment.getUser(),
                "Payment Failed",
                "Payment of ₹" + (payment.getAmount() / 100.0) + " failed.",
                "PAYMENT_FAILED",
                java.util.Map.of(
                        "paymentId", payment.getId().toString(),
                        "rideId", payment.getRide().getId().toString()
                )
        );
        
        return payment;
    }
    
    /**
     * Get payment by ID
     */
    public Payment getPayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
    }
    
    /**
     * Check if payment is successful
     */
    public boolean isPaymentSuccessful(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
        return payment.getStatus() == Payment.PaymentStatus.SUCCESS;
    }
}
