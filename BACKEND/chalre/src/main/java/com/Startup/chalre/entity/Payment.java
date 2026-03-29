package com.Startup.chalre.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "ride_id")
    private Ride ride;

    private Long amount;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    private String paymentMethod;

    @Column(unique = true)
    private String razorpayOrderId;

    @Column(unique = true)
    private String razorpayPaymentId;

    private String razorpaySignature;

    private LocalDateTime createdAt;

    private LocalDateTime releasedAt;

    // Track if admin has paid the driver manually
    private Boolean driverPaid = false;

    private LocalDateTime driverPaidAt;

    // Admin note when marking paid (e.g. UPI ref number)
    @Column(length = 200)
    private String driverPayoutNote;

    public enum PaymentStatus {
        PENDING,
        SUCCESS,
        FAILED,
        REFUNDED
    }
}