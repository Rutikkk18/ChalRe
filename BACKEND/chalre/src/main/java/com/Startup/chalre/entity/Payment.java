package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Payment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    private User user;
    
    @ManyToOne
    private Ride ride;
    
    private Long amount; // in paise (INR * 100)
    
    @Enumerated(EnumType.STRING)
    private PaymentStatus status; // PENDING, SUCCESS, FAILED
    
    private String paymentMethod; // UPI, CARD, NETBANKING, etc.
    
    private String razorpayOrderId; // Razorpay order ID
    
    private String razorpayPaymentId; // Razorpay payment ID
    
    private String razorpaySignature; // Razorpay signature for verification
    
    private LocalDateTime createdAt;
    
    public enum PaymentStatus {
        PENDING,
        SUCCESS,
        FAILED
    }
}

