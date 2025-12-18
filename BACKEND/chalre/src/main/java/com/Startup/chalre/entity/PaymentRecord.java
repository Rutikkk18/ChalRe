package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    private Long amount; // paise
    private String currency; // "INR"
    private String provider; // "SIM" / "RAZORPAY"
    private String providerPaymentId;
    private String providerOrderId;   // razorpay order id (order["id"])
    private String status; // CREATED / SUCCESS / FAILED

    private String idempotencyKey;

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;


}
